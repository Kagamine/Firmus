var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var giftDeliverSchema = new Schema({
    time: {
        type: Date,
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    gift: {
        type: Schema.Types.ObjectId,
        ref: 'gifts'
    },
    hint: String,
    giveBackFlag: {
        type: Boolean,
        index: true
    },
    feedBackFlag: {
        type: Boolean,
        index: true
    },
    feedBackResult: String,
    order: {
        type: Schema.Types.ObjectId,
        ref: 'orders'
    },
    count: {
        type: Number,
        index: true
    }
});

var giftDeliver = mongodb.mongoose.model('giftDelivers', giftDeliverSchema);
module.exports = giftDeliver;