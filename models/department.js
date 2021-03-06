var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var departmentSchema = new Schema({
    title: String,
    city: {
        type: String,
        index: true
    },
    district: {
        type: String,
        index: true
    },
    address: String,
    type: {
        type: String,
        index: true,
        enum: enums.departmentType
    },
    delete: {
        type: Boolean,
        index: true,
        default: false
    }
});

var department = mongodb.mongoose.model('departments', departmentSchema);
module.exports = department;