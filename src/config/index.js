"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
exports.config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'traffic_control',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
        poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '',
        db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },
    cors: {
        origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
    },
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        dir: process.env.LOG_DIR || 'logs',
    },
    ws: {
        pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
        pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '20000', 10),
    },
    serviceAuth: {
        apiKey: process.env.SERVICE_API_KEY || (process.env.NODE_ENV === 'production' ? undefined : 'dev-service-key-NOT-FOR-PRODUCTION'),
        systemUserId: process.env.SERVICE_SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000001',
    },
    encryption: {
        key: process.env.ENCRYPTION_KEY || '',
    },
};
// Fail fast if production is missing required secrets
if (exports.config.env === 'production') {
    if (!process.env.SERVICE_API_KEY) {
        throw new Error('SERVICE_API_KEY must be set in production');
    }
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY must be set in production (64-char hex string)');
    }
    if (exports.config.jwt.accessSecret === 'default-access-secret') {
        throw new Error('JWT_ACCESS_SECRET must be set in production');
    }
}
