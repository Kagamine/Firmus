'use strict'
var express = require('express');
var router = express.Router();
router.use(function (req, res, next) {
    res.locals.gift = true;
    next();
});

router.get('/', function (req, res, next) {
    res.redirect('/gift/promotion');
});

// 活动列表
router.get('/promotion', auth.checkRole('promotion', 'query'), function (req, res, next) {
    let query = db.activities.find();
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 10 - 1) / 10);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .sort({ end: -1 })
                .skip(10 * (page - 1))
                .limit(10)
                .exec();
        })
        .then(function (activities) {
            res.render('gift/promotion', { activities: activities, title: '促销活动管理' });
        })
        .then(null, next);
});

// 创建活动
router.post('/promotion/create', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    let activity = new db.activities();
    activity.title = '新建活动';
    activity.content = '<p>活动内容</p>';
    activity.summary = '活动内容';
    activity.discount = 0;
    activity.original = 0;
    activity.begin = Date.now();
    activity.end = Date.now();
    activity.gifts = [];
    activity.save(function (err, activity) {
        res.redirect('/gift/promotion/edit/' + activity._id);
    });
});

// 编辑活动
router.get('/promotion/edit/:id', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    db.activities.findById(req.params.id)
        .exec()
        .then(function (activity) {
            res.render('gift/promotionEdit', { title: '编辑活动 - ' + activity.title, activity: activity });
        })
        .then(null, next);
});

// 编辑活动
router.post('/promotion/edit/:id', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    let summary = req.body.content.replace(/<[^>]+>/g, '');
    if (summary.length >= 255)
        summary = summary.substring(0, 247) + '...';
    db.activities.update({ _id: req.params.id }, {
        title: req.body.title,
        content: req.body.content,
        summary: summary,
        begin: req.body.begin || Date.now(),
        end: req.body.end || Date.now(),
        original: req.body.original,
        discount: req.body.discount
    })
        .exec()
        .then(function () {
            if (req.files.file) {
                var writestream = db.gfs.createWriteStream({
                    filename: req.files.file.originalname
                });
                db.fs.createReadStream(req.files.file.path).pipe(writestream);
                writestream.on('close', function (file) {
                    db.activities.update({ _id: req.params._id }, { icon: file._id }).exec();
                    db.fs.unlink(req.files.file.path);
                    return Promise.resolve();
                });
            } else {
                return Promise.resolve();
            }
        })
        .then(function () {
            res.redirect('/gift/promotion/' + req.params.id);
        })
        .then(null, next);
});

// 查看活动
router.get('/promotion/:id', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    db.activities.findById(req.params.id)
        .populate('gifts')
        .exec()
        .then(function (activity) {
            res.render('gift/promotionShow', { title: activity.title, activity: activity });
        })
        .then(null, next);
});

// 赠品库存管理
router.get('/store', auth.checkRole('giftStore', 'query'), function (req, res, next) {
    let query = db.departments.find({ type: '赠品仓库' });
    if (req.query.city)
        query = query.where({ city: req.query.city });
    if (req.query.title)
        query = query.where({ title: new RegExp('.*' + req.query.title + '.*') });
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query.skip(50 * (page - 1)).limit(50).exec();
        })
        .then(function (stores) {
            res.locals.stores = stores;
            return db.departments
                .aggregate()
                .group({ _id: '$city' })
                .exec();
        })
        .then(function (cities) {
            res.locals.cities = cities.map(x => x._id);
            res.render('gift/store', { title: '赠品库存管理' });
        })
        .then(null, next);
});

// 赠品列表
router.get('/gift', auth.checkRole('gift', 'query'), function (req, res, next) {
    let query = db.gifts.find({ delete: false });
    let gifts;
    if (req.query.title)
        query = query.where({ title: req.query.title });
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query.skip(50 * (page - 1)).limit(50).exec();
        })
        .then(function (g) {
            gifts = g;
            return Promise.all(g.map(x => {
                    return db.stores
                        .aggregate()
                        .match({
                            gift: x._id,
                            operateType: {
                                $in: ['入库', '转入']
                            }
                        })
                        .group({
                            _id: '$gift',
                            total: {
                                $sum: '$count'
                            }
                        })
                        .exec();
                }));
        })
        .then(function (result) {
            for (var i = 0; i < gifts.length; i++)
                if (result[i][0])
                    gifts[i].count = result[i][0].total;
                else
                    gifts[i].count = 0;
            return Promise.all(gifts.map(x => {
                    return db.stores
                        .aggregate()
                        .match({
                            gift: x._id,
                            operateType: {
                                $nin: ['入库', '转入']
                            }
                        })
                        .group({
                            _id: '$gift',
                            total: {
                                $sum: '$count'
                            }
                        })
                        .exec();
                    }));

        })
        .then(function (result) {
            for (var i = 0; i < gifts.length; i++)
                if (result[i][0])
                    gifts[i].count -= result[i][0].total;
            res.render('gift/gift', { title: '赠品管理', gifts: gifts });
        })
        .then(null, next);
});

// 添加赠品
router.get('/gift/create', auth.checkRole('gift', 'modify'), function (req, res, next) {
    res.render('gift/create', { title: '添加赠品' });
});

// 添加赠品
router.post('/gift/create', auth.checkRole('gift', 'modify'), function (req, res, next) {
    let gift = new db.gifts();
    gift.title = req.body.title;
    gift.description = req.body.description;
    gift.count = 0;
    gift.delete = false;
    gift.save(function (err, gift) {
        if (req.files.file) {
            var writestream = db.gfs.createWriteStream({
                filename: req.files.file.originalname
            });
            db.fs.createReadStream(req.files.file.path).pipe(writestream);
            writestream.on('close', function (file) {
                db.fs.unlink(req.files.file.path);
                gift.picture = file._id;
                gift.save(function (err, gift) {
                    res.redirect('/gift/gift/' + gift._id);
                });
            });
        } else {
            res.redirect('/gift/gift/' + gift._id);
        }
    });
});

// 赠品详情
router.get('/gift/:id', auth.checkRole('gift', 'query'), function (req, res, next) {
    let store, tmp;
    db.gifts.findById(req.params.id)
        .populate({ path: 'income.store', select: '_id title' })
        .exec()
        .then(function (gift) {
            res.locals.gift = gift;
            store = {};
            gift.income.forEach(x => {
                if (x.store && x.store.city) {
                    if (!store[x.store.city + ' - ' + x.store.title]) store[x.store.title] = 0;
                    store[x.store.city + ' - ' + x.store.title] += x.count;
                }
            });
            tmp = [];
            for (let x in store)
                tmp.push(x);
            return Promise.all(tmp.map(x => {
                return db.giftDelivers.find({ giveBackDone: false })
                    .select('count')
                    .exec();
            }));
        })
        .then(function (delivers) {
            for (let i = 0; i < delivers.length; i++) {
                delivers[i].forEach(x => {
                    store[tmp[i]] -= x.count;
                });
            }
            res.render('gift/show', { title: res.locals.gift.title, store: store });
        })
        .then(null, next);
});

// 编辑赠品
router.get('/edit/:id', auth.checkRole('gift', 'modify'), function (req, res, next) {
    db.gifts.findById(req.params.id)
        .exec()
        .then(function (gift) {
            res.render('gift/giftEdit', { title: '编辑赠品 - ' + gift.title, gift: gift });
        })
        .then(null, next);
});

// 编辑赠品信息
router.post('/edit/:id', auth.checkRole('gift', 'modify'), function (req, res, next) {
    db.gift.update({ _id: req.params.id }, {
        title: req.body.title,
        description: req.body.description
    })
        .exec()
        .then(function () {
            if (req.files.file) {
                var writestream = db.gfs.createWriteStream({
                    filename: req.files.file.originalname
                });
                db.fs.createReadStream(req.files.file.path).pipe(writestream);
                writestream.on('close', function (file) {
                    db.fs.unlink(req.files.file.path);
                    db.gifts.update({ _id: req.params.id }, {
                        picture: file._id
                    }).exec();
                });
            } else {
                res.redirect('/gift/show/' + req.params.id);
            }
        })
        .then(null, next);
});

// 赠品分放
router.get('/deliver', auth.checkRole('deliver', 'query'), function (req, res, next) {
    let query = db.giftDelivers.find();
    if (req.query.department)
        query = query.where({ department: req.body.department });
    if (req.query.title)
        query = query.where({ 'gift.title': new RegExp('.*' + req.query.title + '.*') });
    if (req.query.begin)
        query = query.where('time').gte(Date.parse(req.query.begin));
    if (req.query.end)
        query = query.where('time').lte(Date.parse(req.query.end));
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 50 - 1) / 50);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (delivers) {
            res.render('gift/diliver', { title: '赠品分放记录', delivers: delivers });
        })
        .then(null, next);
});


// 根据赠品的标题获取增品返回json  by nele
router.get('/getGiftByName',auth.checkRole('gift','query'), function ( req, res, next) {
    db.gifts
        .aggregate()
        .match({ title: new RegExp('.*' + req.query.data + '.*')  })
        .group({_id:{title:'$title',id:'$_id'}})
        .exec()
        .then(function(data){
            res.json(data.map(x=>{
                return {
                    id:x._id.id,
                    data:x._id.title
                }
            }));
        })
        .then(null, next);
});

router.post('/delete/:id', auth.checkRole('gift', 'modify'), function (req, res, next) {
    db.gifts.update({ _id: req.params.id }, {
        delete: true
    })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null, next);
});

router.get('/promotion/gift/:id', auth.checkRole('promotion', 'modify'), function (req, res ,next) {
    db.activities.findById(req.params.id)
        .populate('gifts')
        .exec()
        .then(function (act) {
            res.render('gift/actgifts', { title: '活动赠品编辑', act: act });
        })
        .then(null, next);
});

router.post('/promotion/gift/:id/remove', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    db.activities.update({ _id: req.params.id }, {
        gifts: {
            $pull: {
                _id: req.body.giftid
            }
        }
    })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null, next);
});

router.post('/promotion/gift/:id/add', auth.checkRole('promotion', 'modify'), function (req, res, next) {
    let gid;
    db.gifts.find({ title: req.body.gift })
        .exec()
        .then(function (data) {
            if (data.length == 0)
            {
                res.statusCode = 404;
                return Promise.reject();
            }
            gid = data[0]._id;
            return db.activities.update({ _id: req.params.id }, {
                $push: {
                    gifts: gid
                }
            })
                .exec();
        })
        .then(function() {
            res.redirect('/gift/promotion/gift/' + req.params.id);
        })
        .then(null, next);
});

router.get('/action', auth.checkRole('gift', 'query'), function (req, res, next) {
    let query = db.stores.find({ gift: { $ne: null } });
    if (req.query.begin)
        query = query.where('time').gte(req.query.begin);
    if (req.query.end)
        query = query.where('time').lte(req.query.end);
    if (req.query.type)
        query = query.where({ operateType: req.query.type });
    new Promise(function (resolve, reject) {
        if (req.query.title) {
            db.gifts.find({ 'title': new RegExp('.*' + req.query.title + '.*') })
                .exec(function (err, data) {
                    query = query.where({ gift: { $in: data.map(x => x._id) } });
                    return resolve();
                });
        } else {
            return resolve();
        }
    })
        .then(function () {
            if (req.query.order)
            {
                db.orders.findOne({ number: req.query.order })
                    .exec(function (err, data) {
                        query = query.where({ order: data._id });
                        return Promise.resolve();
                    });
            }
            else
                return Promise.resolve();
        })
        .then(function () {
            return _.clone(query)
                .count()
                .exec()
        })
        .then(function (count) {
            res.locals.count = count;
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query
                .populate('department gift order')
                .skip(50 * (page - 1))
                .limit(50)
                .exec();
        })
        .then(function (data) {
            res.render('gift/action', { title: '进出库记录', stores: data });
        })
        .then(null, next);
});

router.get('/store/:id', auth.checkRole('gift', 'query'), function (req, res, next) {
    db.stores.find({ gift: req.params.id })
        .populate('department gift')
        .exec()
        .then(function (data) {
            let result = {};
            data.forEach(x => {
                if (!result[x.department.title])
                    result[x.department.title] = 0;
                if (x.operateType == '入库' || x.operateType == '转入')
                    result[x.department.title] += x.count;
                else
                    result[x.department.title] -= x.count;
            });
            res.render('gift/storeDetail', { title: '查询库存', result: result });
        })
        .then(null, next);
});

router.get('/check', auth.checkRole('gift', 'query'), function (req, res, next) {
    let query = db.stores.find({ gift: { $ne: null } });

    if (req.query.time)
        query = query.where('time').lte(new Date(req.query.time));

    query
        .populate('department gift')
        .exec()
        .then(function (data) {
            let result = {};
            let types = {};
            data.forEach(x => {
                if (!result[x.department.title])
                    result[x.department.title] = {};
                if (!types[x.gift.title])
                    types[x.gift.title] = 0;
                if (!result[x.department.title][x.gift.title])
                    result[x.department.title][x.gift.title] = 0;
                if (x.operateType == '入库' || x.operateType == '转入')
                    result[x.department.title][x.gift.title] += x.count;
                else
                    result[x.department.title][x.gift.title] -= x.count;
            });

            res.render('gift/storeCheck', { title: '赠品盘点', result: result, types: types });
        })
        .then(null, next);
});

router.get('/day', auth.checkRole('gift', 'query'), function (req, res, next) {
    let query = db.stores.find({ gift: { $ne: null } });

    if (!req.query.time)
        req.query.time = new Date();
    let begin = Date.parse(res.locals.moment(req.query.time).format('YYYY-MM-DD') + ' 0:00:00');
    let end = Date.parse(res.locals.moment(req.query.time).format('YYYY-MM-DD') + ' 23:59:59');
    query = query.where('time').gte(begin);
    query = query.where('time').lte(end);
    query
        .populate('department gift')
        .exec()
        .then(function (data) {
            let result = {};
            let types = {};
            data.forEach(x => {
                if (!result[x.department.title])
                    result[x.department.title] = {};
                if (!types[x.gift.title])
                    types[x.gift.title] = 0;
                if (!result[x.department.title][x.gift.title])
                {
                    result[x.department.title][x.gift.title] = {};
                    result[x.department.title][x.gift.title].in = 0;
                    result[x.department.title][x.gift.title].out = 0;
                }
                if (x.operateType == '入库' || x.operateType == '转入')
                    result[x.department.title][x.gift.title].in += x.count;
                else
                    result[x.department.title][x.gift.title].out += x.count;
            });

            res.render('gift/storeDay', { title: '日处理查询', result: result, types: types });
        })
        .then(null, next);
});

router.get('/distribute', auth.checkRole('gift', 'modify'), function (req, res, next) {
    res.render('gift/distribute', { title: '赠品配送录入' });
});

router.post('/distribute', auth.checkRole('gift', 'modify'), function (req, res, next) {
    let store = new db.stores({ gift: { $ne: null } });
    let ObjectID = db.mongoose.mongo.BSONPure.ObjectID;
    if (!req.body.gift)
        return res.send('赠品选择不合法!请重试!');
    if (!req.body.department)
        return res.send('赠品仓库选择不合法,请重试!');
    db.orders.findOne({ number: req.body.number })
        .exec()
        .then(function (order) {
            if (!order)
                return res.send('订单没有找到,请检查后再试');
            store.gift = ObjectID(req.body.gift);
            store.department = ObjectID(req.body.department);
            store.count = req.body.count;
            store.hint = req.body.hint;
            store.time = new Date();
            store.operateType = req.body.type;
            store.order = order._id;
            store.save(function (err) {
                res.redirect('/gift/action');
            });
        })
        .then(null, next);
});

router.get('/storelist', function (req, res, next) {
    db.departments.find({ type: '赠品仓库' })
        .exec()
        .then(function (data) {
            let ret = [];
            data.forEach(x => {
                ret.push({id: x._id, title: x.title});
            });
            res.send(ret);
        })
        .then(null, next);
});

router.get('/giftlist', function (req, res ,next) {
    db.stores.find({ department: req.query.department })
        .populate('gift')
        .exec()
        .then(function (data) {
            let statistics = {};
            let dic = {};
            data.forEach(x => {
                if (!statistics[x.gift._id])
                {
                    statistics[x.gift._id] = 0;
                    dic[x.gift._id] = x.gift.title;
                }
                if (x.operateType == '入库' || x.operateType == '转入')
                    statistics[x.gift._id] += x.count;
                else
                    statistics[x.gift._id] -= x.count;
            });
            let ret = [];
            for (var x in statistics)
            {
                if (statistics[x] > 0)
                    ret.push({ title: dic[x], id: x });
            }
            res.send(ret);
        })
        .then(null, next);
});

router.get('/print/:id', function (req, res, next) {
    db.stores.findById(req.params.id)
        .populate('department order gift')
        .deepPopulate('order.address')
        .exec()
        .then(function (data) {
            res.render('gift/print', { store: data, layout: false });
        })
        .then(null, next);
});

router.get('/feedback/:id', auth.checkRole('gift', 'query'), function (req, res, next) {
    db.stores.findById(req.params.id)
        .exec()
        .then(function (data) {
            res.render('gift/feedback', { title: '赠品回访记录', store: data });
        })
        .then(null, next);
});

router.post('/feedback/:id', auth.checkRole('gift', 'query'), function (req, res, next) {
    db.stores.update({ _id: req.params.id }, {
        feedback: req.body.feedback
    })
        .exec()
        .then(function () {
            res.redirect('/gift/action');
        })
        .then(null, next);
});

router.get('/query', function (req, res, next) {
    res.render('gift/query', { title: '赠品综合查询' });
});

module.exports = router;