var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var billSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    price: Number,
    type: {
        type: String,
        enum: enums.billType,
        index: true
    },
    time: {
        type: Date,
        index: true,
        default: Date.now()
    }
});

var bill = mongodb.mongoose.model('bills', billSchema);
module.exports = bill;