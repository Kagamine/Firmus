'use strict'
var express = require('express');
var router = express.Router();
var crypto = require('../lib/cryptography');
var fs = require('fs');

function getEndDistributeDate (order, changes)
{
    console.log(order);
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let ret;
    let count = order.count;
    let unknownChangesRaw = changes.filter(x => x.type == '停止送奶' || x.type == '恢复送奶');
    let unknownChanges = [];
    for (let i = 0; i < unknownChangesRaw.length; i += 2)
    {
        if (i + 1 < unknownChangesRaw.length)
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: unknownChangesRaw[i].end });
        }
        else
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: new Date(2099, 0, 1) });
        }
    }
    if (order.distributeMethod == '天天送')
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret || x.type == '整单停送' && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            count -= x.count;
        else if (x.type == '停送')
            count += x.count;
        else if (x.type == '整单停送')
            count += order.distributeCount;
        });
            if (unknownChanges.some(x => x.begin <= ret && x.end > ret))
            count += order.distributeCount;
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret || x.type == '整单停送' && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            count -= x.count;
        else if (x.type == '停送')
            count += x.count;
        else if (x.type == '整单停送')
            count += order.distributeCount;
        });
            if (unknownChanges.some(x => x.begin <= ret && x.end > ret))
            count += order.distributeCount;
        }
    }
    else
    {
        for (ret = dbeg; count > 0; ret.setDate(ret.getDate() + 1))
        {
            if (ret.getDay() == 6 || ret.getDay() == 0) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= ret && x.end >= ret || x.type == '整单停送' && x.begin <= i && x.end >= i);
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            count -= x.count;
        else if (x.type == '整单停送')
            count += x.count;
        else if (x.type == '整单停送')
            count += order.distributeCount;
        });
            if (unknownChanges.some(x => x.begin <= ret && x.end > ret))
            count += order.distributeCount;
        }
    }
    return ret;
}

// 获取订单某日需配送瓶数
function getDistributeCount (order, changes, time) {
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let tmp = new Date();
    time = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    let ret, cnt = 0;
    let count = order.count;
    let unknownChangesRaw = changes.filter(x => x.type == '停止送奶' || x.type == '恢复送奶');
    let unknownChanges = [];
    for (let i = 0; i < unknownChangesRaw.length; i += 2)
    {
        if (i + 1 < unknownChangesRaw.length)
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: unknownChangesRaw[i].end });
        }
        else
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: new Date(2099, 0, 1) });
        }
    }
    if (order.distributeMethod == '天天送')
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);
            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
                cnt += x.count;
            }
        else if (x.type == '整单停送')
        {
            count += x.count;
            cnt -= x.count;
        }
        else if (x.type == '停送')
        {
            cnt = 0;
            count += order.distributeCount;
        }
        });
            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                cnt = 0;
                count += order.distributeCount;
            }
            if (i.getTime() === time.getTime()) return cnt;
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);
            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
                cnt += x.count;
            }
        else if (x.type == '整单停送')
        {
            count += x.count;
            cnt -= x.count;
        }
        else if (x.type == '停送')
        {
            cnt = 0;
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                cnt = 0;
                count += order.distributeCount;
            }

            if (i.getTime() === time.getTime()) return cnt;
        }
    }
    else
    {
        for (let i = dbeg; count > 0; i.setDate(i.getDate() + 1))
        {
            if (i.getDay() == 6 || i.getDay() == 0) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);
            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
                cnt += x.count;
            }
        else if (x.type == '整单停送')
        {
            count += x.count;
            cnt -= x.count;
        }
        else if (x.type == '停送')
        {
            cnt = 0;
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                cnt = 0;
                count += order.distributeCount;
            }

            if (i.getTime() === time.getTime()) return cnt;
        }
    }
    return 0;
}

// 获取剩余瓶数
function getLeftCount (order, changes, time) {
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let tmp = new Date();
    time = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    let ret, cnt = 0;
    let count = order.count;
    let unknownChangesRaw = changes.filter(x => x.type == '停止送奶' || x.type == '恢复送奶');
    let unknownChanges = [];
    for (let i = 0; i < unknownChangesRaw.length; i += 2)
    {
        if (i + 1 < unknownChangesRaw.length)
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: unknownChangesRaw[i].end});
        }
        else
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: new Date(2099, 0, 1) });
        }
    }
    if (dbeg > tmp) return count;
    if (order.distributeMethod == '天天送')
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);

            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
            }
        else if (x.type == '停送')
        {
            count += x.count;
        }
        else if (x.type == '整单停送')
        {
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                count += order.distributeCount;
            }

            if (i.getTime() === time.getTime()) return count;
        }
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);

            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
            }
        else if (x.type == '停送')
        {
            count += x.count;
        }
        else if (x.type == '整单停送')
        {
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                count += order.distributeCount;
            }

            let timetmp = time.getTime();
            if (i.getTime() === timetmp) return count;
            let tt = new Date(i);
            let t2 = tt.setDate(i.getDate() - 1);
            if (t2.toString() == timetmp) return count;
        }
    }
    else
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);

            if (i.getDay() == 6 || i.getDay() == 0)
            {
                if (i.getTime() == time.getTime())
                    return count;
                else
                    continue;
            }

            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
                cnt += x.count;
            }
        else if (x.type == '停送')
        {
            count += x.count;
            cnt -= x.count;
        }
        else if (x.type == '整单停送')
        {
            cnt = 0;
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                cnt = 0;
                count += order.distributeCount;
            }

            if (i.getTime() === time.getTime()) return count;
        }
    }
    return 0;
}

// 获取订单配送详情
function _getDistributeDetail (order, changes, time)
{
    let detail = [];
    let dbeg = new Date(order.begin.getFullYear(), order.begin.getMonth(), order.begin.getDate());
    let tmp = new Date();
    time = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    let ret, cnt = 0;
    let count = order.count;
    let unknownChangesRaw = changes.filter(x => x.type == '停止送奶' || x.type == '恢复送奶');
    let unknownChanges = [];
    for (let i = 0; i < unknownChangesRaw.length; i += 2)
    {
        if (i + 1 < unknownChangesRaw.length)
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: unknownChangesRaw[i].end });
        }
        else
        {
            unknownChanges.push({ begin: unknownChangesRaw[i].begin, end: new Date(2099, 0, 1) });
        }
    }
    if (dbeg > tmp) return [];
    if (order.distributeMethod == '天天送')
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 1))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);
            let prevCount = count;
            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
            }
        else if (x.type == '停送')
        {
            count += x.count;
        }
        else if (x.type == '整单停送')
        {
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                count += order.distributeCount;
            }
            if (prevCount != count)
                detail.push({ time: i.getTime(), count: prevCount - count, left: count, milkType: order.milkType });
            if (i.getTime() === time.getTime()) break;
        }
        return detail;
    }
    else if (order.distributeMethod == '隔日送')
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 2))
        {
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);
            let prevCount = count;
            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
            }
        else if (x.type == '停送')
        {
            count += x.count;
        }
        else if (x.type == '整单停送')
        {
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                count += order.distributeCount;
            }

            let timetmp = time.getTime();
            if (prevCount != count)
                detail.push({ time: i.getTime(), count: prevCount - count, left: count, milkType: order.milkType });
            if (i.getTime() === timetmp) break;
            let tt = new Date(i);
            let t2 = tt.setDate(i.getDate() - 1);
            if (t2.toString() == timetmp) break;
        }
        return detail;
    }
    else
    {
        for (let i = dbeg; count >= 0; i.setDate(i.getDate() + 1))
        {
            if (i.getDay() == 6 || i.getDay() == 0) continue;
            let tmp = changes.filter(x => x.milkType == order.milkType && x.begin <= i && x.end >= i || x.type == '整单停送' && x.begin <= i && x.end >= i);
            let prevCount = count;
            if (order.distributeCount > count) order.distributeCount = count;
            count -= order.distributeCount;
            cnt = order.distributeCount;
            tmp.forEach(x => {
                if (x.type == '加送')
            {
                count -= x.count;
                cnt += x.count;
            }
        else if (x.type == '停送')
        {
            count += x.count;
            cnt -= x.count;
        }
        else if (x.type == '整单停送')
        {
            cnt = 0;
            count += order.distributeCount;
        }
        });

            if (unknownChanges.some(x => x.begin <= i && i < x.end))
            {
                cnt = 0;
                count += order.distributeCount;
            }

            if (prevCount != count)
                detail.push({ time: i.getTime(), count: prevCount - count, left: count, milkType: order.milkType });

            if (i.getTime() === time.getTime()) break;
        }
        return detail;
    }
    return detail;
}

function getDistributeDetail(order)
{
    let tmp = [];
    order.orders.forEach(x => {
        let t = _getDistributeDetail(x, order.changes, new Date());
    t.forEach(x => tmp.push(x));
});
    return tmp;
}

router.use(function (req, res, next) {
    res.locals.back = true;
    next();
});

router.get('/', auth.mGuest, function (req, res, next) {
    res.locals.back = false;
    res.render('mobile/index', { layout: 'mobile', title: '登录' });
});

router.post('/login', function (req, res, next) {
    db.users.findOne({ username: req.body.username })
        .select('username password salt _id role department')
        .exec()
        .then(function (user) {
            if (!user) {
                return res.redirect('/mobile/message/?msg=' + encodeURIComponent('用户名或密码错误,请确认后重试!'));
            }
            let pwd = crypto.sha256(req.body.password, user.salt);
            if (pwd == user.password)
            {
                req.session.uid = user._id;
                req.session.user = user;
                res.redirect('/mobile/home');
            }
            else
            {
                return res.redirect('/mobile/message/?msg=' + encodeURIComponent('用户名或密码错误,请确认后重试!'));
            }
        })
        .then(null, next);
});

router.get('/home', auth.mSignedIn, function (req, res, next) {
    res.locals.back = false;
    res.render('mobile/home', { title: '飞鹤鲜奶管理系统', layout: 'mobile' });
});

router.get('/milk', auth.mRole('milk', 'query'), function (req, res, next) {
    db.milks.find()
        .exec()
        .then(function (milks) {
            res.render('mobile/milk', { title: '奶品奶价', layout: 'mobile', milks: milks });
        })
        .then(null, next);
});

router.get('/promotion', auth.mRole('promotion', 'query'), function (req, res, next) {
    let now = new Date();
    db.activities.find({
        begin: { $lte: now },
        end: { $gte: now }
    })
        .sort({ end: -1 })
        .exec()
        .then(function (data) {
            res.render('mobile/promotion', { title: '促销活动', layout: 'mobile', data: data });
        })
        .then(null, next);
});

router.get('/promotion/:id', auth.mRole('promotion', 'query'), function (req, res, next) {
    db.activities.findById(req.params.id)
        .populate('gifts')
        .exec()
        .then(function (data) {
            res.render('mobile/showPromotion', { title: data.title, layout: 'mobile', data: data });
        })
        .then(null, next);
});

router.get('/logout', function (req, res, next) {
    req.session.destroy();
    res.redirect('/mobile');
});

router.get('/my', function (req, res, next) {
    res.render('mobile/my', { title: '我的订单', layout: 'mobile' });
});

router.get('/myorders', function (req, res ,next) {
    db.orders.find({ user: req.session.uid })
        .skip(req.query.p * 10)
        .limit(10)
        .sort({ _id: -1 })
        .exec()
        .then(function (data) {
            let result = [];
            data.forEach(x => {
                result.push({
                    number: x.number,
                    time: x.recordTime || x.orders[0].begin,
                    id: x._id
                });
            });
            res.render('mobile/myRaw', { layout: false, data: result });
        })
        .then(null, next);
});

router.get('/order/:id', auth.mRole('order', 'query'), function (req, res, next) {
    let sum  = 0;
    db.orders.findById(req.params.id)
        .populate('address order user logs.user')
        .exec()
        .then(function (order) {
            for(var i=0;i<order.orders.length;i++){
                var leftCount = getLeftCount(order.orders[i],order.changes,new Date());
                order.orders[i].leftCount= leftCount;
                console.log(parseInt(order.orders[i].count)-parseInt(order.orders[i].presentCount));
                if((parseInt(order.orders[i].count)-parseInt(order.orders[i].presentCount))>parseInt(order.orders[i].presentCount)){
                    sum = parseInt(sum) + (parseInt(order.orders[i].count)-parseInt(order.orders[i].presentCount))*parseInt(order.orders[i].single);
                }
            }
            res.locals.leftMoney = sum;
            res.render('mobile/order', { layout: 'mobile', title: '订单' + order.number, order: order });
        })
        .then(null, next);
});

router.get('/milkbox', auth.mRole('milkBox', 'modify'), function (req, res, next) {
    res.render('mobile/milkbox', { title: '装箱录入', layout: 'mobile' });
});

router.post('/milkbox/create', auth.checkRole('milkBox', 'modify'), function (req, res, next) {
    let store = new db.stores();
    if (!req.body.department)
        res.redirect('/mobile/message/?msg=' + encodeURIComponent('请先选择一个奶箱仓库'));
    db.orders.findOne({ number: req.body.number })
        .exec()
        .then(function (order) {
            if (!order)
                res.redirect('/mobile/message/?msg=' + encodeURIComponent('订单号不存在请查证后再试'));
            store.order = order._id;
            store.time = new Date();
            store.count = req.body.count;
            store.department = req.body.department;
            store.hint = req.body.hint;
            store.operateType = '装箱';
            store.milkBox = '待装箱';
            store.save(function (err) {
                return Promise.resolve();
            });
        })
        .then(function () {
            res.redirect('/mobile/message/?msg=' + encodeURIComponent('装箱信息登记成功'));
        })
        .then(null, next);
});

router.get('/message', function (req, res, next) {
    res.render('mobile/message', { title: '提示信息', layout: 'mobile' });
});

router.get('/order', auth.mRole('order', 'modify'), function (req, res, next) {
    res.render('mobile/orderCreate', { title: '录入订单', layout: 'mobile' });
});

router.post('/order/create', auth.mRole('order', 'modify'), function (req, res, next) {
    let order = new db.orders();
    let user  = req.session.user;
    if(user.role == '热线员'){
        order.customCall =  req.session.uid;
        order.customServiceFlag = false;
    }
    order.isSample = req.body.sample == 'true';
    order.time = new Date();
    order.address = req.body.address;
    order.number = req.body.number;
    order.payMethod = req.body.payMethod;
    order.pos = req.body.pos =='pos'?'': req.body.pos;
    order.price = req.body.price;
    order.orderType = 'undefine';
    order.user = req.session.uid;

    db.addresses.findById(req.body.address)
        .exec()
        .then(function (address) {
            if(address.deposit==null){
                let deposit = new db.deposits();
                deposit.number = req.body.deposit;
                deposit.address= req.body.address;
                deposit.giveBackFlag=false;
                deposit.giveBackDone=false;
                deposit.giveBackTime='';

                deposit.boxedFlag=false;
                deposit.boxedTime='';
                deposit.boxedDone=false;
                deposit.time=Date.now();
                deposit.save(function (err, deposit) {
                    db.addresses.update({_id: req.body.address}, {
                            deposit: deposit._id
                        })
                        .exec();
                })
            }
        });
    // TODO: 计算最后一天送奶日期（需要考虑周末停送时中间有一个周六周日）
    // order.end = ;
    order.hint = req.body.hint;
    if(typeof(req.body.milkType)!='string'){
        for(var i =0;i<req.body.milkType.length;i++){
            order.orders.push({
                milkType: req.body.milkType[i],
                count:parseInt(req.body.count[i]) +parseInt(req.body.presentCount[i]),
                presentCount:parseInt(req.body.presentCount[i]),
                distributeCount:req.body.distributeCount[i],
                distributeMethod:req.body.distributeMethod[i],
                single:req.body.single[i],
                time:Date.now(),
                begin:req.body.begin[i]==''?new Date():req.body.begin[i],
            });
            if(req.body.presentCount[i]>0){
                order.logs.push({
                    user: req.session.uid,
                    content:'赠送'+ req.body.milkType[i]+'品相'+req.body.presentCount[i]+'瓶'
                })
            }
        }
    }else{
        order.orders.push({
            milkType: req.body.milkType,
            count:parseInt(req.body.count)+parseInt(req.body.presentCount),
            presentCount:req.body.presentCount,
            distributeCount:req.body.distributeCount,
            distributeMethod:req.body.distributeMethod,
            single:req.body.single,
            time:Date.now(),
            begin:req.body.begin
        });
        if(req.body.presentCount>0){
            order.logs.push({
                user: req.session.uid,
                content:'赠送'+ req.body.milkType+'品相'+req.body.presentCount+'瓶'
            })
        }
    }
    for (let i = 0; i < order.orders.length; i++) {
        if((parseInt(order.orders[i].count)-parseInt(order.orders[i].presentCount))==0 && (i!=0)){
            if(req.body.begin[i]=='' || req.body.begin[i] == null){
                var time = new Date(order.orders[0].end.getFullYear(), order.orders[0].end.getMonth(), order.orders[0].end.getDate());
                order.orders[i].begin = time;
            }
        }
        order.orders[i].end = getEndDistributeDate(order.orders[i], order.changes);
    }
    let ObjectID = db.mongoose.mongo.BSONPure.ObjectID;
    db.orders.find({
            'address':ObjectID(req.body.address)
        })
        .exec()
        .then(function (orders) {
            if(orders.length == 0){
                if(user.role=="热线员"){
                    order.orderType =  'A02';
                }
                else{
                    order.orderType= 'B01';
                }
            }
            else{
                var flag = false;  //是否有结束的订单
                var empty = true;  //是否全部的订单都结束
                var days = 0;
                var isTodayHave = false; 　//是否今天下单
                for(var j=0;i<orders.length;i++){
                    for(var i=0;i<orders.length;i++){
                        var  now = new Date();
                        var date =   getEndDistributeDate(orders[j].orders[i], order.changes);
                        var orderTime  = orders[i].orders[0].time;
                        if(orderTime.getDate() == now.getDate() ){
                            isTodayHave = true;
                            break;
                        }
                        if(date<now){
                            if(days>parseInt(Math.abs(now - date) / 1000 / 60 / 60 / 24)){
                                days = parseInt(Math.abs(now - date) / 1000 / 60 / 60 / 24);
                            }
                            flag = true;
                        }
                        else if(date > now){
                            empty = false;
                        }
                    }
                }

                if(isTodayHave==true){
                    if(user.role=="热线员"){
                        order.orderType =  'A04';
                    }
                    else{
                        order.orderType =  'B03';
                    }
                }
                if((flag==false) || ((flag==true) && (empty==false))){
                    if(user.role=="热线员"){
                        order.orderType =  'A04';
                    }
                    else{
                        order.orderType =  'B04';
                    }
                }
                if(empty==true){
                    if(parseInt(days)<10){
                        if(user.role=="热线员"){
                            order.orderType =  'A03';
                        }
                        else{
                            order.orderType =  'B05';
                        }
                    }
                    else{
                        if(user.role=="热线员"){
                            order.orderType =  'A03';
                        }
                        else{
                            order.orderType =  'B02';
                        }
                    }
                }
            }
        },next)
        .then(function (data) {
            order.save(function (err, order) {
                res.redirect('/mobile/order/' + order._id);
            });
        },next)
        .then(null,next);
});

router.get('/gift', auth.mRole('gift', 'modify'), function (req, res, next) {
    res.render('mobile/gift', { title: '赠品赠送登记', layout: 'mobile' });
});

router.post('/gift', auth.mRole('gift', 'modify'), function (req, res, next) {
    let store = new db.stores({ gift: { $ne: null } });
    let ObjectID = db.mongoose.mongo.BSONPure.ObjectID;
    if (!req.body.gift)
        return res.redirect('/mobile/message/?msg=' + encodeURIComponent('赠品选择不合法请重试'));
    if (!req.body.department)
        return res.redirect('/mobile/message/?msg=' + encodeURIComponent('赠品仓库选择不合法请重试'));
    db.orders.findOne({ number: req.body.number })
        .exec()
        .then(function (order) {
            if (!order)
                return res.redirect('/mobile/message/?msg=' + encodeURIComponent('订单号没有找到请检查后重试'));
            store.gift = ObjectID(req.body.gift);
            store.department = ObjectID(req.body.department);
            store.count = req.body.count;
            store.hint = req.body.hint;
            store.time = new Date();
            store.operateType = req.body.type;
            store.order = order._id;
            store.save(function (err) {
                return res.redirect('/mobile/message/?msg=' + encodeURIComponent('赠品赠送记录登记成功'));
            });
        })
        .then(null, next);
});

module.exports = router;