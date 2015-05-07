'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.order = true;
    next();
});

router.get('/', auth.checkRole('order', 'query'), function (req, res, next) {
    res.render('order/index', { title: 'test' });
});

module.exports = router;