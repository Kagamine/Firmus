var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.general = true;
});

router.get('/news', auth.checkRole('news', 'query'), function (req, res, next) {
    db.news.find()
        .sort({ time: -1 })
        .skip(10 * (req.query.p - 1))
        .limit(10)
        .exec()
        .then(function (news) {
            res.render('general/news', { title: '新闻公告', news: news });
        })
        .then(null, next);
});

module.exports = router;
