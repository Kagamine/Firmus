'use strict'
var express = require('express');
var router = express.Router();
var crypto = require('../lib/cryptography');
var fs = require('fs');

router.use(function (req, res, next) {
    res.locals.general = true;
    next();
});

// 新闻列表
router.get('/news', auth.checkRole('news', 'query'), function (req, res, next) {
    db.news.find()
        .sort({ time: -1 })
        .skip(10 * (req.query.p - 1))
        .limit(10)
        .exec()
        .then(function (news) {
            res.locals.news = news;
            return db.news.count().exec();
        })
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            res.render('general/news', { title: '新闻公告' });
        })
        .then(null, next);
});

// 展示新闻内容
router.get('/news/:id', auth.checkRole('news', 'query'), function (req, res, next) {
    db.news.findById(req.params.id)
        .select('_id title time content')
        .exec()
        .then(function (news) {
            if (news)
                res.render('general/newsShow', { title: news.title, news: news });
            else
            {
                res.status(404);
                next();
            }
        })
        .then(null, next);
});

// 发布新闻
router.post('/news/create', auth.checkRole('news', 'modify'), function (req, res, next) {
    let news = new db.news();
    news.title = '新建新闻';
    news.content = '<p>请在此处填写新闻内容</p>';
    news.summary = '请在此处填写新闻内容';
    news.time = Date.now();
    news.save(function (err, news) {
        res.redirect('/general/news/edit/' + news._id);
    });
});

// 删除新闻
router.post('/news/delete/:id', auth.checkRole('news', 'modify'), function (req, res, next) {
    db.news.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.redirect('/general/news');
        })
        .then(null, next);
});

// 修改新闻
router.get('/news/edit/:id', auth.checkRole('news', 'modify'), function (req, res, next) {
    db.news.findById(req.params.id)
        .select('_id title content')
        .exec()
        .then(function (news) {
            res.render('general/newsEdit', { title: '编辑新闻', news: news });
        })
        .then(null, next);
});

// 修改新闻
router.post('/news/edit/:id', auth.checkRole('news', 'modify'), function (req, res, next) {
    let summary = req.body.content.replace(/<[^>]+>/g, '');
    if (summary.length >= 255)
        summary = summary.substring(0, 247) + '...';
    console.log(summary);
    db.news.update({ _id: req.params.id }, {
        title: req.body.title,
        content: req.body.content,
        summary: summary
    })
        .exec()
        .then(function () {
            res.redirect('/general/news/' + req.params.id);
        })
        .then(null, next);
});

// 部门列表
router.get('/department', auth.checkRole('department', 'modify'), function (req, res, next) {
    let query = db.departments.find();
    if (req.query.title)
        query = query.where({ title: new RegExp('.*' + req.query.title + '.*') });
    if (req.query.type)
        query = query.where({ type: req.query.type });
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
            res.render('general/department', { title: '部门列表' });
        })
        .then(null, next);
});

// 部门员工信息
router.get('/department/:id', auth.checkRole('department', 'query'), function (req, res, next) {
    db.departments.findById(req.params.id)
        .exec()
        .then(function (department) {
            res.locals.department = department;
            return db.users.find({ department: department._id }).sort('role').exec();
        })
        .then(function (users) {
            res.locals.users = users;
            res.render('general/departmentDetail', { title: res.locals.department.title });
        })
        .then(null, next);
});

// 编辑部门
router.get('/department/edit/:id', auth.checkRole('department', 'modify'), function (req, res, next) {
    db.departments.findById(req.params.id)
        .exec()
        .then(function (department) {
            res.render('general/departmentEdit', { title: department.title, department: department });
        })
        .then(null, next)
});

// 编辑部门
router.post('/department/edit/:id', auth.checkRole('department', 'modify'), function (req, res, next) {
    db.departments.update({ _id: req.params.id }, {
        title: req.body.title,
        type: req.body.type,
        city: req.body.city,
        district: req.body.district,
        address: req.body.address
    })
        .exec()
        .then(function () { res.send('OK') })
        .then(null, next);
});

// 删除部门
router.post('/department/delete/:id', auth.checkRole('department', 'modify'), function (req, res, next) {
    db.departments.remove({ _id: req.params.id })
        .exec()
        .then(function () { res.send('OK'); })
        .then();
});

// 创建部门
router.post('/department/create', auth.checkRole('department', 'modify'), function (req, res, next) {
    let department = new db.departments();
    department.title = '新建部门';
    department.type = '普通部门';
    department.save(function (err, department) {
        res.redirect('/general/department/' + department._id);
    });
});

// 职工列表
router.get('/employee', auth.checkRole('employee', 'query'), function (req, res, next) {
    let query;
    db.departments.find()
        .select('_id title')
        .exec()
        .then(function (departments) {
            res.locals.departments = departments;
            query = db.users.find();
            if (req.query.name)
                query = query.where({ name: req.query.name });
            if (req.query.jobNumber)
                query = query.where({ jobNumber: req.query.jobNumber });
            if (req.query.department)
                query = query.where({ department: req.query.department });
            if (req.query.role)
                query = query.where({ role: req.query.role });
            return _.clone(query).count().exec();
        })
        .then (function (count) {
            var page = res.locals.page = req.query.p || 1;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query.populate('department').skip(50 * (page - 1)).limit(50).exec();
        })
        .then(function (users) {
            res.locals.users = users;
            res.render('general/employee', { title: '职工管理' });
        })
        .then(null, next);
});


// 添加职工
router.get('/employee/create', auth.checkRole('employee', 'modify'), function (req, res, next) {
    res.render('general/employeeCreate', { title: '添加职工' });
});

// 添加职工
router.post('/employee/create', auth.checkRole('employee', 'modify'), function (req, res, next) {
    let user = db.users();
    user.username = req.body.username;
    user.salt = crypto.salt();
    user.password = crypto.sha256(req.body.password, salt);
    user.role = req.body.role;
    user.save(function (err, user) {
        res.redirect('/general/employee/edit/' + user._id);
    });
});

// 职工信息
router.get('/employee/:id', auth.checkRole('employee', 'query'), function (req, res, next) {
    db.users.findById(req.params.id)
        .populate({ path: 'department', select: '_id title' })
        .exec()
        .then(function (user) {
            res.render('general/employeeDetail', { title: user.name, user: user });
        })
        .then(null, next);
});

// 职工担保人信息
router.get('/employee/cautioner/:id', auth.checkRole('employee-private', 'query'), function (req, res, next) {
    db.users.findById(req.params.id)
        .populate({ path: 'department', select: '_id title' })
        .exec()
        .then(function (user) {
            res.render('general/employeeCautioner', { title: user.name, user: user });
        })
        .then(null, next);
});

// 编辑职工
router.get('/employee/edit/:id', auth.checkRole('employee', 'modify'), function (req, res, next) {
    db.users.findById(req.params.id)
        .exec()
        .then(function (user) {
            res.locals.user = user;
            return db.departments.find()
                .select('_id title')
                .exec();
        })
        .then(function (departments) {
            res.locals.departments = departments;
            res.render('general/employeeEdit', { title: res.locals.user.name });
        })
        .then(null, next);
});

// 编辑职工
router.post('/employee/edit/:id', auth.checkRole('employee', 'modify'), function (req, res, next) {
    if (req.files.file) {
        var writestream = db.gfs.createWriteStream({
            filename: req.files.file.originalname,
            metadata: { public: true }
        });
        db.fs.createReadStream(req.files.file.path).pipe(writestream);
        writestream.on('close', function (file) {
            db.fs.unlink(req.files.file.path);
            db.users.update({ _id: req.params.id }, { photo: file._id }).exec();
        });
    }
    let options = {
        jobNumber: req.body.jobNumber || '',
        name: req.body.name || '',
        sex: req.body.sex,
        takeOfficeTime: req.body.takeOfficeTime,
        role: req.body.role,
        department: req.body.department,
        PRCIdentity: req.body.PRCIdentity || '',
        address: req.body.address || '',
        phone: req.body.phone || '',
        diploma: req.body.diploma || '',
        cautioner: {
            name: req.body['cautioner-name'] || '',
            PRCIdentity: req.body['cautioner-PRCIdentity'] || '',
            address: req.body['cautioner-address'] || '',
            phone: req.body['cautioner-phone'] || ''
        }
    };
    if (req.body.password) {
        let salt = crypto.salt();
        options.salt = salt;
        options.password = crypto.sha256(req.body.password, salt);
    }
    db.users.update({ _id: req.params.id }, options)
        .exec()
        .then(function () {
            res.redirect('/general/employee/' + req.params.id);
        })
        .then(null, next);
});

// 地址信息列表
router.get('/address', auth.checkRole('address', 'query'), function (req, res, next) {
    let query = db.addresses.find({ blankOut: false });
    if (req.body.city)
        query = query.where('city').eq(req.body.city);
    if (req.body.district)
        query = query.where('district').eq(req.body.district);
    if (req.body.address)
        query = query.where({ address: new RegExp('.*' + req.query.address + '.*') });
    if (req.body.milkStation)
        query = query.where('milkStation').eq(req.body.milkStation);
    if (req.body.name)
        query = query.where({ name: new RegExp('.*' + req.query.name + '.*') })
    if (req.body.phone)
        query = query.where({ phone: new RegExp('.*' + req.query.phone + '.*') })
    if (req.body.milkBox)
    {
        if (req.body.milkbox == '已安装')
            query = query.where('deposit').ne(null);
        else
            query = query.where('deposit').eq(null);
    }
    _.clone(query)
        .count()
        .exec()
        .then(function (count) {
            var page = res.locals.page = req.params.page == null ? 1 : req.query.p;
            var pageCount = res.locals.pageCount = parseInt((count + 5 - 1) / 5);
            var start = res.locals.start = (page - 5) < 1 ? 1 : (page - 5);
            var end = res.locals.end = (start + 10) > pageCount ? pageCount : (start + 10);
            return query.populate({ path: 'milkStation', select: 'title _id' }).skip(50 * (page - 1)).limit(50).exec();
        })
        .then(function (addresses) {
            res.locals.addresses = addresses;
            return db.addresses
                .aggregate()
                .group({ _id: '$city' })
                .exec();
        })
        .then(function (cities) {
            res.locals.cities = cities.map(x => x._id);
            return db.addresses
                .aggregate()
                .group({ _id: { city: '$city', district: '$district' } })
                .exec();
        })
        .then(function (districts) {
            res.locals.districts = districts.map(x => {
                return {
                    city: x._id.city,
                    district: x._id.district
                }
            });
            res.render('general/address', { title: '地址信息管理' });
        })
        .then(null, next);
});



// 奶站订单列表
router.get('/department/order/:id', auth.checkRole('order', 'query'), function (req, res, next) {
    db.orders.find({
        'address.department': req.params.id
    })
        .exec()
        .populate({ path: 'address', select: 'department' })
        .then(function (orders) {
            res.send(orders);
        })
        .then(null, next);
});

// 添加地址
router.get('/address/create', auth.checkRole('address', 'modify'), function (req, res, next) {
    db.departments.find({ type: '奶站' })
        .exec()
        .then(function (milkStations) {
            res.locals.milkStations = milkStations;
            res.render('general/addressCreate', { title: '添加地址信息' });
        })
        .then(null, next);
});

// 添加地址
router.post('/address/create', auth.checkRole('address', 'modify'), function (req, res, next) {
    let address = new db.addresses();
    address.city = req.body.city;
    address.district = req.body.district;
    address.address = req.body.address;
    address.storey = req.body.storey;
    address.milkStation = req.body.milkStation;
    address.name = req.body.name;
    address.phone = req.body.phone;
    address.blockOut = false;
    address.save(function (err, address) {
        res.redirect('/address/' + address._id);
    });
});

// 删除地址
router.post('/address/delete/:id', auth.checkRole('address', 'modify'), function (req, res, next) {
    db.addresses.update({ _id: req.params.id }, {
        blankOut: true
    })
        .exec()
        .then(function () {
            res.send('OK');
        })
        .then(null, next)
});

// 编辑地址
router.get('/address/edit/:id', auth.checkRole('address', 'modify'), function (req, res, next) {
    db.addresses.findById(req.params.id)
        .populate('deposit')
        .exec()
        .then(function (address) {
            res.locals.address = address;

            res.render('general/addressEdit', { title: '编辑地址' });
        })
        .then(null, next);
});

// 编辑地址信息
router.post('/address/edit/:id', auth.checkRole('address', 'modify'), function (req, res, next) {
    let options = {
        city: req.body.city,
        district: req.body.district,
        address: req.body.address,
        name: req.body.name,
        phone: req.body.phone,
        storey: req.body.storey,
        service: req.body.service || null,
        distributor: req.body.distributor || null,
        milkStation: req.body.milkStation || null
    };
    let findDeposit = new Promise(function (resolve, reject) {
        if (req.body.deposit) {
            db.deposit.findOne({ Number: req.body.deposit }).exec(function (err, deposit) {
                if (err || !deposit) {
                    res.send('没有找到对应的押金单号');
                    reject();
                } else {
                    options.deposit = deposit._id;
                    resolve();
                }
            })
        } else {
            resolve();
        }
    });
    findDeposit
        .then(function () {
            return db.addresses.update({ _id: req.params.id }, options).exec();
        })
        .then(function () {
            res.send('地址信息保存成功');
        })
        .then(null, function (err) { res.send(err) });
});

// 获取服务人员/配送人员下拉列表
router.get('/address/milkStationMember', auth.checkRole('address', 'modify'), function (req, res, next) {
    db.users.find({ department: req.query.department })
        .select('_id title role')
        .exec()
        .then(function (users) {
            res.json(users);
        })
        .then(null, next);
});

// 配送车辆信息
router.get('/car', auth.checkRole('car', 'query'), function (req, res, next) {
    let query = db.cars.find({
        plate: new RegExp('.*' + (req.query.plate || '') + '.*'),
        line: new RegExp('.*' + (req.query.line || '') + '.*'),
        city: new RegExp('.*' + (req.query.city || '') + '.*')
    });
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
        .then(function (cars) {
            res.render('general/car', { title: '配送车辆管理', cars: cars });
        })
        .then(null, next);
});

// 添加配送车辆
router.get('/car/create', auth.checkRole('car', 'modify'), function (req, res, next) {
    res.render('general/carCreate', { title: '添加配送车辆' });
});

// 添加配送车辆
router.post('/car/create', auth.checkRole('car', 'modify'), function (req, res, next) {
    let car = new db.cars();
    car.line = req.body.line;
    car.plate = req.body.plate;
    car.city = req.body.city;
    car.save(function (err, car) {
        res.redirect('/general/car/edit/' + car._id);
    });
});

// 查看车辆行驶站点
router.get('/car/station/:id', auth.checkRole('car', 'query'), function (req, res, next) {
    db.cars.findById(req.params.id)
        .populate('stations')
        .exec()
        .then(function (car) {
            res.render('general/carStation', { title: car.line + '行驶站点', car: car });
        })
        .then(null, next);
});

// 修改配送车辆信息
router.get('/car/edit/:id', auth.checkRole('car', 'modify'), function (req, res, next) {
    db.cars.findById(req.params.id)
        .exec()
        .then(function (car) {
            res.render('general/carEdit', { title: '编辑' + car.line, car: car });
        })
        .then(null, next);
});

// 修改配送车辆信息
router.post('/car/edit/:id', auth.checkRole('car', 'modify'), function (req, res, next) {
    db.cars.update({ _id: req.params.id }, {
        city: req.body.city,
        line: req.body.line,
        plate: req.body.plate
    })
        .exec()
        .then(function () {
            res.redirect('/car/station/' + req.params.id);
        })
        .then(null, next);
});

// 修改配送车辆站点信息
router.get('/car/edit/station/:id', auth.checkRole('car', 'modify'), function (req, res, next) {
    db.cars.findById(req.params.id)
        .exec()
        .then(function (car) {
            res.locals.car = car;
            return db.departments.find({ city: car.city, type: '奶站' }).exec();
        })
        .then(function (stations) {
            stations.forEach(x => {
                if (res.locals.car.stations.some(y => x._id.toString() == y.toString())) {
                    x.checked = true;
                } else {
                    x.checked = false;
                }
            });
            res.render('general/carEditStation', { title: '编辑' + res.locals.car.line, milkStations: stations });
        })
        .then(null, next);
});

// 修改配送车辆站点信息
router.post('/car/station/edit/:id', auth.checkRole('car', 'modify'), function (req, res, next) {
    let ids = req.body.ids.split(' ');
    db.cars.update({ _id: req.params.id }, {
        stations: ids
    })
        .exec()
        .then(function () {
            res.send('ok');
        })
        .then(null, next);
});

// 修改权限分配
router.get('/permission', auth.checkRole('permission', 'modify'), function (req, res, next) {
    res.render('general/permission', { title: '权限管理', permission: permission });
});

// 修改权限分配
router.post('/permission', auth.checkRole('permission', 'modify'), function (req, res, next) {
    if (req.body.mode == 'allow') {
        permission[req.body.permission][req.body.type].push(req.body.chkrole);
    } else {
        let index = permission[req.body.permission][req.body.type].indexOf(req.body.chkrole);
        console.log(index);
        if (index >= 0)
            permission[req.body.permission][req.body.type].splice(index, 1);
        console.log(permission[req.body.permission][req.body.type]);
    }
    fs.writeFileSync(__dirname + '/../permission.json', JSON.stringify(permission));
    res.send('ok');
});

router.post('/car/delete/:id', auth.checkRole('car', 'modify'), function (req, res, next) {
    db.cars.remove({ _id: req.params.id })
        .exec()
        .then(function () {
            res.send('ok');
        })
        .then(null, next);
});


//根据城市找到区县  by nele
router.get('/address/getDistrictByCity',auth.checkRole('address','query'),function(req,res,next){
    db.addresses
    .aggregate()
    .match({'city':req.query.city})
    .group({ _id: { city: '$city', district: '$district' } })
        .exec()
    .then(function(data){
            res.json(data.map(x => {
                return {
                    city: x._id.city,
                    district: x._id.district
                }}));
        })
        .then(null, next);
});



//根据区县找到奶站  by nele
router.get('/address/getMilkStationByDistrict',auth.checkRole('address','query'),function(req,res,next){
    db.departments
    .aggregate()
    .match({'city':req.query.city,'district':req.query.district})
    .exec()
    .then(function(data){
            res.json(data);
        })
    .then(null, next);
});

//模糊匹配城市名称 by nele
router.get('/address/getCitiesByName',auth.checkRole('address','query'),function(req,res,next){
     db.addresses
         .aggregate()
         .match({ city: new RegExp('.*' + req.query.data + '.*') })
         .group({_id:{city:'$city'}})
         .exec()
         .then(function(data){
             res.json(data.map(x=>x._id.city));
         })
         .then(null, next);

});

//模糊匹配县区名称 by nele
router.get('/address/getDistrictsByName',auth.checkRole('address','query'),function(req,res,next){
    db.addresses
        .aggregate()
        .match({ district: new RegExp('.*' + req.query.data + '.*') })
        .group({_id:{district:'$district'}})
        .exec()
        .then(function(data){
            res.json(data.map(x=>x._id.district));
        })
        .then(null, next);

});


router.get('/address/getDeparmentByCity',auth.checkRole('address','query'),function(rea,res,next){
     db.departments
    .where({city:req.query.city,district:req.query.district})
    .exec()
    .then(function(data){
             res.json(data.map(x=>{
                 return {
                     id:x.id,
                     title:x.title
                 }
             }));
         })
});


module.exports = router;