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
        res.redirect('/order/' + order._id);
    });
});

router.get('/distribute', auth.checkRole('distribute', 'query'), function (req, res, next) {
    db.orders.find({
        begin: { $lte: Date.now() },
        end: { $gte: Date.now() }
    })
        .exec()
        .then(function (orders) {
            let tmp = _.group(orders, 'city');
            console.log(tmp);
        })
        .then(null, next);
});

module.exports = router;