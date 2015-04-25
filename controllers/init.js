var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var xss = GLOBAL.xss = require('../middlewares/xss');

GLOBAL.auth = require('../middlewares/auth');
router.use(csrf());
router.use(function (req, res, next) {
    res.locals.res = res;
    res.locals.req = req;
    res.locals.moment = require('moment');
    res.locals.enums = require('../models/enums');
    res.locals._ = _;
    res.locals.xss = xss;
    res.locals.csrf = req.csrfToken();
    db.users.findById(req.session.uid)
        .exec()
        .then(function (user) {
        res.locals.currentUser = user;
        next();
    }, next);
});

module.exports = router;
