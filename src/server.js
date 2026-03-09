"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const config_1 = require("./config");
const logger_1 = require("./common/logger");
const redis_1 = require("./config/redis");
const connection_1 = require("./database/connection");
const websocket_1 = require("./websocket");
async function bootstrap() {
    try {
        // Connect to Redis
        logger_1.logger.info('Connecting to Redis...');
        await redis_1.redis.connect();
        // Test database connection
        logger_1.logger.info('Testing database connection...');
        const dbOk = await connection_1.db.healthCheck();
        if (!dbOk) {
            throw new Error('Database health check failed');
        }
        logger_1.logger.info('Database connection verified');
        // Create HTTP server
        const server = http_1.default.createServer(app_1.app);
        // Initialize WebSocket
        (0, websocket_1.initializeWebSocket)(server);
        // Start listening
        server.listen(config_1.config.port, () => {
            logger_1.logger.info(`Server running on port ${config_1.config.port}`, {
                env: config_1.config.env,
                port: config_1.config.port,
                pid: process.pid,
            });
            logger_1.logger.info(`Health check: http://localhost:${config_1.config.port}/health`);
            logger_1.logger.info(`API v1: http://localhost:${config_1.config.port}/api/v1`);
        });
        // ---- Graceful shutdown ----
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
            server.close(async () => {
                logger_1.logger.info('HTTP server closed');
                try {
                    await redis_1.redis.close();
                    await connection_1.db.close();
                    logger_1.logger.info('All connections closed. Exiting.');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.error('Error during shutdown', { error });
                    process.exit(1);
                }
            });
            // Force exit after 30s
            setTimeout(() => {
                logger_1.logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('unhandledRejection', (reason) => {
            logger_1.logger.error('Unhandled rejection', { reason: reason?.message || reason });
        });
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}
bootstrap();
