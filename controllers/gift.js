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
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
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
        res.redirect('/promotion/edit/' + activity._id);
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
        .then(function (gifts) {
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

module.exports = router;