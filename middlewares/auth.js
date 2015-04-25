var auth = {};

auth.guest = function (req, res, next) {
    if (req.session.uid == null)
        return next();
    else
        return res.redirect('/login');
};

module.exports = auth;