'use strict'
var express = require('express');
var router = express.Router();
var crypto = require('../lib/cryptography');
var fs = require('fs');

router.get('/', function (req, res, next) {
    res.render('mobile/index', { title: '登录' });
});

module.exports = router;