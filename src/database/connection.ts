import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { logger } from '../common/logger';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  min: config.db.poolMin,
  max: config.db.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

export const db = {
  query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
      return result;
    } catch (error: any) {
      logger.error('Query error', { text: text.substring(0, 80), error: error.message });
      throw error;
    }
  },

  getClient: async (): Promise<PoolClient> => {
    const client = await pool.connect();
    return client;
  },

  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  healthCheck: async (): Promise<boolean> => {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  },

  close: async (): Promise<void> => {
    await pool.end();
    logger.info('PostgreSQL pool closed');
  },
};
