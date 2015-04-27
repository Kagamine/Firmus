var auth = {};

auth.guest = function (req, res, next) {
    if (req.session.uid == null)
        return next();
    else
        return res.redirect('/login');
};

auth.checkRole = function (mod, method) {
    return function (req, res, next) {
        if (!permission.access.some(x => x == res.locals.currentUser.role)) {
            res.status(403);
            return next();
        }
        if (!permission[mod][method].some(x => x == res.locals.currentUser.role)) {
            res.status(403)
            return next();
        }
        next();
    }
}

module.exports = auth;