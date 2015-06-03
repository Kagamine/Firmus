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
    if(req.query.milkType)
       query=query.where({'milkType':req.query.milkType});
    if(req.query.orderType)
        query=query.where({'orderType':req.query.orderType});
    if(req.query.distributeMethod)
        query=query.where({'distributeMethod':req.query.distributeMethod});
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('address milkStation user')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (orders) {
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
    console.log(req.body.milkType);
    let order = new db.orders();
    order.time = Date.now();
    order.user = req.session.uid;
    order.address = req.body.address;
    order.number = req.body.number;
    order.milkType = req.body.milkType;
    order.count = req.body.count;
    order.price = req.body.price;
    order.payMethod = req.body.payMethod;
    order.pos = req.body.pos || '';
    order.begin = Date.parse(req.body.begin);
    order.orderType = req.body.orderType;
    // TODO: 计算最后一天送奶日期（需要考虑周末停送时中间有一个周六周日）
    // order.end = ;
    order.distributeMethod = req.body.distributeMethod;
    order.distributeCount = req.body.distributeCount;
    //order.save(function (err, order) {
    //    console.log(order);
    //    res.redirect('/order/show/' + order._id);
    //});
});

// 查看订单详情
router.get('/show/:id', auth.checkRole('order', 'query'), function (req, res, next) {
    db.orders.findById(req.params.id)
        .populate('address')
        .populate('order')
        .exec()
        .then(function (order) {
            res.render('order/orderDetail', { title: '订单详情', order: order });
        })
        .then(null, next);
});



// 编辑订单
router.get('/edit/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    db.orders.findById(req.params.id)
        .populate('address')
        .exec()
        .then(function (order) {
            res.render('order/orderEdit', { title: '订单详情', order: order });
        })
        .then(null, next);
});

// 编辑订单
router.post('/edit/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    let end = Date.now(); //TODO: 计算最后一天送奶日期
    db.orders.update({ _id: req.params.id }, {
        orderType: req.body.orderType,
        address: req.body.address,
        milkType: req.body.milkType,
        begin: req.body.begin,
        end: end
    })
        .exec()
        .then(function () {
            res.send('ok');
        })
        .then(null, next);
});

// 添加订单变更
router.get('/change/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    res.render('order/orderChange', { title: '订单变更' });
});

// 添加订单变更
router.post('/change/:id', auth.checkRole('order', 'modify'), function (req, res, next) {
    db.orders.findById(req.params.id)
        .exec()
        .then(function (order) {
            let end = Date.now(); //TODO: 计算最后一天送奶日
            return db.orders.update({ _id: req.params.id }, {
                $push: {
                    changes: {
                        user: req.session.uid,
                        time: Date.now(),
                        type: req.body.type,
                        begin: req.body.begin,
                        end: req.body.end,
                        hint: req.body.hint,
                        count: req.body.count
                    }
                },
                end: end
            }).exec();
        })
        .then(function () {
            res.redirect('/order/' + req.params.id);
        })
        .then(null, next);
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
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let ret;
    let count = order.count;
    if (order.distributeMethod == '天天送')
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret);
            tmp.forEach(x => {
                if (x.type == '加送')
                    count -= (order.distributeCount + x.count);
                else if (x.type == '停送')
                    count -= (order.distributeCount - x.count);
            });
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret);
            tmp.forEach(x => {
                if (x.type == '加送')
                    count -= (order.distributeCount + x.count);
                else if (x.type == '停送')
                    count -= (order.distributeCount - x.count);
            });
        }
    }
    else
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 1))
        {
            if (ret.getDay() == 6 || ret.getDay() == 7) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret);
            tmp.forEach(x => {
                if (x.type == '加送')
                    count -= (order.distributeCount + x.count);
                else if (x.type == '停送')
                    count -= (order.distributeCount - x.count);
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
    let ret;
    let count = order.count;
    if (order.distributeMethod == '天天送')
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            tmp.forEach(x => {
                let cnt = order.distributeCount;
                if (x.type == '加送')
                {
                    count -= (order.distributeCount + x.count);
                    cnt += x.count;
                }
                else if (x.type == '停送')
                {
                    count -= (order.distributeCount - x.count);
                    cnt -= x.count;
                }
                else
                {
                    cnt = 0;
                }
                if (i == time) return cnt;
            });
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            tmp.forEach(x => {
                let cnt = order.distributeCount;
                if (x.type == '加送')
                {
                    count -= (order.distributeCount + x.count);
                    cnt += x.count;
                }
                else if (x.type == '停送')
                {
                    count -= (order.distributeCount - x.count);
                    cnt -= x.count;
                }
                else
                {
                    cnt = 0;
                }
                if (i == time) return cnt;
            });
        }
    }
    else
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 1))
        {
            if (i.getDay() == 6 || i.getDay() == 7) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i);
            tmp.forEach(x => {
                let cnt = order.distributeCount;
                if (x.type == '加送')
                {
                    count -= (order.distributeCount + x.count);
                    cnt += x.count;
                }
                else if (x.type == '停送')
                {
                    count -= (order.distributeCount - x.count);
                    cnt -= x.count;
                }
                else
                {
                    cnt = 0;
                }
                if (i == time) return cnt;
            });
        }
    }
    return 0;
}

// 配送日报
router.get('/distribute', auth.checkRole('distribute', 'query'), function (req, res, next) {
    db.orders.find({
        begin: { $lte: Date.now() },
        end: { $gte: Date.now() }
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
                        let cnt = getDistributeCount(y, Date.now());
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
        begin: { $lte: Date.now() },
        end: { $gte: Date.now() }
    })
        .where('address').ne(null)
        .where('address.city').ne(null)
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
                    let o = orders.filter(z => y.stations.some(a => a == z.address.milkStation));
                    o.forEach(m => {
                        m.orders.foreach(z => {
                            let cnt = getDistributeCount(z, Date.now());
                            if (cnt > 0) {
                                if (!ret[x][y][z.milkType]) ret[x][y][z.milkType] = 0;
                                ret[x][y][z.milkType] += cnt;
                            }
                        });
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
        begin: { $lte: Date.now() },
        end: { $gte: Date.now() }
    })
        .where('address').ne(null)
        .populate('address')
        .deepPopulate('address.milkStation')
        .exec()
        .then(function (orders) {
            let ret = {};
            let tmp = _.groupBy(orders.filter(x => x.milkStation), x => x.address.milkStation.title + '(' + x.address.milkStation.city + ')');
            console.log(orders);
            for (let x in tmp) {
                if (!ret[x]) ret[x] = {};
                tmp[x].forEach(z => {
                    z.forEach(y => {
                        let cnt = getDistributeCount(y, Date.now());
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

router.get('/produce', auth.checkRole('produce', 'query'), function (req, res, next) {
    let now = new Date();
    let time =  new Date(now.getFullYear(), now.getMonth(), now.getDate());
    time.setDate(time.getDate() + (parseInt(req.query.day) || 3));
    db.orders.find({
        begin: { $lte: time },
        end: { $gte: time }
    })
        .where('address').ne(null)
        .populate('address')
        .exec()
        .then(function (orders) {
            let tmp = _.groupBy(orders, x => x.address.city);
            let ret = {};
            for (let x in tmp) {
                ret[x] = {};
                tmp[x].forEach(y => {
                    let cnt = getDistributeCount(y, time);
                    if (cnt > 0) {
                        if (!ret[x][y.milkType])
                            ret[x][y.milkType] = cnt;
                        else
                            ret[x][y.milkType] += cnt;
                    }
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
    db.addresses
        .findOne({city:city,district:district,address:address,name:name})
        .exec()
        .then(function(address){
            if(address==null){
                 res.send('no');
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
        .findOne({name:name})
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
        .then(function (order) {
              res.json(order);
        })
        .then(null, next);
});


module.exports = router;