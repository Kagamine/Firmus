var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var carSchema = new Schema({
    line: {
        type: String,
        index: true
    },
    plate: {
        type: String,
        unique: true
    },
    stations: [{ type: Schema.Types.ObjectId, ref: 'departments' }]
});

var car = mongodb.mongoose.model('cars', carSchema);
module.exports = car;