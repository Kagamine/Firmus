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
    new Promise(function (resolve, reject) {
        if (req.query.user) {
            db.users.find({ name: new RegExp('.*' + req.query.user + '.*') })
                .exec(function (err, data) {
                    console.error(data);
                    if (err)
                        return reject(err);
                    if (!data)
                        query = query.where({ 'name': null });
                    else
                        query = query.where({ user: { $in: data.map(x => x._id) } });
                    return resolve();
                });
        }
        else {
            return resolve();
        }
    })
        .then(function() {
            if (req.query.needFeedback)
                query = query.where({ needFeedback: req.query.needFeedback });
            if (req.query.begin)
                query = query.where('time').gte(Date.parse(req.query.begin));
            if (req.query.end)
                query = query.where('time').lte(Date.parse(req.query.end));
            if (req.query.type)
                query = query.where('type').eq(req.query.type);
            return _.clone(query)
                .count()
                .exec()
        })
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
    call.user = req.session.uid;
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
                    call.feedbackResult = req.body.isFeedbacked?req.body.feedbackResult:'';
                    call.hint = req.body.hint;
                    call.content = req.body.content;
                    call.type = req.body.type;
                    call.result = req.body.result;
                    call.save(function (err, calls) {
                        res.redirect('/call');
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
            if (!req.query.raw)
                res.render('call/callDetail', { title: '来电信息详情', call: call });
            else
                res.render('call/callDetailRaw', { layout: false,call: call  });
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
            res.render('call/callEdit', { title: '来电信息修改', call: call });
        })
        .then(null, next);
});

//  修改来电信息  by  nele
router.post('/edit/:id', auth.checkRole('call','modify'), function (req, res, next) {
    db.calls.update({ _id: req.params.id },{
            user:req.session.uid,
            needFeedback: req.body.needFeedback,
            isFeedbacked: req.body.isFeedbacked,
            feedbackResult: req.body.feedbackResult,
            hint: req.body.hint,
            content: req.body.content,
            type: req.body.type,
            result: req.body.result,
        })
        .exec()
        .then(function() {
            res.send('ok');
        }, next);
});

//   删除来电  by nele
router.post('/delete/:id',auth.checkRole('call','modify'), function ( req, res, next) {
    db.calls.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null,next);
});

//  来电回访  by nele
router.get('/callback',auth.checkRole('call','query'), function (req, res, next) {
    let query = db.calls.find();
    query = query.where({'needFeedback':true});
    new Promise(function(resolve, reject) {
        if (req.query.user) {
            db.users.find()
                .where({ name: new RegExp('.*' + req.query.user + '.*'), role: '业务员'})
                .exec(function(err, data) {
                    if (err)
                        return reject(err);
                    if (!data)
                        query = query.where({ _id: null });
                    else
                        query = query.where({ _id: { $in: data.map(x => x._id) } })
                });
        }
        return resolve();
    })
        .then(function () {
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
            if (req.query.isFeedbacked)
                query = query.where({ isFeedbacked: req.query.isFeedbacked });
            if (req.query.begin)
                query = query.where('time').gte(Date.parse(req.query.begin));
            if (req.query.end)
                query = query.where('time').lte(Date.parse(req.query.end));

            return _.clone(query)
                .count()
                .exec()
        })
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
            res.render('call/callBack', { title: '来电信息回访管理' });
        })
        .then(null,next);
});

// 顺延管理 by nele
router.get('/postpone',auth.checkRole('call','query'), function ( req, res, next) {
       res.render('call/postpone',{ title: '顺延管理' });
});

// 增加顺延  by  nele
router.get('/createPostpone',auth.checkRole('call','query') , function (req ,res ,next) {
    res.render('call/createPostpone',{ title: '增加顺延' });
});

// 增加顺延  by  nele
router.post('/createPostpone',auth.checkRole('call','query') , function (req ,res ,next) {
    let now = Date.now(); //TODO: 计算最后一天送奶日
    let query = db.orders.find();
    query.where('begin').lte(now);
    db.orders.update(query,{
        $push: {
            changes: {
                user: req.session.uid,
                time: Date.now(),
                type: enums.orderChangeType.顺延,
                begin: req.body.begin,
                end: req.body.end,
                hint: req.body.hint
            }
        }
    },{multi: true})
        .exec()
        .then(function () {
            res.redirect('/call/postpone');
        })
        .then(null,next);
});

router.get('/orderChange',auth.checkRole('order','modify'), function (req,res,next) {
       res.render('call/orderChange',{ title: '订单变更' });
});

router.post('/orderChange',auth.checkRole('order','modify'), function (req,res,next) {
       var number = req.body.number;
      db.orders.findOne({'number':number})
    .exec()
    .then(function (order) {
              if(order==null)
                  res.redirect("/message?msg="+encodeURIComponent('你输入的订单好不存在'))
              else{
                  res.redirect('/order/change/'+order._id);
              }
          })
    .then(null,next);
});

router.get('/statistics', auth.checkRole('call','query'), function(req, res, next) {
    if (!req.query.begin || !req.query.end) {
        return res.render('call/statistics', { title: '来电统计' });
    }

    let query = db.calls.find();
    if (req.query.begin)
        query = query.where('time').gte(new Date(req.query.begin));
    if (req.query.end)
        query = query.where('time').lte(new Date(req.query.end));
    query.populate('user')
        .exec()
        .then(function (data) {
            let tmp1 = _.groupBy(data, x => x.type);
            let types = [];
            for(var x in tmp1)
                types.push(x);
            let statistics = {};
            let tmp2 = _.groupBy(data, x => x.user.name);
            for(var x in tmp2)
            {
                if (!statistics[x])
                    statistics[x] = {};
                types.forEach(y => {
                    if (!statistics[x][y])
                        statistics[x][y] = {};
                    statistics[x][y].count = data.filter(z => z.user.name == x && z.type == y).length;
                    statistics[x][y].notdeal = data.filter(z => z.user.name == x && z.type == y && x.needFeedback && !x.isFeedbacked).length;
                });
            }
            res.render('call/statistics', { title: '来电统计', statistics: statistics, types: types });
        })
        .then(null, next);

});

module.exports = router;