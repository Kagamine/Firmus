'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.milkBox = true;
    next();
});


router.get('/',auth.checkRole('deposit','query'), function ( req, res,next) {
    let query = db.departments.find();
    if(req.query.giveBackFlag){

    }
    res.render('milkBox/deposit',{title:'押金管理'});
});


module.exports = router;