var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate');

var financeSchema = new Schema({
    time: {
        type: Date,
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        index: true
    },
    payMethod: {
        type: String,
        index: true,
        enum: enums.payMethod
    },
    pos: String,
    price: Number
});

financeSchema.plugin(deepPopulate, {});

var finance = mongodb.mongoose.model('finances', financeSchema);
module.exports = finance;