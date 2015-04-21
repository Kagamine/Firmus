var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var addressSchema = new Schema({
    city: {
        type: String,
        index: true
    },
    district: {
        type: String,
        index: true
    },
    address: String,
    name: {
        type: String,
        index: true
    },
    phone: String,
    milkStation: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: 'department'
    },
    storey: {
        type: String,
        enum: enums.storey
    },
    deposit: {
        type: Schema.Types.ObjectId,
        ref: 'deposits'
    },
    service: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    distributor: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    }
});

var address = mongodb.mongoose.model('addresses', addressSchema);
module.exports = address;