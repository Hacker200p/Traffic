"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allRoles = exports.policeAndAdmin = exports.adminOnly = exports.authorize = void 0;
const errors_1 = require("../common/errors");
const audit_service_1 = require("../common/audit.service");
const authorize = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new errors_1.ForbiddenError('Authentication required'));
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            // Log authorization failures
            audit_service_1.auditService.log({
                userId: req.user.userId,
                action: 'authorization_denied',
                entityType: 'auth',
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                newValues: { role: req.user.role, requiredRoles: allowedRoles, path: req.originalUrl },
            }).catch(() => {});
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
