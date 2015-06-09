var mongoose = require('mongoose');
mongoose.connect('mongodb://firmus:123456@localhost:27017/firmus', {
    server: {
        auto_reconnect: true,
        socketOptions:{
            keepAlive: 1
        }
    },
    db: {
        numberOfRetries: 3,
        retryMiliSeconds: 1000,
        safe: true
    }
});
GLOBAL.Types = mongoose.Types;
exports.mongoose = mongoose;