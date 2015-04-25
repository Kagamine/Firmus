var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var freeDrinkSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        index: true
    },
    time: {
        type: Date,
        index: true
    },
    count: Number,
    order: {
        type: Schema.Types.ObjectId,
        ref: 'orders'
    }
});

var freeDrink = mongodb.mongoose.model('freeDrinks', freeDrinkSchema);
module.exports = freeDrink;