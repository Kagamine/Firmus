'use strict'
var express = require('express');
var router = express.Router();
var crypto = require('../lib/cryptography');

router.get('/', function (req, res, next) {
    if (!req.session.uid) res.redirect('/login');
    else res.redirect('/general/news');
});

router.get('/login', auth.guest, function(req, res, next) {
    res.render('shared/login', { layout: false, title: '登录' });
});

router.post('/login', auth.guest, function (req, res, next) {
    db.users.findOne({ username: req.body.username })
        .select('username password salt _id role department')
        .exec()
        .then(function (user) {
            if (!user) {
                return res.redirect('/login');
            }
            let pwd = crypto.sha256(req.body.password, user.salt);
            if (pwd == user.password)
            {
                req.session.uid = user._id;
                req.session.user = user;
                res.redirect('/general/news');
            }
            else
            {
                res.redirect('/login');
            }
        })
        .then(null, next);
});

router.get('/logout', function (req, res, next) {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
