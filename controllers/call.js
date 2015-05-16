'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.call = true;
    next();
});

//  来电受理管理   by nele
router.get('/',auth.checkRole('call','query'), function ( req, res, next) {
    let query = db.calls.find();
    if (req.query.user) {
        db.users
            .aggregate()
            .match({name: new RegExp('.*' + req.query.data + '.*'), role: '业务员'})
            .group({_id:{id:'$_id'}})
            .exec()
            .then(function (users) {
                query = query.where({ user: users[0]._id });
            });
    }
    if (req.query.needFeedback)
        query = query.where({ needFeedback: req.query.needFeedback });

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
                .populate('user order')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (calls) {
            res.locals.calls = calls;
            res.render('call/index', { title: '来电受理管理' });
        })
    .then(null,next);
});


// 创建来电信息 by nele
router.get('/create', auth.checkRole('call', 'modify'), function (req, res, next) {
    res.render('call/callCreate', { title: '增加来电信息' });
});

// 创建来电信息 by nele
router.post('/create', auth.checkRole('call', 'modify'), function (req, res, next) {
    let call = new db.calls();
    db.users
    .aggregate()
    .match({name:req.body.user,role:'业务员'})
        .group({_id:{name:'$name',id:'$_id'}})
    .exec()
    .then(function (user) {
            call.user = user[0]._id.id;
            db.orders
            .aggregate()
            .match({number:req.body.order})
            .group({_id:{id:'$_id'}})
            .exec()
            .then(function (calls) {
                    call.order = calls[0]._id.id;
                    call.time = Date.now();
                    call.needFeedback = req.body.needFeedback;
                    call.isFeedbacked = req.body.isFeedbacked;
                    call.feedbackResult = req.body.feedbackResult;
                    call.hint = req.body.hint;
                    call.content = req.body.content;
                    call.type = req.body.type;
                    call.save(function (err, calls) {
                        res.redirect('/call');
                    });
                });
        })
    .then(null,next);

});

//   展示来电详细 by nele
router.get('/show/:id',auth.checkRole('call','query'), function ( req, res, next) {
    db.calls.findById(req.params.id)
        .populate('user')
        .populate('order')
        .exec()
        .then(function (call) {
            res.render('call/callDetail', { title: '来电详情', call: call });
        })
        .then(null, next);
});


//  修改来电信息  by  nele
router.get('/edit/:id',auth.checkRole('call','modify'), function ( req, res, next) {
    db.calls.findById(req.params.id)
        .populate('user')
        .populate('order')
        .exec()
        .then(function (call) {
            res.render('call/callEdit', { title: '来电修改', call: call });
        })
        .then(null, next);
});

//  修改来电信息  by  nele
router.post('/edit/:id', auth.checkRole('call','modify'), function (req, res, next) {
    var user =  "";
    db.users
        .aggregate()
        .match({name:req.body.user,role:'业务员'})
        .group({_id:{name:'$name',id:'$_id'}})
        .exec()
        .then(function (user) {
            user = user[0]._id.id;
            db.orders
                .aggregate()
                .match({number:req.body.order})
                .group({_id:{id:'$_id'}})
                .exec()
                .then(function (calls) {
                    var order =calls[0]._id.id;
                    db.calls.update({ _id: req.params.id },{
                        user:user,
                        order:order,
                        needFeedback: req.body.needFeedback,
                        isFeedbacked: req.body.isFeedbacked,
                        feedbackResult: req.body.feedbackResult,
                        hint: req.body.hint,
                        content: req.body.content,
                        type: req.body.type
                })
                 .exec()
                        .then(function () {
                            res.send('ok');
                        });
        });
        })
    .then(null,next);
});




module.exports = router;