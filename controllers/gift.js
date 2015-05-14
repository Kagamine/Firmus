'use strict'
var express = require('express');
var router = express.Router();
router.use(function (req, res, next) {
    res.locals.gift = true;
    next();
});

router.get('/', function (req, res, next) {
    res.redirect('/gift/promotion');
});

router.get('/promotion', auth.checkRole('promotion', 'query'), function (req, res, next) {
    let query = db.activities.find();
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .sort({ end: -1 })
                .skip(10 * (page - 1))
                .limit(10)
                .exec();
        })
        .then(function (activities) {
            res.render('gift/promotion', { activities: activities, title: '促销活动管理' });
        })
        .then(null, next);
});

module.exports = router;