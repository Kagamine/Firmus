var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var giftSchema = new Schema({
    title: String,
    picture: Schema.Types.ObjectId,
    description: String,
    count: {
        type: Number,
        default: 0,
        index: true
    },
    income: [{
        time: {
            type: Date,
            index: true,
            default: Date.now()
        },
        count: Number,
        store: {
            type: Schema.Types.ObjectId,
            ref: 'departments'
        }
    }],
    delete: {
        type: Boolean,
        index: true,
        default: false
    }
});

var gift = mongodb.mongoose.model('gifts', giftSchema);
module.exports = gift;