var express = require('express');
var router = express.Router();

router.use('/oauth', require('./oauth'));
router.use(require('./init'));
router.use(require('./shared'));
router.use('/general', require('./general'));

router.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (router.get('env') === 'development') {
    router.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            title: 'Error'
        });
    });
}

router.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err,
        title: 'Error'
    });
});

module.exports = router;
