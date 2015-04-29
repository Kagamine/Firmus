var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var userSchema = new Schema({
    jobNumber: {
        type: Number,
        unique: true
    },
    username: {
        type: String,
        unique: true,
        validate: /^[^@]{4,16}$/ //限制为4~16个字符
    },
    password: String,
    salt: String,
    role: {
        type: String,
        enum: enums.role,
        index: true
    },
    name: String,
    phone: String,
    department: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: 'departments'
    },
    sex: {
        type: String,
        enum: enums.sex,
        default: '男',
        index: true
    },
    PRCIdentity: {
        type: String,
        unique: true
    },
    address: String,
    cautioner: {
        name: String,
        address: String,
        phone: String,
        PRCIdentity: String
    },
    diploma: String,
    takeOfficeTime: {
        type: Date,
        default: Date.now()
    },
    photo: Schema.Types.ObjectId
});

var user = mongodb.mongoose.model('users', userSchema);
module.exports = user;