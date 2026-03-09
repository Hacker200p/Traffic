"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const config_1 = require("../config");
const errorHandler = (err, _req, res, _next) => {
    logger_1.logger.error('Error caught by handler', {
        error: err.message,
        stack: err.stack,
        name: err.name,
    });
    if (err instanceof errors_1.ValidationError) {
        const response = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                errors: err.errors,
            },
        };
        res.status(err.statusCode).json(response);
        return;
    }
    if (err instanceof errors_1.AppError) {
        const response = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                ...(config_1.config.env === 'development' && { stack: err.stack }),
            },
        };
        res.status(err.statusCode).json(response);
        return;
    }
    // Unhandled errors
    const response = {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: config_1.config.env === 'production' ? 'Internal server error' : err.message,
            ...(config_1.config.env === 'development' && { stack: err.stack }),
        },
    };
    res.status(500).json(response);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (_req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found',
        },
    });
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
