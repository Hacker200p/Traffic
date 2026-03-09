import fs from 'fs';
import path from 'path';
import { db } from './connection';
import { logger } from '../common/logger';

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await db.query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map((row: any) => row.name);
}

async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    await ensureMigrationsTable();
    const executed = await getExecutedMigrations();

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      logger.info('No migrations directory found, running schema.sql...');
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await db.query(schema);
        await db.query(`INSERT INTO migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, ['000_initial_schema']);
        logger.info('Initial schema applied successfully');
      }
      return;
    }

    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let applied = 0;
    for (const file of migrationFiles) {
      const name = path.parse(file).name;
      if (executed.includes(name)) {
        logger.debug(`Skipping already executed migration: ${name}`);
        continue;
      }

      logger.info(`Running migration: ${name}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

      await db.transaction(async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
      });

      applied++;
      logger.info(`Migration applied: ${name}`);
    }

    if (applied === 0) {
      logger.info('No pending migrations');
    } else {
      logger.info(`Applied ${applied} migration(s)`);
    }
  } catch (error: any) {
    logger.error('Migration failed', { error: error.message });
    throw error;
  } finally {
    await db.close();
  }
}

// Run if called directly
runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
