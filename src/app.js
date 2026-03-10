"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const logger_1 = require("./common/logger");
const error_handler_1 = require("./common/error-handler");
const v1_1 = require("./routes/v1");
const health_1 = require("./routes/health");
const app = (0, express_1.default)();
exports.app = app;
// ---- Security ----
app.use((0, helmet_1.default)({
    contentSecurityPolicy: config_1.config.env === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
}));
// ---- CORS ----
app.use((0, cors_1.default)({
    origin: config_1.config.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
}));
// ---- Compression ----
app.use((0, compression_1.default)());
// ---- Body parsers ----
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ---- Rate limiting (production only) ----
if (process.env.NODE_ENV === 'production') {
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests, please try again later',
        },
    },
});
app.use('/api/', limiter);
// Stricter rate limit for auth endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many authentication attempts, please try again later',
        },
    },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
}
// ---- Request logging ----
app.use((req, _res, next) => {
    logger_1.logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')?.substring(0, 100),
    });
    next();
});
// ---- Routes ----
app.use('/', health_1.healthRouter);
app.use('/api/v1', v1_1.apiV1Router);
// ---- Root endpoint ----
app.get('/', (_req, res) => {
    res.json({
        name: 'Autonomous Traffic Light Control System',
        version: '1.0.0',
        docs: '/api/v1',
        health: '/health',
    });
});
// ---- Error handling ----
app.use(error_handler_1.notFoundHandler);
app.use(error_handler_1.errorHandler);
