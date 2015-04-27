var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.general = true;
});

router.get('/news', auth.checkRole('news', 'query'), function (req, res, next) {

});

module.exports = router;
