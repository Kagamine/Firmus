var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate');

var orderSchema = new Schema({
    number: {
        type: String,
        index: true
    },
    price: Number,
    isSample: {
        type: Boolean,
        default: false,
        index: true
    },
    orders: [{
        milkType: {
            type: String,
            index: true
        },
        count: {
            type: Number,
            index: true
        },
        presentCount:{
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
        end: {
            type: Date,
            index: true,
            default: new Date(2199, 0)
        },
        distributeCount: {
            type: Number,
            index: true
        },
        distributeMethod: {
            type: String,
            enum: enums.distributeMethod,
            index: true
        },
        single: Number,
        leftCount: Number
    }],
    payMethod: {
        type: String,
        index: true,
        enum: enums.payMethod
    },
    orderType: {
        type: String,
        index: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'addresses'
    },
    customServiceFlag: {
        index: true,
        type: Boolean,
        default: true,
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
    customCall:{
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    changes: [{
        begin: Date,
        end: Date,
        milkType: String,
        type: {
            type: String,
            enum: enums.orderChangeType
        },
        count: Number,
        hint: String,
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        time: Date
    }],
    pos : String,
    hint : String,
    parentId:{
        type: Schema.Types.ObjectId,
        ref: 'orders'
    },
    logs:[{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users',
            index: true
        },
        content:{
            type:String,
            index:true
        },
        time:{
            type:Date,
            default: Date.now()
        }
    }],
    recordTime: {
        type: Date,
        index: true,
        default: new Date()
    }
});

orderSchema.plugin(deepPopulate, {});

var order = mongodb.mongoose.model('orders', orderSchema);
module.exports = order;