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
    if (req.query.user){
        query = query.where({ name: req.query.user });
    }
    if(req.query.needFeedback){
        query = query.where({ needFeedback:req.query.needFeedback });
    }

    _.clone(query)
    .count()
    .exec()
    .then(function (count) {

        })
    .then(null,next);
});


// 创建来电信息 by nele
router.get('/create', auth.checkRole('call', 'modify'), function (req, res, next) {
    res.render('call/callCreate', { title: '增加来电信息' });
});

// 创建来电信息 by nele
router.post('/create', auth.checkRole('call', 'modify'), function (req, res, next) {
    db.users
    .aggregate()
    .match({name:req.body.user,role:'业务员'})
        .group({_id:{name:'$name',id:'$_id'}})
    .exec()
    .then(function (user) {
            console.log(user);
            let call = new db.calls();
            call.user = user[0]._id.id;
            call.order = req.body.order;
            call.time = Date.now();
            call.needFeedback = req.body.needFeedback;
            call.isFeedbacked = req.body.isFeedbacked;
            call.feedbackResult = req.body.feedbackResult;
            call.hint = req.body.hint;
            call.content = req.body.content;
            call.type = req.body.type;
            call.save(function (err, order) {
                res.redirect('/call');
            });
        })
    .then(null,next);

});

module.exports = router;