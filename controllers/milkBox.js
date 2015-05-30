'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.milkBox = true;
    next();
});


router.get('/deposit',auth.checkRole('deposit','query'), function ( req, res,next) {
    let query = db.deposits.find();
    if(req.query.giveBackFlag)
        query =  query.where({'giveBackFlag':req.query.giveBackFlag});
    if (req.query.begin)
        query = query.where('time').gte(Date.parse(req.query.begin));
    if (req.query.end)
        query = query.where('time').lte(Date.parse(req.query.end));

    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('address')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (deposits) {
            res.locals.deposits = deposits;
            res.render('milkBox/deposit',{title:'押金管理'});
        })
        .then(null,next);

});

// 创建押金单页面 by nele
router.get('/createDeposit',auth.checkRole('deposit','modify'), function (req, res, next) {
     res.render('milkBox/createDeposit',{title:'创建押金单'});
});

// 增加押金单 by nele
router.post('/createDeposit',auth.checkRole('deposit','modify'), function (req, res, next) {
    let deposit = new db.deposits();
    deposit.number = req.body.number;
    deposit.address= req.body.address;
    deposit.giveBackFlag=req.body.giveBackFlag;
    deposit.giveBackDone=req.body.giveBackDone;
    deposit.giveBackTime=req.body.giveBackTime;
    deposit.time=Date.now();
    deposit.save(function (err, deposit) {
        res.redirect('/milkBox/deposit/show/' + deposit._id);
    });
});

// 显示押金单   by nele
router.get('/deposit/show/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.findById(req.params.id)
        .populate('address')
        .exec()
        .then(function (deposit) {
            res.render('milkBox/depositDetail', { title: '押金单详情', deposit: deposit });
        })
        .then(null, next);
});

//  修改押金单页面  by nele
router.get('/deposit/edit/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.findById(req.params.id)
        .populate('address')
        .exec()
        .then(function (deposit) {
            res.render('milkBox/depositEdit', { title: '押金单修改', deposit: deposit });
        })
        .then(null, next);
});

//  修改押金单页面  by nele
router.post('/deposit/edit/:id',auth.checkRole('deposit','modify'), function (req, res, next) {
    db.deposits.update({ _id: req.params.id },{
        number:req.body.number,
        address:req.body.address,
        giveBackFlag:req.body.giveBackFlag,
        giveBackDone:req.body.giveBackDone,
        giveBackTime:req.body.giveBackTime
    })
        .exec()
        .then(function () {
            res.send('ok');
        })
        .then(null,next);
});


//  回收押金单 by nele
router.post('/deposit/delete/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null,next);
});


// 显示押金单 返回json  by nele
router.get('/deposit/getDepositById/:id',auth.checkRole('deposit','query'), function (req, res, next) {
    db.deposits.findById(req.params.id)
        .populate('address')
        .exec()
        .then(function (deposit) {
             res.json(deposit);
        })
        .then(null, next);
});

module.exports = router;