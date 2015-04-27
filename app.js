var os = require('os');
var fs = require('fs');
var _ = GLOBAL._ = require('underscore');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var multer = require('multer');
var expressLayouts = require('express-ejs-layouts');
GLOBAL.permission = JSON.parse(fs.readFileSync(__dirname + '/permission.json'));
GLOBAL.enums = require('./models/enums');
GLOBAL.db = require('./models');
var routes = require('./controllers');
var app = express();
app.use(expressLayouts);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ dest: os.tmpdir() }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'firmus', resave: false, saveUninitialized: true }));
app.set('layout', 'layout');
app.use('/', routes);
module.exports = app;