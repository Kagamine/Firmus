var mongodb = require('../models/mongodb');
var Schema = mongodb.mongoose.Schema;

var postponeRecordSchema = new Schema({
    order: {
        type: Schema.Types.ObjectId,
        ref: 'orders'
    },
    changes: String,
    time: {
        type: Date,
        index: true,
        default: Date.now()
    }
});

var postponeRecord = mongodb.mongoose.model('postponeRecords', postponeRecordSchema);
module.exports = postponeRecord;