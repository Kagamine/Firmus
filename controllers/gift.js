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

// 活动列表
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

// 创建活动
router.post('/promotion/create', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    let activity = new db.activities();
    activity.title = '新建活动';
    activity.content = '<p>活动内容</p>';
    activity.summary = '活动内容';
    activity.discount = 0;
    activity.original 0 ;
    activity.begin = Date.now();
    activity.end = Date.now();
    activity.gifts = [];
    activity.save(function (err, activity) {
        res.redirect('/promotion/edit/' + activity._id);
    });
});

// 编辑活动
router.get('/promotion/edit/:id', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    db.activities.findById(req.params.id)
        .exec()
        .then(function (activity) {
            res.render('gift/promotionEdit', { title: '编辑活动 - ' + activity.title, activity: activity });
        })
        .then(null, next);
});

module.exports = router;