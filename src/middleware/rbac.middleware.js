"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allRoles = exports.policeAndAdmin = exports.adminOnly = exports.authorize = void 0;
const errors_1 = require("../common/errors");
const authorize = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new errors_1.ForbiddenError('Authentication required'));
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            next(new errors_1.ForbiddenError(`Role '${req.user.role}' is not authorized to access this resource`));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
// Convenience helpers
exports.adminOnly = (0, exports.authorize)('admin');
exports.policeAndAdmin = (0, exports.authorize)('admin', 'police');
exports.allRoles = (0, exports.authorize)('admin', 'police', 'analyst');
