"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceAuth = void 0;
const config_1 = require("../config");
const errors_1 = require("../common/errors");
const logger_1 = require("../common/logger");
/**
 * Service-to-service authentication middleware.
 * Validates requests from internal services (e.g. AI microservice)
 * using a shared API key sent via Authorization header or X-API-Key header.
 *
 * Sets req.user to a synthetic system identity so downstream code
 * that reads req.user.userId / req.user.role keeps working.
 */
const serviceAuth = async (req, _res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        (req.headers.authorization);
        if (!apiKey) {
            throw new errors_1.UnauthorizedError('Service API key is required');
        }
        if (apiKey !== config_1.config.serviceAuth.apiKey) {
            throw new errors_1.UnauthorizedError('Invalid service API key');
        }
        // Set a synthetic system user so existing service code works
        req.user = {
            userId: config_1.config.serviceAuth.systemUserId,
            email: 'ai-service@system.internal',
            role: 'admin',
        };
        const source = req.headers['x-source'] || 'unknown';
        logger_1.logger.debug('Service authenticated', { source, path: req.path });
        next();
    }
    catch (error) {
        if (error instanceof errors_1.UnauthorizedError) {
            next(error);
            return;
        }
        next(new errors_1.UnauthorizedError('Service authentication failed'));
    }
};
exports.serviceAuth = serviceAuth;
function extractBearerToken(header) {
    if (!header || !header.startsWith('Bearer '))
        return undefined;
    return header.split(' ')[1];
}
