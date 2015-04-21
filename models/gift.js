var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var giftSchema = new Schema({
    title: String,
    picture: Schema.Types.ObjectId,
    income: [{
        time: {
            type: Date,
            index: true,
            default: Date.now()
        },
        count: Number
    }],
    delete: {
        type: Boolean,
        index: true
    }
});

var gift = mongodb.mongoose.model('gifts', giftSchema);
module.exports = gift;