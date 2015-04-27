'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.general = true;
    next();
});

// 新闻列表
router.get('/news', auth.checkRole('news', 'query'), function (req, res, next) {
    db.news.find()
        .sort({ time: -1 })
        .skip(10 * (req.query.p - 1))
        .limit(10)
        .exec()
        .then(function (news) {
            res.locals.news = news;
            return db.news.count().exec();
        })
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            res.render('general/news', { title: '新闻公告' });
        })
        .then(null, next);
});

// 展示新闻内容
router.get('/news/:id', auth.checkRole('news', 'query'), function (req, res, next) {
    db.news.findById(req.params.id)
        .select('_id title time content')
        .exec()
        .then(function (news) {
            if (news)
                res.render('general/newsShow', { title: news.title, news: news });
            else
            {
                res.status(404);
                next();
            }
        })
        .then(null, next);
});

// 发布新闻
router.post('/news/create', auth.checkRole('news', 'modify'), function (req, res, next) {
    let news = new db.news();
    news.title = '新建新闻';
    news.content = '<p>请在此处填写新闻内容</p>';
    news.summary = '请在此处填写新闻内容';
    news.time = Date.now();
    news.save(function (err, news) {
        res.redirect('/general/news/edit/' + news._id);
    });
});

// 删除新闻
router.post('/news/delete/:id', auth.checkRole('news', 'modify'), function (req, res, next) {
    db.news.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.redirect('/general/news');
        })
        .then(null, next);
});

// 修改新闻
router.get('/news/edit/:id', auth.checkRole('news', 'modify'), function (req, res, next) {
    db.news.findById(req.params.id)
        .select('_id title content')
        .exec()
        .then(function (news) {
            res.render('general/newsEdit', { title: '编辑新闻', news: news });
        })
        .then(null, next);
});

// 修改文章
router.post('/news/edit/:id', auth.checkRole('news', 'modify'), function (req, res, next) {
    let summary = req.body.content.replace(/<[^>]+>/g, '');
    if (summary.length >= 255)
        summary = summary.substring(0, 247) + '...';
    db.news.update({ _id: req.params.id }, {
        title: req.body.title,
        content: req.body.content,
        sumamry: summary
    })
        .exec()
        .then(function () {
            res.redirect('/general/news/' + req.params.id);
        })
        .then(null, next);
});

// 部门列表
router.get('/department', auth.checkRole('department', 'modify'), function (req, res, next) {
    db.departments.find();
});

module.exports = router;
