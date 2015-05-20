var mongodb = require('../models/mongodb');
var deepPopulate = require('mongoose-deep-populate');
var Schema = mongodb.mongoose.Schema;

var storeSchema = new Schema({
    time:{
        type: Date,
        index: true,
        default: Date.now()
    },
    count:Number,
    operateType:{
        type: String,
        enum: enums.operateType
    },
    milkBox:{
        type: String,
        enum: enums.milkBox
    },
    department: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: 'departments'
    },
    gift: {
        type: Schema.Types.ObjectId,
        ref: 'gifts',
        index: true
    },
    hint:{
        type:String
    },
    order: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: 'orders'
    },
    feedback: {
        type: String,
        index: true
    }
});

storeSchema.plugin(deepPopulate, {});

var store = mongodb.mongoose.model('stores', storeSchema);
module.exports = store;