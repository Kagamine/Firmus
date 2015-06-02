'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.milkBox = true;
    next();
});

router.get('/',auth.checkRole('milkBox','query'), function ( req, res, next) {
    let query = db.departments.find();
    if (req.query.title)
        query = query.where({ title: new RegExp('.*' + req.query.title + '.*') });
    query  =  query.where({type: '奶箱仓库'});
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.query.p || 1;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .skip(50 * (page - 1))
                .limit(50)
                .populate('user')
                .exec();
        })
        .then(function (departments) {
            res.locals.departments = departments;
            return Promise.all(departments.map(x => {
                return db.users.findOne({ department: x._id, role: '部门主管' }).select('name').exec();
            }));
        })
        .then(function (users) {
            for (let i = 0; i < users.length; i++) {
                if (users[i])
                    res.locals.departments[i].master = users[i].name;
                else
                    res.locals.departments[i].master = '未指派';
            }
            return Promise.all(res.locals.departments.map(x => {
                return db.users.find({ department: x._id }).count().exec();
            }));
        })
        .then(function (counts) {
            for (let i = 0; i < counts.length; i++) {
                res.locals.departments[i].count = counts[i];
            }
            res.render('milkBox/index', { title: '奶箱管理' });
        })
        .then(null, next);
});


router.get('/deposit',auth.checkRole('deposit','query'), function ( req, res,next) {
    let query = db.deposits.find();

    if(req.query.giveBackFlag)
        query =  query.where({'giveBackFlag':req.query.giveBackFlag});
    if(req.query.boxedFlag)
        query =  query.where({'boxedFlag':req.query.boxedFlag});
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
            res.render('milkBox/deposit',{title:'押金单管理'});
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

    deposit.boxedFlag=req.body.boxedFlag;
    deposit.boxedTime=req.body.boxedTime;
    deposit.boxedDone=req.body.boxedDone;

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
        giveBackTime:req.body.giveBackTime,
        boxedFlag:req.body.boxedFlag,
        boxedTime:req.body.boxedTime,
        boxedDone:req.body.boxedDone
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