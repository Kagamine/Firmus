'use strict'
var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
    res.locals.call = true;
    next();
});

//
router.get('/',auth.checkRole('call','query'), function ( req, res, next) {
    let query = db.calls.find();
    
    _.clone(query)
    .count()
    .exec()
    .then(function (count) {
            console.log(count);
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
            .then(function (order) {
                    call.order = order[0]._id.id;
                    call.time = Date.now();
                    call.needFeedback = req.body.needFeedback;
                    call.isFeedbacked = req.body.isFeedbacked;
                    call.feedbackResult = req.body.feedbackResult;
                    call.hint = req.body.hint;
                    call.content = req.body.content;
                    call.type = req.body.type;
                    call.save(function (err, order) {
                        console.log(err);
                        res.redirect('/call');
                    });
                });
        })
    .then(null,next);

});

module.exports = router;