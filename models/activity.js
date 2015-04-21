var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var activitySchema = new Schema({
    title: String,
    begin: {
        type: Date,
        index: true
    },
    end: {
        type: Date,
        index: true
    },
    gifts: [{ type: Schema.Types.ObjectId, ref: 'gifts' }],
    content: String
});

var activity = mongodb.mongoose.model('activities', activitySchema);
module.exports = activity;