"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("./connection");
const logger_1 = require("../common/logger");
const MIGRATIONS_DIR = path_1.default.resolve(__dirname, 'migrations');
async function ensureMigrationsTable() {
    await connection_1.db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
async function getExecutedMigrations() {
    const result = await connection_1.db.query('SELECT name FROM migrations ORDER BY id');
    return result.rows.map((row) => row.name);
}
async function runMigrations() {
    try {
        logger_1.logger.info('Starting database migrations...');
        await ensureMigrationsTable();
        const executed = await getExecutedMigrations();
        if (!fs_1.default.existsSync(MIGRATIONS_DIR)) {
            logger_1.logger.info('No migrations directory found, running schema.sql...');
            const schemaPath = path_1.default.resolve(__dirname, 'schema.sql');
            if (fs_1.default.existsSync(schemaPath)) {
                const schema = fs_1.default.readFileSync(schemaPath, 'utf-8');
                await connection_1.db.query(schema);
                await connection_1.db.query(`INSERT INTO migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, ['000_initial_schema']);
                logger_1.logger.info('Initial schema applied successfully');
            }
            return;
        }
        const migrationFiles = fs_1.default.readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort();
        let applied = 0;
        for (const file of migrationFiles) {
            const name = path_1.default.parse(file).name;
            if (executed.includes(name)) {
                logger_1.logger.debug(`Skipping already executed migration: ${name}`);
                continue;
            }
            logger_1.logger.info(`Running migration: ${name}`);
            const sql = fs_1.default.readFileSync(path_1.default.join(MIGRATIONS_DIR, file), 'utf-8');
            await connection_1.db.transaction(async (client) => {
                await client.query(sql);
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
            });
            applied++;
            logger_1.logger.info(`Migration applied: ${name}`);
        }
        if (applied === 0) {
            logger_1.logger.info('No pending migrations');
        }
        else {
            logger_1.logger.info(`Applied ${applied} migration(s)`);
        }
    }
    catch (error) {
        logger_1.logger.error('Migration failed', { error: error.message });
        throw error;
    }
    finally {
        await connection_1.db.close();
    }
}
// Run if called directly
runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
