var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var callSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        index: true
    },
    time: {
        type: Date,
        index: true,
        default: Date.now()
    },
    order: {
        type: Schema.Types.ObjectId,
        ref: 'orders'
    },
    needFeedback: Boolean,
    isFeedbacked: Boolean,
    feedbackResult: String,
    hint: String,
    content: String,
    type: {
        type: Number,
        index: true,
        default: 0
    }
});

var call = mongodb.mongoose.model('calls', callSchema);
module.exports = call;