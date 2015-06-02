var mongodb = require('../models/mongodb');
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
    }
});

var store = mongodb.mongoose.model('stores', storeSchema);
module.exports = store;