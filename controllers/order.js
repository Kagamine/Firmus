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
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('address milkStation')
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
    order.save(function (err, order) {
        res.redirect('/order/show/' + order._id);
    });
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
        number: req.body.number,
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

// 获取订单某日需配送瓶数
function getDistributeCount (order, time) {
    let ret = order.distributeCount;
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let dend = new Date(order.end.getFullYear(), order.end.getMonth(), order.end.getDate());
    let tmp = new Date();
    let today = new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
    dend.setDate(dend.getDate() + 1);
    if (order.type == '天天送') {
        order.changes.forEach(x => {
            if (x.type == '停送') {
                if (dbeg <= time && time < dend)
                    ret -= x.count;
            } else if (x.type == '加送') {
                if (dbeg <= time && time < dend)
                    ret += x.count;
            }
        });
    } else if (order.type == '隔天送') {
        let i = 0;
        while (_.clone(dbeg).setDate(dbeg.getDate() + i) <= today) {
            if (i % 2 == 1 && _.clone(dbeg).setDate(dbeg.getDate() + i) == today)
                ret = 0;
        }
    } else {

    }
    return ret;
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
                tmp[x].forEach(y => {
                    let cnt = getDistributeCount(y, Date.now());
                    if (cnt > 0) {
                        if (!ret[x][y.milkType])
                            ret[x][y.milkType] = cnt;
                        else
                            ret[x][y.milkType] += cnt;
                    }
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
                    o.forEach(z => {
                        let cnt = getDistributeCount(z, Date.now());
                        if (cnt > 0) {
                            if (!ret[x][y][z.milkType]) ret[x][y][z.milkType] = 0;
                            ret[x][y][z.milkType] += cnt;
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
                tmp[x].forEach(y => {
                    let cnt = getDistributeCount(y, Date.now());
                    if (cnt > 0) {
                        if (!ret[x][y.milkType]) ret[x][y.milkType] = 0;
                        ret[x][y.milkType] += cnt;
                    }
                });
            }
            console.log(ret);
            res.render('order/distributeStation', { title: '奶站配送日报', report: ret });
        })
        .then(null, next);

});

module.exports = router;