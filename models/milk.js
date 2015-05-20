var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var milkSchema = new Schema({
    title: String,
    standard: String,
    number: String,
    description: String,
    price: Number,
    priceRecords: [{
        time: Date,
        price: Number
    }],
    delete: {
        type: Boolean,
        index: true,
        default: false
    }
});

var milk = mongodb.mongoose.model('milks', milkSchema);
module.exports = milk;