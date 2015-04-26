var express = require('express');
var router = express.Router();

router.get('/login', auth.guest, function(req, res, next) {
    res.render('shared/login', { layout: false, title: '登录' });
});

router.get('/test', function (req, res, next) {
    res.render('home/index', { title: '123', message: '123', error: '123' });
});

module.exports = router;
