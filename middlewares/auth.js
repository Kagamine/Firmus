var auth = {};

auth.guest = function (req, res, next) {
    if (req.session.uid == null)
        return next();
    else
        return res.redirect('/login');
};

auth.mSignedIn = function (req, res, next) {
    if (req.session.uid == null)
        return res.redirect('/login');
    else
        return next();
};

auth.mGuest = function (req, res, next) {
    if (req.session.uid == null)
        return next();
    else
        return res.redirect('/mobile/home');
};

auth.checkRole = function (mod, method) {
    return function (req, res, next) {
        if (!req.session.uid) {
            return res.redirect('/login');
        }
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

auth.mRole = function (mod, method) {
    return function (req, res, next) {
        if (!req.session.uid) {
            return res.redirect('/mobile');
        }
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