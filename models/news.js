var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var newsSchema = new Schema({
    time: {
        type: Date,
        index: true,
        default: Date.now()
    },
    title: String,
    content: String,
    summary: String
});

var news = mongodb.mongoose.model('news', newsSchema);
module.exports = news;