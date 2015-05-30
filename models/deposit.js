var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var depositSchema = new Schema({
    number: {
        type: String,
        index: true
    },
    time: {
        type: Date,
        index: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'addresses'
    },
    giveBackFlag: {
        type: Boolean,
        index: true
    },
    giveBackTime: {
        type: Date,
        index: true
    },
    giveBackDone: {
        type: Boolean,
        index: true
    },

    boxedFlag:{
        type: Boolean,
        index: true
    },
    boxedTime:{
        type: Date,
        index: true
    },
    boxedDone:{
        type: Boolean,
        index: true
    }
});


var deposit = mongodb.mongoose.model('deposits', depositSchema);
module.exports = deposit;