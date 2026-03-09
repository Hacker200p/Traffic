"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
const logger_1 = require("../common/logger");
const pool = new pg_1.Pool({
    host: config_1.config.db.host,
    port: config_1.config.db.port,
    database: config_1.config.db.name,
    user: config_1.config.db.user,
    password: config_1.config.db.password,
    min: config_1.config.db.poolMin,
    max: config_1.config.db.poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => {
    logger_1.logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});
pool.on('connect', () => {
    logger_1.logger.debug('New PostgreSQL client connected');
});
exports.db = {
    query: async (text, params) => {
        const start = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            logger_1.logger.debug('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Query error', { text: text.substring(0, 80), error: error.message });
            throw error;
        }
    },
    getClient: async () => {
        const client = await pool.connect();
        return client;
    },
    transaction: async (callback) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    },
    healthCheck: async () => {
        try {
            await pool.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    },
    close: async () => {
        await pool.end();
        logger_1.logger.info('PostgreSQL pool closed');
    },
};
