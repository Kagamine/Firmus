'use strict'
var express = require('express');
var router = express.Router();

let dayreport = null;
let refreshTime = null;

router.use(function (req, res, next) {
    res.locals.order = true;
    next();
});

// 订单列表
router.get('/', auth.checkRole('order', 'query'), function (req, res, next) {
    let query = db.orders.find();
    let orders;
    if (req.query.number)
        query = query.where({ number: req.query.number });
    if (req.query.city){
        db.addresses.find()
            .where({ 'city': req.query.city })
            .select("_id")
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }
    if (req.query.district){
        db.addresses.find()
            .where({ 'district': req.query.district })
            .select("_id")
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }
    if (req.query.department){
        db.departments.find()
            .where({ 'title': new RegExp('.*' + req.query.department + '.*') })
            .select("_id")
            .exec()
            .then(function (data) {
                db.addresses.find()
                    .where({ 'milkStation': { $in: data } })
                    .select("_id")
                    .exec()
                    .then(function (_data) {
                        query = query.where({ 'address':{ $in: _data } });
                    })
            })
    }
    if (req.query.address) {
        db.addresses.find()
            .where({ 'address': new RegExp('.*' + req.query.address + '.*') })
            .select("_id")
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }
    if (req.query.begin)
        query = query.where('begin').gte(Date.parse(req.query.begin));
    if (req.query.end)
        query = query.where('end').lte(Date.parse(req.query.end));
    if (req.query.user){
        db.users.find()
            .where({ 'username': new RegExp('.*' + req.query.user + '.*') })
            .select('_id')
            .exec()
            .then(function (data) {
                query = query.where({ 'user':{ $in: data } });
            })
    }
    if(req.query.username){
        db.addresses.find()
            .where({ 'name':   req.query.username })
            .select("_id")
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }
    if (req.query.phone) {
        db.addresses.find()
            .where({ 'phone': new RegExp('.*' + req.query.phone + '.*') })
            .select("_id")
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }
    if(req.query.orderType)
        query=query.where({'orderType':req.query.orderType});
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.query.p == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 50 - 1) / 50);
            var start = res.locals.start = (page - 50) < 1 ? 1 : (page - 50);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('address milkStation user')
                .deepPopulate('address.milkStation')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (_orders) {
            orders = _orders;
            for(let i= 0;i<orders.length;i++){
                for(let j=0;j<orders[i].orders.length;j++){
                    let leftCount = getLeftCount(orders[i].orders[j],orders[i].changes,new Date());
                    orders[i].orders[j].leftCount=leftCount;
                }
            }
            res.locals.orders = orders;
            return db.addresses
                .aggregate()
                .group({
                    _id: '$city'
                })
                .exec()
        })
        .then(function (cities) {
            res.locals.cities = cities.map(x => x._id);
            res.render('order/index', { title: '订单管理' });
        })
        .then(null, next);
});

// 创建订单
router.get('/create', auth.checkRole('order', 'modify'), function (req, res, next) {
    res.render('order/orderCreate', { title: '添加订单' });
});

// 创建订单
router.post('/create', auth.checkRole('order', 'modify'), function (req, res, next) {
    let order = new db.orders();
    let user  = req.session.user;
    if(user.role == '热线员'){
        order.customCall =  req.session.uid;
        order.customServiceFlag = false;
    }
    order.time = Date.now();
    order.address = req.body.address;
    order.number = req.body.number;
    order.payMethod = req.body.payMethod;
    order.pos = req.body.pos =='pos'?'': req.body.pos;
    order.price = req.body.price;
    order.orderType = 'undefine';

    db.addresses.findById(req.body.address)
    .exec()
    .then(function (address) {
            if(address.deposit==null){
                let deposit = new db.deposits();
                deposit.number = req.body.deposit;
                deposit.address= req.body.address;
                deposit.giveBackFlag=false;
                deposit.giveBackDone=false;
                deposit.giveBackTime='';

                deposit.boxedFlag=false;
                deposit.boxedTime='';
                deposit.boxedDone=false;
                deposit.time=Date.now();
                deposit.save(function (err, deposit) {
                    db.addresses.update({_id: req.body.address}, {
                        deposit: deposit._id
                    })
                        .exec();
                })
            }
        });
    // TODO: 计算最后一天送奶日期（需要考虑周末停送时中间有一个周六周日）
    // order.end = ;
    order.hint = req.body.hint;
    if(typeof(req.body.milkType)!='string'){
        for(var i =0;i<req.body.milkType.length;i++){
            order.orders.push({
                milkType: req.body.milkType[i],
                count:parseInt(req.body.count[i]) + parseInt(req.body.presentCount[i]),
                distributeCount:req.body.distributeCount[i],
                distributeMethod:req.body.distributeMethod[i],
                single:req.body.single[i],
                time:Date.now(),
                begin:req.body.begin[i]
            });
            if(req.body.presentCount[i]>0){
                order.logs.push({
                    user: req.session.uid,
                    content:'赠送'+ req.body.milkType[i]+'品相'+req.body.presentCount[i]+'瓶'
                })
            }
        }
    }else{
        order.orders.push({
            milkType: req.body.milkType,
            count:parseInt(req.body.count) + parseInt(req.body.presentCount),
            distributeCount:req.body.distributeCount,
            distributeMethod:req.body.distributeMethod,
            single:req.body.single,
            time:Date.now(),
            begin:req.body.begin
        });
        if(req.body.presentCount>0){
            order.logs.push({
                user: req.session.uid,
                content:'赠送'+ req.body.milkType[i]+'品相'+req.body.presentCount[i]+'瓶'
            })
        }
    }
    for (let i = 0; i < order.orders.length; i++)
        order.orders[i].end = getEndDistributeDate(order.orders[i], order.changes);
    let ObjectID = db.mongoose.mongo.BSONPure.ObjectID;
    db.orders.find({
                'address':ObjectID(req.body.address)
            })
                .exec()
             .then(function (orders) {
                    if(orders.length == 0){
                        if(user.role=="热线员"){
                            order.orderType =  'A02';
                        }
                        else{
                            order.orderType= 'B01';
                        }
                    }
                    else{
                        var flag = false;  //是否有结束的订单
                        var empty = true;  //是否全部的订单都结束
                        var days = 0;
                        var isTodayHave = false; 　//是否今天下单
                        for(var i=0;i<orders.length;i++){
                            var  now = new Date();
                            var date =   getEndDistributeDate(order.orders[i], order.changes);
                            var orderTime  = orders[i].orders[0].time;
                            if(orderTime.getDate() == now.getDate() ){
                                isTodayHave = true;
                            }
                            if(date<now){
                                if(days>parseInt(Math.abs(now - date) / 1000 / 60 / 60 / 24)){
                                    days = parseInt(Math.abs(now - date) / 1000 / 60 / 60 / 24);
                                }
                                flag = true;
                            }
                            else if(date > now){
                                empty = false;
                            }
                        }
                        if(isTodayHave==true){
                            if(user.role=="热线员"){
                                order.orderType =  'A04';
                            }
                            else{
                                order.orderType =  'B03';
                            }
                        }
                        if((flag==false) || ((flag==true) && (empty==false))){
                            if(user.role=="热线员"){
                                order.orderType =  'A04';
                            }
                            else{
                                order.orderType =  'B04';
                            }
                        }
                        if(empty==true){
                            if(parseInt(days)<10){
                                if(user.role=="热线员"){
                                    order.orderType =  'A03';
                                }
                                else{
                                    order.orderType =  'B05';
                                }
                            }
                            else{
                                if(user.role=="热线员"){
                                    order.orderType =  'A03';
                                }
                                else{
                                    order.orderType =  'B02';
                                }
                            }
                        }
                    }
        })
             .then(function (data) {
               order.save(function (err, order) {
                   if(user.role != '热线员'){
                       console.log(req.body.serverNumber);
                       db.users.findOne({'jobNumber':req.body.serverNumber})
                           .exec()
                           .then(function (xxxuser) {
                               console.log(xxxuser);
                               order.user = xxxuser._id;
                               order.save();
                           })
                   }
                   res.redirect('/order/show/' + order._id);
               });
      })
});

// 续单统计
router.get('/renew', auth.checkRole('order', 'query'), function (req, res, next) {
    let time = new Date();
    time.setDate(time.getDate() + 8);
    db.orders.find({
        'orders.end': {
            $lte: time,
            $gte: new Date()
    } })
        .populate('address')
        .exec()
        .then(function (orders) {
            let ret = [];
            orders.forEach(x => {
                x.orders.forEach(y => {
                    if (y.end >= new Date() && y.end <= time)
                        ret.push({
                            name: x.address.name,
                            phone: x.address.phone,
                            milkType: y.milkType,
                            leftCount: getLeftCount(y, x.changes, new Date()),
                            end: y.end,
                            number: x.number,
                            address: x.address.city + x.address.district + x.address.address
                        });
                });
            });
            res.render('order/renew', { title: '续单提醒', report: ret });
        })
        .then(null, next);
});

// 查看订单详情
router.get('/show/:id', auth.checkRole('order', 'query'), function (req, res, next) {
    db.orders.findById(req.params.id)
        .populate('address')
        .populate('order user')
        .populate('logs.user')
        .exec()
        .then(function (order) {
            for(var i=0;i<order.orders.length;i++){
               var leftCount = getLeftCount(order.orders[i],order.changes,new Date());
               order.orders[i].leftCount= leftCount;
            }
            res.render('order/orderDetail', { title: '订单详情', order: order });
        })
        .then(null, next);
});

// 删除订单 by nele
router.post('/delete/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    db.orders.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null, next);
});

// 编辑订单
router.get('/edit/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    db.orders.findById(req.params.id)
        .populate('address')
        .deepPopulate('address.deposit')
        .exec()
        .then(function (order) {
            res.locals.order = order;
            res.locals.deposit = order.address.deposit;
            res.render('order/orderEdit', { title: '订单详情' });
        })
        .then(null, next);
});

// 编辑订单
router.post('/edit/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    let end = Date.now(); //TODO: 计算最后一天送奶日期
    let ObjectID = db.mongoose.mongo.BSONPure.ObjectID;
    let orders = [];
    var ordersTemp;
    var _order ;

    db.addresses.findById(req.body.address)
        .exec()
        .then(function (address) {
            if(address.deposit==null){
                let deposit = new db.deposits();
                deposit.number = req.body.deposit;
                deposit.address= req.body.address;
                deposit.giveBackFlag=false;
                deposit.giveBackDone=false;
                deposit.giveBackTime='';

                deposit.boxedFlag=false;
                deposit.boxedTime='';
                deposit.boxedDone=false;
                deposit.time=Date.now();
                deposit.save(function (err, deposit) {
                    db.addresses.update({_id: req.body.address}, {
                        deposit: deposit._id
                    })
                        .exec();
                })
            }
        });

    if(typeof(req.body.milkType)!='string'){
        for(var i =0;i<req.body.milkType.length;i++){
            orders.push({
                milkType: req.body.milkType[i],
                count:req.body.count[i],
                distributeCount:req.body.distributeCount[i],
                distributeMethod:req.body.distributeMethod[i],
                single:req.body.single[i],
                time:Date.now(),
                begin:req.body.begin[i]
            });
        }
    }else{
        orders.push({
            milkType: req.body.milkType,
            count:req.body.count,
            distributeCount:req.body.distributeCount,
            distributeMethod:req.body.distributeMethod,
            single:req.body.single,
            time:Date.now(),
            begin:req.body.begin
        });
    }
    db.orders.update({ _id: req.params.id }, {
        orderType: req.body.orderType,
        address: req.body.address,
        price:req.body.price,
        payMethod:req.body.payMethod,
        pos:req.body.pos,
        orders:orders
    })
        .exec()
        .then(function () {
                db.orders.findById(req.params.id)
                .exec()
                .then(function (order) {
                    _order=order;
                        db.orders.find()
                            .where({'parentId':ObjectID(req.params.id)})
                            .exec()
                            .then(function (orders) {
                                for(var i =0 ;i<orders.length;i++){
                                    ordersTemp = order.orders;
                                    for(var j =0;j<ordersTemp.length;j++){
                                        ordersTemp[i].begin.setDate(getEndDistributeDate(_order.orders[j],_order.changes).getDate()+1);
                                    }
                                    db.orders.update({ _id:orders[i]._id }, {
                                        orders:ordersTemp
                                    })
                                        .exec()
                                }
                            })
                })
            res.send('ok');
        })
        .then(null, next);
});

// 添加订单变更
router.get('/change/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    res.locals.orderId = req.params.id;
    db.orders.findById(req.params.id)
        .exec()
        .then(function (order) {
            for(var i=0;i<order.orders.length;i++){
                var leftCount = getLeftCount(order.orders[i],order.changes,order.orders[i].begin);
                order.orders[i].leftCount= leftCount;
            }
            res.render('order/orderChange', { title: '订单变更', order: order });
        })
        .then(null, next);

});

// 添加订单变更
router.post('/change/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    let  _order ;
    if(req.body.type=='品相变更'){
        var ordersTemp = [];
        var oid  =req.body.oid;
        db.orders.findById(req.params.id)
            .exec()
            .then(function (order) {
                _order = order;
                let tmp = order.orders.filter(x=>x._id==oid);
                tmp.milkType = req.body.omilkType;
                tmp.count  = req.body.ocount;
                tmp.begin = req.body.obegin;
                tmp.distributeMethod = req.body.distributeMethod;
                tmp.distributeCount = req.body.distributeCount;
                ordersTemp = order.orders;
                for(var i =0;i<ordersTemp.length;i++){
                     if(oid==ordersTemp[i]._id){
                          ordersTemp[i] = tmp;
                     }
                }
                db.orders.update({ _id: req.params.id }, {
                    orders:ordersTemp
                })
                    .exec()
                    .then(function () {
                           db.orders.findById(req.params.id)
                           .exec()
                           .then(function (order) {
                                   _order = order;
                                   db.addresses.update({_id:order.address},{
                                       $inc: { balance: req.body.balance }
                                   })
                                       .exec()
                                       .then(function () {
                                           db.orders.find()
                                               .where({'parentId': req.params.id})
                                               .exec()
                                               .then(function (orders) {
                                                   for(var i =0 ;i<orders.length;i++){
                                                       ordersTemp = order.orders;

                                                       for(var j =0;j<ordersTemp.length;j++){
                                                           ordersTemp[i].begin.setDate(getEndDistributeDate(_order.orders[j],_order.changes).getDate()+1);
                                                       }

                                                       db.orders.update({ _id:orders[i]._id }, {
                                                           orders:ordersTemp
                                                       })
                                                           .exec()
                                                   }
                                               })
                                           res.redirect('/order/show/' + req.params.id);
                                       });
                               })
                    })
            })
            .then(null, next);
    }
    else if(req.body.type=='退单'){
        db.orders.findById(req.params.id)
        .exec()
        .then(function (order) {
                _order = order;
                var temp = 0;
                if(typeof(req.body.cancelCount)!='string'){
                    for(var i =0;i<req.body.cancelCount.length;i++){
                        if(req.body.cancelCount[i]!=''){
                            order.orders[i].count = order.orders[i].count-req.body.cancelCount[i];
                            temp = temp+req.body.cancelCount[i] * order.orders[i].single;
                        }
                    }
                }else{
                    if(req.body.cancelCount!=''){
                        order.orders[0].count = order.orders[0].count-req.body.cancelCount;
                        temp = temp+req.body.cancelCount* order.orders[0].single;
                    }
                }
                db.orders.update({ _id: req.params.id }, {
                    orders:order.orders
                })
                .exec()
                .then(function () {
                        db.addresses.update({_id:order.address},{
                            $inc: { balance: temp }
                        })
                            .exec()
                            .then(function () {
                                db.orders.find()
                                    .where({'parentId': req.params.id})
                                    .exec()
                                    .then(function (orders) {
                                        for(var i =0 ;i<orders.length;i++){
                                            ordersTemp = order.orders;

                                            for(var j =0;j<ordersTemp.length;j++){
                                                ordersTemp[i].begin.setDate(getEndDistributeDate(_order.orders[j],_order.changes).getDate()+1);
                                            }

                                            db.orders.update({ _id:orders[i]._id }, {
                                                orders:ordersTemp
                                            })
                                                .exec()
                                        }
                                    })
                                res.redirect('/order/show/' + req.params.id);
                            });
                    });
            })
        .then(null,next);

    }
    else if(req.body.type=='顺延'){
        db.orders.findById(req.params.id)
            .exec()
            .then(function (order) {
                _order = order;
                ordersTemp = order.orders;
                for(var i =0;i<ordersTemp.length;i++){
                    if(req.body.lsLengthenOreders==ordersTemp[i]._id){
                        ordersTemp[i].count = parseInt(ordersTemp[i].count)+parseInt(req.body.lengthenCount);
                        var temp = ordersTemp[i].milkType;
                    }
                }
                db.orders.update({ _id: req.params.id }, {
                    orders:ordersTemp
                })
                    .exec()
                    .then(function () {
                        db.orders.update({ _id: req.params.id }, {
                            $push: {
                                logs: {
                                    user: req.session.uid,
                                    content:'顺延了'+temp+'品相'+req.body.lengthenCount+'瓶'
                                }
                            }
                        })
                        .exec()
                        .then(function () {
                                db.orders.find()
                                .where({'parentId': req.params.id})
                                .exec()
                                .then(function (orders) {
                                        for(var i =0 ;i<orders.length;i++){
                                            ordersTemp = order.orders;
                                            console.log(ordersTemp);
                                            for(var j =0;j<ordersTemp.length;j++){
                                                ordersTemp[i].begin.setDate(getEndDistributeDate(_order.orders[j],_order.changes).getDate()+1);
                                            }
                                            console.log(ordersTemp);
                                            db.orders.update({ _id:orders[i]._id }, {
                                                orders:ordersTemp
                                            })
                                                .exec()
                                        }
                                    })
                                res.redirect('/order/show/' + req.params.id);
                            })
                    })
            })
            .then(null, next);
    }
    else if(req.body.type=='赠饮'){
        var ordersTemp = [];
         if(req.body.lsGiftOreders=='new'){
             db.orders.update({ _id: req.params.id }, {
                 $push: {
                     orders: {
                         milkType:req.body.omilkType,
                         count:req.body.ocount,
                         begin:req.body.obegin,
                         distributeMethod:req.body.distributeMethod,
                         distributeCount:req.body.distributeCount
                     }
                 }
             })
             .exec(function () {
                     db.orders.update({ _id: req.params.id }, {
                         $push: {
                             logs: {
                                 user: req.session.uid,
                                 content:'赠送了'+req.body.omilkType+'品相'+req.body.ocount+'瓶'
                             }
                         }
                     })
                         .exec()
                         .then(function () {
                             db.orders.findById(req.params.id)
                                 .exec()
                                 .then(function (order) {
                                     _order = order ;
                                     db.orders.find()
                                         .where({'parentId': req.params.id})
                                         .exec()
                                         .then(function (orders) {
                                             for(var i =0 ;i<orders.length;i++){
                                                 ordersTemp = order.orders;
                                                 console.log(ordersTemp);
                                                 for(var j =0;j<ordersTemp.length;j++){
                                                     ordersTemp[i].begin.setDate(getEndDistributeDate(_order.orders[j],_order.changes).getDate()+1);
                                                 }
                                                 console.log(ordersTemp);
                                                 db.orders.update({ _id:orders[i]._id }, {
                                                     orders:ordersTemp
                                                 })
                                                     .exec()
                                             }
                                         })
                                     res.redirect('/order/show/' + req.params.id);
                                 })

                         })
                 })
             .then(null,next);
         }
         else{
             var temp;
             db.orders.findById(req.params.id)
                 .exec()
                 .then(function (order) {
                     _order = order;
                     ordersTemp = order.orders;
                     for(var i =0;i<ordersTemp.length;i++){
                         if(req.body.lsGiftOreders==ordersTemp[i]._id){
                             ordersTemp[i].count = parseInt(ordersTemp[i].count)+parseInt(req.body.giftCount);
                             temp = ordersTemp[i].milkType;
                         }
                     }
                     db.orders.update({ _id: req.params.id }, {
                         orders:ordersTemp
                     })
                         .exec()
                         .then(function () {
                             db.orders.update({ _id: req.params.id }, {
                                 $push: {
                                     logs: {
                                         user: req.session.uid,
                                         content:'赠送了'+temp+'品相'+req.body.giftCount+'瓶'
                                     }
                                 }
                             })
                                 .exec()
                                 .then(function () {
                                     db.orders.find()
                                         .where({'parentId': req.params.id})
                                         .exec()
                                         .then(function (orders) {
                                             for(var i =0 ;i<orders.length;i++){
                                                 ordersTemp = order.orders;
                                                 console.log(ordersTemp);
                                                 for(var j =0;j<ordersTemp.length;j++){
                                                     ordersTemp[i].begin.setDate(getEndDistributeDate(_order.orders[j],_order.changes).getDate()+1);
                                                 }
                                                 console.log(ordersTemp);
                                                 db.orders.update({ _id:orders[i]._id }, {
                                                     orders:ordersTemp
                                                 })
                                                     .exec()
                                             }
                                         })
                                     res.redirect('/order/show/' + req.params.id);
                                 })
                         })
                 })
                 .then(null, next);
         }
    }
    else{
        db.orders.findById(req.params.id)
            .exec()
            .then(function (order) {
                _order = order;
                return db.orders.update({ _id: req.params.id }, {
                    $push: {
                        changes: {
                            user: req.session.uid,
                            time: Date.now(),
                            type: req.body.type,
                            milkType: req.body.type == '整单停送'?'':req.body.milkType,
                            begin: req.body.begin,
                            end: req.body.end,
                            hint: req.body.hint,
                            count: req.body.type == '整单停送'?'':req.body.count
                        }
                    }
                })
                    .exec()
                    .then(function () {
                        res.redirect('/order/show/' + req.params.id);
                    });
            })
            .then(null, next);
    }

});

// 删除变更
router.post('/change/delete/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    //TODO: 判断各个字段是否合法
    db.orders.update({ _id: req.params.id }, {
        $pull: {
            changes: { _id: req.query.cid }
        }
    })
        .exec()
        .then(function () {
            res.send('ok');
        })
        .then(null, next);
});

// 计算订单结束日期
function getEndDistributeDate (order, changes)
{
    console.log(order);
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let ret;
    let count = order.count;
    if (order.distributeMethod == '天天送')
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                    count -= x.count;
                else if (x.type == '停送')
                    count += x.count;
                else
                    count += order.distributeCount;
            });
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                    count -= x.count;
                else if (x.type == '停送')
                    count += x.count;
                else
                    count += order.distributeCount;
            });
        }
    }
    else
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 1))
        {
            if (ret.getDay() == 6 || ret.getDay() == 7) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                    count -= x.count;
                else if (x.type == '整单停送')
                    count += x.count;
                else
                    count += order.distributeCount;
            });
        }
    }
    return ret;
}

// 获取订单某日需配送瓶数
function getDistributeCount (order, changes, time) {
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let tmp = new Date();
    time = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    let ret, cnt = 0;
    let count = order.count;
    if (order.distributeMethod == '天天送')
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                {
                    count -= x.count;
                    cnt += x.count;
                }
                else if (x.type == '整单停送')
                {
                    count += x.count;
                    cnt -= x.count;
                }
                else
                {
                    cnt = 0;
                    count += order.distributeCount;
                }
            });
            if (i.getTime() === time.getTime()) return cnt;
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                {
                    count -= x.count;
                    cnt += x.count;
                }
                else if (x.type == '整单停送')
                {
                    count += x.count;
                    cnt -= x.count;
                }
                else
                {
                    cnt = 0;
                    count += order.distributeCount;
                }
            });
            if (i.getTime() === time.getTime()) return cnt;
        }
    }
    else
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 1))
        {
            if (i.getDay() == 6 || i.getDay() == 7) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                {
                    count -= x.count;
                    cnt += x.count;
                }
                else if (x.type == '整单停送')
                {
                    count += x.count;
                    cnt -= x.count;
                }
                else
                {
                    cnt = 0;
                    count += order.distributeCount;
                }
            });
            if (i.getTime() === time.getTime()) return cnt;
        }
    }
    return 0;
}

// 获取剩余瓶数
function getLeftCount (order, changes, time) {
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let tmp = new Date();
    time = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    let ret, cnt = 0;
    let count = order.count;
    if (dbeg > tmp) return count;
    if (order.distributeMethod == '天天送')
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                {
                    count -= x.count;
                }
                else if (x.type == '停送')
                {
                    count += x.count;
                }
                else
                {
                    count += order.distributeCount;
                }
            });
            console.log(i.getTime() === time.getTime(), count);
            if (i.getTime() === time.getTime()) return count;
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                {
                    count -= x.count;
                }
                else if (x.type == '停送')
                {
                    count += x.count;
                }
                else
                {
                    count += order.distributeCount;
                }
            });
            let timetmp = time.getTime();
            if (i.getTime() === timetmp) return count;
            let tt = new Date(i);
            let t2 = tt.setDate(i.getDate() - 1);
            if (t2.toString() == timetmp) return count;
        }
    }
    else
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 1))
        {
            if (i.getDay() == 6 || i.getDay() == 7) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
                {
                    count -= x.count;
                    cnt += x.count;
                }
                else if (x.type == '停送')
                {
                    count += x.count;
                    cnt -= x.count;
                }
                else
                {
                    cnt = 0;
                    count += order.distributeCount;
                }
            });
            if (i.getTime() === time.getTime()) return cnt;
        }
    }
    return 0;
}

// 配送日报
router.get('/distribute', auth.checkRole('distribute', 'query'), function (req, res, next) {
    db.orders.find({
        'customServiceFlag':true
    })
        .where('address').ne(null)
        .populate('address')
        .exec()
        .then(function (orders) {
            let tmp = _.groupBy(orders, x => x.address.city);
            let ret = {};
            for (let x in tmp) {4
                ret[x] = {};
                tmp[x].forEach(z => {
                    z.orders.forEach(y => {
                        let cnt = getDistributeCount(y, z.changes, new Date());
                        console.log(cnt);
                        if (cnt > 0) {
                            if (!ret[x][y.milkType])
                                ret[x][y.milkType] = cnt;
                            else
                                ret[x][y.milkType] += cnt;
                        }
                    });
                });
            }
            res.render('order/distribute', { title: '配送管理', report: ret });
        })
        .then(null, next);
});

// 车辆配送日报
router.get('/distribute/car', auth.checkRole('distribute', 'query'), function (req, res, next) {
    let orders;
    db.orders.find({
        'customServiceFlag':true
    })
        .where('address').ne(null)
        .populate('address')
        .exec()
        .then(function (_orders) {
            orders = _orders.map(x => x.toObject());
            return db.cars.find().where('city').ne(null).exec();
        })
        .then(function (cars) {
            let tmp = _.groupBy(cars, x => x.city);
            let ret = {};
            for (let x in tmp) {
                if (!ret[x]) ret[x] = {};
                tmp[x].forEach(y => {
                    if (!ret[x][y.line]) ret[x][y.line] = {};
                    orders.forEach(m => {
                        if (y.stations.some(a => a.toString() == m.address.milkStation.toString()))
                        {
                            m.orders.forEach(z => {
                                let cnt = getDistributeCount(z, m.changes, new Date());
                                if (cnt > 0) {
                                    if (!ret[x][y.line][z.milkType.toString()]) ret[x][y.line][z.milkType.toString()] = 0;
                                    ret[x][y.line][z.milkType.toString()] += cnt;
                                }
                            });
                        }
                    });
                });
            }
            console.log(ret);
            res.render('order/distributeCar', { title: '配送车辆日报', report: ret });
        })
        .then(null, next);
});

// 奶站配送日报
router.get('/distribute/station', auth.checkRole('distribute', 'query'), function (req, res, next) {
    db.orders.find({
        'customServiceFlag':true
    })
        .where('address').ne(null)
        .populate('address')
        .deepPopulate('address.milkStation')
        .exec()
        .then(function (orders) {
            let ret = {};
            let tmp = _.groupBy(orders.filter(x => x.address.milkStation), x => x.address.milkStation.city + ' - ' + x.address.milkStation.title);
            for (let x in tmp) {
                if (!ret[x]) ret[x] = {};
                tmp[x].forEach(z => {
                    z.orders.forEach(y => {
                        let cnt = getDistributeCount(y, z.changes, new Date());
                        if (cnt > 0) {
                            if (!ret[x][y.milkType]) ret[x][y.milkType] = 0;
                            ret[x][y.milkType] += cnt;
                        }
                    });
                });
            }
            res.render('order/distributeStation', { title: '奶站配送日报', report: ret });
        })
        .then(null, next);
});

router.get('/distribute/detail', auth.checkRole('distribute', 'query'), function (req, res, next) {
    db.orders.find({
        'customServiceFlag':true
    })
        .where('address').ne(null)
        .populate('address')
        .deepPopulate('address.milkStation address.distributor')
        .exec()
        .then(function (orders) {
            let ret = [];
            let tmp = _.groupBy(orders.filter(x => x.address.milkStation), x => x.address.milkStation.city + ' - ' + x.address.milkStation.title);
            for (let x in tmp) {
                if (!ret[x]) ret[x] = {};
                tmp[x].forEach(z => {
                    z.orders.forEach(y => {
                        let cnt = getDistributeCount(y, z.changes, new Date());
                        if (cnt > 0) {
                            ret.push({
                                number: z.number,
                                customer: z.address.name,
                                tel: z.address.phone,
                                milkType: y.milkType,
                                count: cnt,
                                address: z.address.address,
                                storey: z.address.storey,
                                milkStation: z.address.milkStation ? z.address.milkStation.title : '未指派',
                                distributor: z.address.distributor ? z.address.distributor.name : '未指派',
                                city: z.address.city
                            });
                        }
                    });
                });
            }
            ret = ret.sort((x, y) => {
                if (x.milkStation != y.milkStation)
                    return x.milkStation < y.milkStation;
                if (x.distributor != y.distributor)
                    return x.distributor < y.distributor;
                if (x.address != y.address)
                    return x.address < y.address;
                return y.count - x.count;
            });
            res.locals.report = ret;
            next();
        })
        .then(null, next);
});

router.get('/distribute/detail', function (req, res, next) {
    db.orders.find({
        'customServiceFlag':true
        //begin: { $lte: Date.now() }
    })
        .where('address').ne(null)
        .populate('address')
        .deepPopulate('address.milkStation address.distributor')
        .exec()
        .then(function (orders) {
            let tmp = _.groupBy(orders, x => x.address.city);
            let ret = {};
            for (let x in tmp) {
                ret[x] = {};
                let tmp2 = _.groupBy(tmp[x], a => a.address.milkStation.title + ' ' + (a.address.milkStation.distributor == null ? "未指派" : a.address.milkStation.distributor.name));
                for(let b in tmp2)
                {
                    ret[x][b] = {};
                    tmp2[b].forEach(z => {
                        z.orders.forEach(y => {
                            let cnt = getDistributeCount(y, z.changes, new Date());
                            if (cnt > 0) {
                                if (!ret[x][b][y.milkType])
                                    ret[x][b][y.milkType] = cnt;
                                else
                                    ret[x][b][y.milkType] += cnt;
                            }
                        });
                    });
                }
            }
            console.log(ret);
            res.locals.report2 = ret;
            if (!req.query.raw)
                res.render('order/distributeDetail', { title: '配送详单' });
            else
                res.render('order/distributeDetailRaw', { layout: false });
        })
        .then(null, next);
});

router.get('/produce', auth.checkRole('produce', 'query'), function (req, res, next) {
    let now = new Date();
    let time =  new Date(now.getFullYear(), now.getMonth(), now.getDate());
    time.setDate(time.getDate() + (parseInt(req.query.day) || 3));
    db.orders.find({
        'customServiceFlag':true
        //begin: { $lte: time }
    })
        .where('address').ne(null)
        .populate('address')
        .exec()
        .then(function (orders) {
            let tmp = _.groupBy(orders, x => x.address.city);
            let ret = {};
            for (let x in tmp) {
                ret[x] = {};
                tmp[x].forEach(z => {
                    z.orders.forEach(y => {
                        let cnt = getDistributeCount(y, z.changes, time);
                        if (cnt > 0) {
                            if (!ret[x][y.milkType])
                                ret[x][y.milkType] = cnt;
                            else
                                ret[x][y.milkType] += cnt;
                        }
                    });
                });
            }
            res.render('order/produce', { title: '生产预报', report: ret });
        })
        .then(null, next);
});

//  地址验证  by nele
router.get('/verifyAddress',auth.checkRole('distribute','query'),function(req,res,next){
    var district = req.query.district;
    var city = req.query.city;
    var address = req.query.address;
    var name = req.query.name;
    var phone = req.query.phone;
    var storey = req.query.storey;
    var milkStation = req.query.milkStation;
    db.addresses
        .findOne({city:city,district:district,address:address,name:name,phone:phone,storey:storey,milkStation:milkStation})
        .exec()
        .then(function(address){
            if(address==null){
                let address  = new db.addresses();
                address.city=city;
                address.district=district;
                address.address=req.query.address;
                address.name=name;
                address.phone=phone;
                address.storey=storey;
                address.milkStation=milkStation;
                address.save(function (err,address) {
                    res.send(address._id);
                })
            }else{
                 res.send(address._id);
            }
        })
       .then(null,next);
});

// 财务管理  by nele
router.get('/finance',auth.checkRole('finance','query'), function (req, res, next) {
    let query = db.finances.find();
    if (req.query.user) {
        db.users
            .aggregate()
            .match({name: new RegExp('.*' + req.query.data + '.*'), role: '业务员'})
            .group({_id:{id:'$_id'}})
            .exec()
            .then(function (users) {
                query = query.where({ user: users[0]._id });
            });
    }
    if (req.query.begin)
        query = query.where('time').gte(Date.parse(req.query.begin));
    if (req.query.end)
        query = query.where('time').lte(Date.parse(req.query.end));
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('user')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (finances) {
            console.log(finances);
            res.locals.finances = finances;
            res.render('order/finance',{ title: '财务管理'});
        })
        .then(null,next);

});

// 创建财务 by nele
router.get('/createFinance',auth.checkRole('finance','modify'), function (req, res, next) {
       res.render('order/financeCreate',{ title: '财务管理'});
});

// 常见财务 by nele
router.post('/createFinance',auth.checkRole('finance','modify'), function (req, res, next) {
    let finance = new db.finances();
    var name = req.body.user;
    var price= req.body.price;
    var payMethod= req.body.payMethod;
    var pos = req.body.pos;
    db.users
       .findOne({name:name})
       .exec()
       .then(function (user) {
            finance.time=Date.now();
            finance.user=user._id;
            finance.payMethod=enums.payMethod[payMethod];
            finance.price = price;
            finance.pos=pos;
            finance.save(function (err,finance) {
                res.redirect('/order/finance');
            })
        });
});


// 登记退钱 by nele
router.get('/createBackMoney',auth.checkRole('finance','modify'), function (req, res, next) {
    res.render('order/backMoneyCreate',{ title: '登记退钱'});
});

// 登记退钱 by nele
router.post('/createBackMoney',auth.checkRole('finance','modify'), function (req, res, next) {
    db.addresses.update({_id:req.body.backMoneyAddress},{
        $inc: { balance: -req.body.backMoney }
        })
        .exec()
        .then(function () {
            res.redirect('/order/finance');
        })
     .then(null,next);
});


// 财务详细  by nele
router.get('/finance/show/:id',auth.checkRole('finance','modify'), function (req, res, next) {
      db.finances.findById(req.params.id)
          .populate('user')
       .exec()
       .then(function (finance) {
              res.render('order/financeDetail', { title: '收款记录详情', finance: finance });
          })
       .then(null,next);
});


// 财务修改  by nele
router.get('/finance/edit/:id',auth.checkRole('finance','modify'), function (req, res, next) {
    db.finances.findById(req.params.id)
        .populate('user')
        .exec()
        .then(function (finance) {
            res.render('order/financeEdit', { title: '收款记录修改', finance: finance });
        })
        .then(null,next);
});

// 修改财务 by nele
router.post('/finance/edit/:id',auth.checkRole('finance','modify'), function (req, res, next) {
    var name = req.body.user;
    var price= req.body.price;
    var payMethod= req.body.payMethod;
    var pos = req.body.pos;

    db.users
        .findOne({ name: name })
        .exec()
        .then(function (user) {
            db.finances.update({ _id: req.params.id }, {
                user:user._id,
                price:price,
                payMethod:enums.payMethod[payMethod],
                pos:pos
            })
                .exec()
                .then(function () {
                    res.send('ok');
                })
        })
        .then(null, next);
});

// 删除财务  by nele
router.post('/finance/delete/:id',auth.checkRole('finance','modify'), function (req, res, next) {
    db.finances.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null, next);
});

//   财务统计  by nele
router.get('/statistics',auth.checkRole('finance','modify'), function (req , res, next) {
     res.render('order/statistics', { title: '财务统计报表' });
});

//  生成报表  by nele
router.get('/getStatistics',auth.checkRole('finance','modify'), function (req , res, next) {
        let ObjectID = db.mongoose.mongo.BSONPure.ObjectID;
         var aggregate = db.finances.aggregate();
         if(req.query.department){
                 console.log(req.query.department);
                var pipeline= { $match: { 'user.department': ObjectID(req.query.department)}};
                aggregate.append(pipeline);
         }
         aggregate.group({_id:{user:'$user'},count: { $sum: '$price' }})
        .exec()
        .then(function (data) {
               console.log(data);
        })
        .then(null,next);
});


// 查看订单详情
router.get('/getById/:id', auth.checkRole('order', 'query'), function (req, res, next) {
    db.orders.findById(req.params.id)
        .populate('address user')
        .exec()
        .then(function (orders) {
            for (let i = 0; i < orders.orders.length; i ++)
                orders.orders[i].leftCount = getLeftCount(orders.orders[i],orders.changes,new Date());
            res.json(orders);
        })
        .then(null, next);
});

// 根据id获取orders by nele
router.get('/getOrdersById/:id',auth.checkRole('order','query'), function (req, res, next) {
    var orders =[];
    db.orders.findById(req.params.id)
     .exec()
     .then(function (order) {
            orders=order.orders;
            res.json(orders);
        })
    .then(null,next);
});

// 根据id获取orders by nele
router.get('/getOneOrderById/:id',auth.checkRole('order','query'), function (req, res, next) {
    var orders =[];
    var oid =  req.query.oid;
    db.orders.findById(req.params.id)
        .exec()
        .then(function (order) {
             let tmp = order.orders.filter(x=>x._id==oid);
             res.send(tmp);
        })
        .then(null,next);
});


router.get('/acceptCall',auth.checkRole('order','query'), function (req,res,next) {
    let query = db.orders.find();
    let orders;
    if (req.query.number)
        query = query.where({ number: req.query.number });
    if (req.query.city)
        query = query.where({ 'address.city': req.query.city });
    if (req.query.district)
        query = query.where({ 'address.district': req.query.district });
    if (req.query.milkStation)
        query = query.where({ 'milkStation': req.query.milkStation });
    if (req.query.address) {
        query = query.where({ 'address.address': new RegExp('.*' + req.query.address + '.*') });
    }
    if (req.query.begin)
        query = query.where('begin').gte(Date.parse(req.query.begin));
    if (req.query.end)
        query = query.where('end').lte(Date.parse(req.query.end));
    if (req.query.user)
        query = query.where({ 'user.name': new RegExp('.*' + req.query.user + '.*') });
    query=query.where({'orderType':{ $in: [ 'A02','A03','A04','A05','A06' ]}});
    query=query.where({'customServiceFlag':false});
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.query.p == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 50 - 1) / 50);
            var start = res.locals.start = (page - 50) < 1 ? 1 : (page - 50);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('address milkStation user')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (_orders) {
            orders = _orders;
            for(let i= 0;i<orders.length;i++){
                for(let j=0;j<orders[i].orders.length;j++){
                    let leftCount = getLeftCount(orders[i].orders[j],orders[i].changes,new Date());
                    orders[i].orders[j].leftCount=leftCount;
                    console.log(orders[i].orders[j]);
                }
            }
            res.locals.orders = orders;
            return db.addresses
                .aggregate()
                .group({
                    _id: '$city'
                })
                .exec()
        })
        .then(function (cities) {
            res.locals.cities = cities.map(x => x._id);
            if (!req.query.raw)
               res.render('order/acceptCall', { title: '受理热线订单' });
            else
               res.render('order/acceptCallDetailRaw', { layout: false });
        })
        .then(null, next);
});

// 受理热线订单 bu nele
router.post('/doAcceptCall/:id',auth.checkRole('order','modify'), function (req,res,next){
    //TODO: 判断各个字段是否合法
    let user  =req.session.user;
    db.orders.update({ _id: req.params.id }, {
        customServiceFlag:true,
        customService: req.session.uid
    })
        .exec()
        .then(function () {
            res.send('ok');
        })
        .then(null, next);
});


// 续单 第一步
router.get('/continue',auth.checkRole('order','modify'), function (req,res,next){
    res.render('order/orderContinue', { title: '续单' });
});

router.post('/continue',auth.checkRole('order','modify'), function (req,res,next) {
       var number =  req.body.number;
       db.orders.findOne({
           'number':number
       })
           .populate('address')
        .exec()
        .then(function (order) {
               if(order == null){
                   res.locals.message ="你输入的订单不存在，请重新输入";
                   res.render('order/message', { title: '提示信息' });
               }
               else{
                   var time = Date.now();
                   var flag = false;
                   for(var i=0;i<order.orders.length;i++){
                       var end = getEndDistributeDate(order.orders[i],order.changes);
                       end.setDate(end.getDate()-2);
                       if(time >end){
                            flag = true;
                       }
                   }
                   if(flag==true){
                       res.locals.message ="只能提前两天续单";
                       res.render('order/message', { title: '提示信息' });
                   }
                   else{
                       res.locals.order =order;
                       res.locals.address = order.address;
                       res.render('order/orderContinueInfo', { title: '受理热线订单' });
                   }
               }
           })
         .then(null,next);
});

// 续单 第二步
router.post('/doOrderContinueInfo',auth.checkRole('order','modify'), function (req,res,next) {
    let order = new db.orders();
    let user  = req.session.user;
    if(user.role == '热线员'){
        order.customCall =  req.session.uid;
    }
    if(user.role == '业务员'){
        order.customService =  req.session.uid;
    }
    order.time = Date.now();
    order.user = req.session.uid;
    order.address = req.body.address;
    order.number = req.body.number;
    order.payMethod = req.body.payMethod;
    order.pos = req.body.pos =='pos'?'': req.body.pos;
    order.price = req.body.price;
    order.orderType = 'undefine';
    order.parentId = req.body.parentId
    // TODO: 计算最后一天送奶日期（需要考虑周末停送时中间有一个周六周日）
    // order.end = ;
    order.hint = req.body.hint;
   db.orders.findById(req.body.parentId)
    .exec()
    .then(function (data) {
           console.log(data.orders.length);
           if(typeof(req.body.milkType)!='string'){
               for(var i =0;i<req.body.milkType.length;i++){
                   if(data.orders.length>=i+1){
                       order.orders.push({
                           milkType: req.body.milkType[i],
                           count:req.body.count[i] + req.body.presentCount[i],
                           distributeCount:req.body.distributeCount[i],
                           distributeMethod:req.body.distributeMethod[i],
                           single:req.body.single[i],
                           time:Date.now(),
                           begin:getEndDistributeDate(data.orders[i],data.changes).getDate()+1
                       });
                   }else{
                       order.orders.push({
                           milkType: req.body.milkType[i],
                           count:req.body.count[i] + req.body.presentCount[i],
                           distributeCount:req.body.distributeCount[i],
                           distributeMethod:req.body.distributeMethod[i],
                           single:req.body.single[i],
                           time:Date.now(),
                           begin:req.body.begin[i]
                       });
                   }
                   if(req.body.presentCount[i]>0){
                       order.logs.push({
                           user: req.session.uid,
                           content:'赠送'+ req.body.milkType[i]+'品相'+req.body.presentCount[i]+'瓶'
                       })
                   }
               }
           }else{
               order.orders.push({
                   milkType: req.body.milkType,
                   count:parseInt(req.body.count) + parseInt(req.body.presentCount),
                   distributeCount:req.body.distributeCount,
                   distributeMethod:req.body.distributeMethod,
                   single:req.body.single,
                   time:Date.now(),
                   begin:getEndDistributeDate(data.orders[0],data.changes).getDate()+1
               });
               if(req.body.presentCount>0){
                   order.logs.push({
                       user: req.session.uid,
                       content:'赠送'+ req.body.milkType[i]+'品相'+req.body.presentCount[i]+'瓶'
                   })
               }
           }
           for (let i = 0; i < order.orders.length; i++)
               order.orders[i].end = getEndDistributeDate(order.orders[i], order.changes);

           for(var i  =0 ;i<data.orders.length;i++){
               var time = new Date();
               time.setDate(time.getDate() + 8);
               var end ;
               end.setDate(getEndDistributeDate(data.orders[i],data.changes).getDate());
               if(time>end){
                   order.orderType  =  'A01';
               }
               else{
                   order.orderType  =  'A06';
               }
           }
           order.save(function (err, order) {
               res.redirect('/order/show/' + order._id);
           });
       })
      .then(null,next);
});

module.exports = router;
