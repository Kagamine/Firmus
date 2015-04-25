var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var orderSchema = new Schema({
    name: String,
    phone: String,
    number: {
        type: String,
        index: true
    },
    distributeMethod: {
        type: String,
        enum: enums.distributeMethod,
        index: true
    },
    price: Number,
    balance: {
        type: Number,
        default: 0
    },
    milkType: {
        type: String,
        index: true
    },
    count: {
        type: Number,
        index: true
    },
    time: {
        type: Date,
        index: true
    },
    begin: {
        type: Date,
        index: true
    },
    distributeCount: {
        type: Number,
        index: true
    },
    payMethod: {
        type: String,
        index: true,
        enum: enums.payMethod
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'addresses'
    },
    orderType: {
        type: String,
        index: true
    },
    customServiceFlag: {
        index: true,
        type: Boolean,
        default: false
    },
    customService: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        index: true
    },
    changes: [{
        begin: Date,
        end: Date,
        type: {
            type: String,
            enum: enums.orderChangeType
        },
        count: Number,
        hint: String
    }]
});

var order = mongodb.mongoose.model('orders', orderSchema);
module.exports = order;