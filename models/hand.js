var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var handSchema = new Schema({
    type: {
        type: String,
        index: true,
        enum: enums.needDistributeType
    },
    count: {
        type: Number,
        default: 0,
        index: true
    },
    status: {
        type: Number,
        default: 0,
        index: true
    },
    submitTime: {
        type: Date,
        index: true,
        default: Date.now()
    },
    verifyTime: {
        type: Date,
        index: true,
        default: Date.now()
    },
    hint: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    }
});

var hand = mongodb.mongoose.model('hands', handSchema);
module.exports = hand;