var crypto = require('crypto');
var urlsafeBase64 = require('./urlsafeBase64');

var CIPHER_KEY = crypto.randomBytes(32);

exports.aesEncrypt = function (plain_text) {
    var IV = crypto.randomBytes(12);
    var cipher = crypto.createCipheriv('aes-256-gcm', CIPHER_KEY, IV);
    var bufs = [cipher.update(plain_text)];
    bufs.push(cipher.final());
    var cipher_text = Buffer.concat(bufs);
    var tag = cipher.getAuthTag();
    return urlsafeBase64.encode(cipher_text) + "." + urlsafeBase64.encode(IV) + "." + urlsafeBase64.encode(tag);
};

exports.aesDecrypt = function (cipher_text) {
    try{
        var cipher_blob = cipher_text.split(".");
        var ct = urlsafeBase64.decode(cipher_blob[0]);
        var IV = urlsafeBase64.decode(cipher_blob[1]);
        var tag = urlsafeBase64.decode(cipher_blob[2]);
        var decipher = crypto.createDecipheriv('aes-256-gcm', CIPHER_KEY, IV);
        decipher.setAuthTag(tag);
        var bufs = [decipher.update(ct)];
        bufs.push(decipher.final());
        return Buffer.concat(bufs);
    } catch(err) {
        console.log('decrypt failed', err);
        return null;
    }
};

exports.salt = function() {
    return crypto.pseudoRandomBytes(32).toString('base64');
}
exports.sha256 = function (str, salt) {
    return crypto.createHash('sha256').update(str + salt).digest('base64');
}

exports.sha1 = function (str, salt) {
    return crypto.createHash('sha1').update(str + salt).digest('base64');
}

exports.md5 = function (str, salt) {
    return crypto.createHash('md5').update(str + salt).digest('hex');
}