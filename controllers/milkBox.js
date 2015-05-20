'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.milkBox = true;
    next();
});

router.get('/',auth.checkRole('milkBox','query'), function ( req, res, next) {
    let query = db.departments.find({ type: '奶箱仓库' });
    if (req.query.title)
        query = query.where({ title: new RegExp('.*' + req.query.title + '.*') });

    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.query.p == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 50 - 1) / 50);
            var start = res.locals.start = (page - 50) < 1 ? 1 : (page - 50);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .skip(50 * (page - 1))
                .limit(50)
                .populate('user')
                .exec();
        })
        .then(function (departments) {
            res.locals.departments = departments;
            return Promise.all(departments.map(x => {
                return db.stores
                    .aggregate()
                    .match({
                        gift: { $eq: null } ,
                        operateType: { $in: ['转入', '入库', '拆箱'] }
                    })
                    .group({
                        _id: '$gift',
                        total: {
                            $sum: '$count'
                        }
                    })
                    .exec();
            }));
        })
        .then(function (counts) {
            for (let i = 0; i < counts.length; i++) {
                res.locals.departments[i].count = counts[i][0].total;
            }
            return Promise.all(res.locals.departments.map(x => {
                    return db.stores
                        .aggregate()
                        .match({
                            gift: { $eq: null } ,
                            operateType: { $nin: ['转入', '入库', '拆箱'] }
                        })
                        .group({
                            _id: '$gift',
                            total: {
                                $sum: '$count'
                            }
                        })
                        .exec();
                    }));

        })
        .then(function (counts) {
            for (let i = 0; i < counts.length; i++) {
                if (counts[i][0] && counts[i][0].total)
                    res.locals.departments[i].count -= counts[i][0].total;
            }
            res.render('milkBox/index', { title: '奶箱管理' });
        })
        .then(null, next);
});


router.get('/deposit',auth.checkRole('deposit','query'), function (req, res,next) {
    let query = db.deposits.find();
    if(req.query.giveBackFlag)
        query =  query.where({'giveBackFlag':req.query.giveBackFlag});
    if(req.query.boxedFlag)
        query =  query.where({'boxedFlag':req.query.boxedFlag});
    if (req.query.begin)
        query = query.where('time').gte(Date.parse(req.query.begin));
    if (req.query.end)
        query = query.where('time').lte(Date.parse(req.query.end));
    if (req.query.address) {
        db.addresses.find()
            .where({ 'address': new RegExp('.*' + req.query.address + '.*') })
            .select('_id')
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }
    if (req.query.phone) {
        db.addresses.find()
            .where({ 'phone': req.query.phone  })
            .select('_id')
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }
    if (req.query.name) {
        db.addresses.find()
            .where({ 'name': req.query.name  })
            .select('_id')
            .exec()
            .then(function (data) {
                query = query.where({ 'address':{ $in: data } });
            })
    }

    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            if (req.query.raw)
                return query
                    .populate('address')
                    .exec();
            var page = res.locals.page = req.query.p == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 50 - 1) / 50);
            var start = res.locals.start = (page - 50) < 1 ? 1 : (page - 50);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('address')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (deposits) {
            res.locals.deposits = deposits.filter(x => x.number && x.address);
            if (req.query.raw)
                res.render('milkBox/depositRaw', { title: '押金单管理', layout: false });
            else
                res.render('milkBox/deposit',{title:'押金单管理'});
        })
        .then(null,next);

});

// 创建押金单页面 by nele
router.get('/createDeposit',auth.checkRole('deposit','modify'), function (req, res, next) {
     res.render('milkBox/createDeposit',{title:'创建押金单'});
});

// 增加押金单 by nele
router.post('/createDeposit',auth.checkRole('deposit','modify'), function (req, res, next) {
    let deposit = new db.deposits();
    deposit.number = req.body.number;
    deposit.address= req.body.address;
    deposit.giveBackFlag=req.body.giveBackFlag;
    deposit.giveBackDone=req.body.giveBackDone;
    deposit.giveBackTime=req.body.giveBackDone?req.body.giveBackTime:'';

    deposit.boxedFlag=req.body.boxedFlag;
    deposit.boxedTime=req.body.boxedDone?req.body.boxedTime:'';
    deposit.boxedDone=req.body.boxedDone;

    deposit.time=Date.now();
    deposit.save(function (err, deposit) {
        db.addresses.update({_id:req.body.address},{
              deposit:deposit._id
        })
        .exec();
        res.redirect('/milkBox/deposit/show/' + deposit._id);
    });
});

// 显示押金单   by nele
router.get('/deposit/show/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.findById(req.params.id)
        .populate('address')
        .exec()
        .then(function (deposit) {
            res.render('milkBox/depositDetail', { title: '押金单详情', deposit: deposit });
        })
        .then(null, next);
});

//  修改押金单页面  by nele
router.get('/deposit/edit/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.findById(req.params.id)
        .populate('address')
        .exec()
        .then(function (deposit) {
            res.render('milkBox/depositEdit', { title: '押金单修改', deposit: deposit });
        })
        .then(null, next);
});

//  修改押金单页面  by nele
router.post('/deposit/edit/:id',auth.checkRole('deposit','modify'), function (req, res, next) {
    db.deposits.update({ _id: req.params.id },{
        number:req.body.number,
        address:req.body.address,
        giveBackFlag:req.body.giveBackFlag,
        giveBackDone:req.body.giveBackDone,
        giveBackTime:req.body.giveBackTime,
        boxedFlag:req.body.boxedFlag,
        boxedTime:req.body.boxedTime,
        boxedDone:req.body.boxedDone
    })
        .exec()
        .then(function () {
            res.send('ok');
        })
        .then(null,next);
});


//  回收押金单 by nele
router.post('/deposit/delete/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null,next);
});


// 显示押金单 返回json  by nele
router.get('/deposit/getDepositById/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.findById(req.params.id)
        .populate('address')
        .exec()
        .then(function (deposit) {
             res.json(deposit);
        })
        .then(null, next);
});


router.get('/action', auth.checkRole('gift', 'query'), function (req, res, next) {
    let query = db.stores.find({ gift: { $eq: null } });
    if (req.query.begin)
        query = query.where('time').gte(req.query.begin);
    if (req.query.end)
        query = query.where('time').lte(req.query.end);
    if (req.query.type)
        query = query.where({ operateType: req.query.type });
    if (req.query.milkbox)
        query = query.where({ milkBox: req.query.milkbox });
    new Promise(function (resolve, reject) {
        if (req.query.order)
        {
            db.orders.findOne({ number: req.query.order })
                .exec(function (err, data) {
                    if (err)
                        reject(err);
                    query = query.where({ order: data._id });
                    return resolve();
                });
        }
        else
            return resolve();
    })
        .then(function () {
            return _.clone(query)
                .count()
                .exec()
        })
        .then(function (count) {
            res.locals.count = count;
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('department order')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (data) {
            res.render('milkBox/action', { title: '进出库记录', stores: data });
        })
        .then(null, next);
});

router.get('/print/:id', function (req, res, next) {
    db.stores.findById(req.params.id)
        .populate('order department')
        .deepPopulate('order.address')
        .exec()
        .then(function (data) {
            res.render('milkBox/print', { layout: false, store: data });
        })
        .then(null, next);
});

router.get('/distribute', auth.checkRole('milkBox', 'modify'), function (req, res, next) {
    res.render('milkBox/distribute', { title: '装拆箱登记' });
});

router.post('/distribute', auth.checkRole('milkBox', 'modify'), function (req, res, next) {
    let store = new db.stores();
    if (!req.body.department)
        return res.send('请选择一个奶箱仓库');
    db.orders.findOne({ number: req.body.number })
        .exec()
        .then(function (order) {
            if (!order)
                return res.send('订单号不存在,请检查后再试!');
            store.order = order._id;
            store.time = new Date();
            store.count = req.body.count;
            store.department = req.body.department;
            store.hint = req.body.hint;
            store.operateType = req.body.type;
            store.milkbox = req.body.milkbox;
            store.save(function (err) {
                return Promise.resolve();
            });
        })
        .then(function () {
            res.redirect('/milkBox/action');
        })
        .then(null, next);
});

router.get('/storelist', function (req, res, next) {
    let ret = [];
    db.departments.find({ type: '奶箱仓库' })
        .exec()
        .then(function (data) {
            data.forEach(x => {
                ret.push({ id: x._id, title: x.title, count: 0 });
            });
            return Promise.all(ret.map(x => {
                    return db.stores.find({ department: x.id })
                        .exec();
                }));
        })
        .then(function (result) {
            for(let i = 0; i < ret.length; i++)
            {
                for(var j = 0; j < result[i].length; j++)
                {
                    if (result[i][j].operateType == '入库' || result[i][j].operateType == '转入' || result[i][j].operateType == '拆箱')
                        ret[i].count += result[i][j].count;
                    else
                        ret[i].count -= result[i][j].count;
                }
            }
            res.send(ret);
        })
        .then(null, next);
});

router.get('/feedback/:id', auth.checkRole('milkBox', 'modify'), function (req, res, next) {
    db.stores.findById(req.params.id)
        .exec()
        .then(function (data) {
            res.render('milkBox/feedback', { title: '追踪状态', store: data });
        })
        .then(null, next);
});

router.post('/feedback/:id', auth.checkRole('milkBox', 'modify'), function (req, res, next) {
    db.stores.findById(req.params.id)
        .exec()
        .then(function (store) {
            console.error(req.body.milkbox);
            return db.stores.update({ _id: req.params.id }, {
                    milkBox: req.body.milkbox,
                    feedback: (store.feedback || '跟进内容:') + '\r\n' + '当前状态: ' + req.body.milkbox + ' (' + res.locals.moment(new Date()).format('YYYY-MM-DD hh:mm:ss') + ')\r\n' + req.body.feedback
                })
                .exec();
        })
        .then(function () {
            res.redirect('/milkBox/action');
        })
        .then(null, next);
});

router.get('/day', auth.checkRole('milkBox', 'query'), function (req, res, next) {
    if (!req.query.time)
        req.query.time = new Date();
    let begin = new Date(res.locals.moment(req.query.time).format('YYYY-MM-DD') + ' 0:00:00');
    let end = new Date(res.locals.moment(req.query.time).format('YYYY-MM-DD') + ' 23:59:59');
    db.stores.find({
        gift: { $eq: null },
        operateType: {
            $in: ['装箱', '拆箱', '奶箱调换', '奶箱报废']
        },
        time: {
            $gte: begin,
            $lte: end
        }
    })
        .populate('department order')
        .deepPopulate('order.address')
        .exec()
        .then(function (data) {
            let result = _.groupBy(data.sort((a, b) => {
                    if (a.operateType == b.operateType)
                        return a.milkBox < b.milkBox;
                    return a.operateType < b.operateType;
                }), x => x.department.title);
            if (!req.query.raw)
                res.render('milkBox/day', { title: '奶箱装/拆/调换日报', data: result });
            else
                res.render('milkBox/dayRaw', { layout: false, data: result });
        })
        .then(null, next);
});

router.get('/statistics', auth.checkRole('milkBox', 'query'), function (req, res, next) {
    if (!req.query.time)
        req.query.time = new Date();
    let begin = new Date(res.locals.moment(req.query.time).format('YYYY-MM-DD') + ' 0:00:00');
    let end = new Date(res.locals.moment(req.query.time).format('YYYY-MM-DD') + ' 23:59:59');
    db.stores.find({
        gift: { $eq: null },
        time: {
            $gte: begin,
            $lte: end
        }
    })
        .populate('department')
        .exec()
        .then(function (data) {
            let result = {};
            data.forEach(x => {
                if (!result[x.department.title])
                {
                    result[x.department.title] = {};
                    result[x.department.title]['出库'] = 0;
                    result[x.department.title]['入库'] = 0;
                    result[x.department.title]['转入'] = 0;
                    result[x.department.title]['转出'] = 0;
                    result[x.department.title]['装箱'] = 0;
                    result[x.department.title]['奶箱调换'] = 0;
                    result[x.department.title]['奶箱报废'] = 0;
                    result[x.department.title]['拆箱'] = 0;
                }
                result[x.department.title][x.operateType] += x.count;
            });
            res.render('milkBox/statistics', { title: '日处理统计查询', result: result });
        })
        .then(null, next);
});

module.exports = router;