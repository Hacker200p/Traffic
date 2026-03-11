"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const redis_1 = require("../config/redis");
const errors_1 = require("../common/errors");
const audit_service_1 = require("../common/audit.service");
const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('Access token is required');
        }
        const token = authHeader.split(' ')[1];
        // Check blacklist
        const isBlacklisted = await redis_1.redis.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new errors_1.UnauthorizedError('Token has been revoked');
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        // Log authentication failures for security monitoring
        audit_service_1.auditService.log({
            action: 'auth_failure',
            entityType: 'auth',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            newValues: { reason: error.message, path: req.originalUrl },
        }).catch(() => {});
        if (error instanceof errors_1.UnauthorizedError) {
            next(error);
            return;
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.UnauthorizedError('Access token has expired'));
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.UnauthorizedError('Invalid access token'));
            return;
        }
        next(error);
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.split(' ')[1];
        const isBlacklisted = await redis_1.redis.isTokenBlacklisted(token);
        if (!isBlacklisted) {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret);
            req.user = decoded;
        }
        next();
    }
    catch {
        next();
    }
};
exports.optionalAuth = optionalAuth;
