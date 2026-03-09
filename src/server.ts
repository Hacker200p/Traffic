import http from 'http';
import { app } from './app';
import { config } from './config';
import { logger } from './common/logger';
import { redis } from './config/redis';
import { db } from './database/connection';
import { initializeWebSocket } from './websocket';

async function bootstrap(): Promise<void> {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...');
    await redis.connect();

    // Test database connection
    logger.info('Testing database connection...');
    const dbOk = await db.healthCheck();
    if (!dbOk) {
      throw new Error('Database health check failed');
    }
    logger.info('Database connection verified');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket
    initializeWebSocket(server);

    // Start listening
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        env: config.env,
        port: config.port,
        pid: process.pid,
      });
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`API v1: http://localhost:${config.port}/api/v1`);
    });

    // ---- Graceful shutdown ----
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await redis.close();
          await db.close();
          logger.info('All connections closed. Exiting.');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force exit after 30s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled rejection', { reason: reason?.message || reason });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

bootstrap();
