var mongodb = require('../models/mongodb');
var fs = require('fs');
var Grid = require('gridfs-stream');

var Schema = mongodb.mongoose.Schema;
var conn = mongodb.mongoose.connection;
Grid.mongo = mongodb.mongoose.mongo;
var db = {};

db.gfs = Grid(conn.db);
db.users = require('./user');
db.departments = require('./department');
db.bills = require('./bill');
db.calls = require('./call');
db.cars = require('./car');
db.freeDrinks = require('./freeDrink');
db.addresses = require('./address');
db.deposits = require('./deposit');
db.activities = require('./activity');
db.gifts = require('./gift');
db.giftDelivers = require('./giftDeliver');
db.orders = require('./order');
db.news = require('./news');
db.Schema = Schema;
db.fs = fs;
db.mongoose = mongodb.mongoose;

module.exports = db;