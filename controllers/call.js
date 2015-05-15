'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.call = true;
    next();
});

// 创建来电信息 by nele
router.get('/create', auth.checkRole('call', 'modify'), function (req, res, next) {
    res.render('call/callCreate', { title: '增加来电信息' });
});

// 创建来电信息 by nele
router.post('/create', auth.checkRole('call', 'modify'), function (req, res, next) {
    let call = db.calls();
    call.user = req.body.user;
    call.order = req.body.order;
    call.time = Date.now();
    call.needFeedback = req.body.needFeedback;
    call.isFeedbacked = req.body.isFeedbacked;
    call.feedbackResult = req.body.feedbackResult;
    call.hint = req.body.hint;
    call.content = req.body.content;
    call.type = req.body.type;
    call.save(function (err, order) {
        res.redirect('/call');
    });
});

module.exports = router;