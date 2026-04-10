import * as path from 'path';
import * as fs from 'fs';
import knex, { Knex } from 'knex';
import { env } from './env';
import { logger } from '../utils/logger';

let db: Knex | null = null;

const migrationsDir = env.isProduction
  ? path.join(__dirname, '..', 'database', 'migrations')
  : path.join(__dirname, '..', '..', 'src', 'database', 'migrations');

const migrationExt = env.isProduction ? 'js' : 'ts';

function buildConfig(): Knex.Config {
  const client = env.db.client;

  const migrations: Knex.MigratorConfig = {
    directory: migrationsDir,
    tableName: 'knex_migrations',
    extension: migrationExt,
    // Without this, Knex's default loadExtensions includes '.ts', which also
    // matches '.d.ts' declaration files emitted alongside compiled migrations.
    // Loading a .d.ts as JS throws "Unexpected token '{'" on `import type {...}`.
    loadExtensions: [`.${migrationExt}`],
  };

  if (client === 'sqlite3') {
    // Ensure the data directory exists
    const dir = path.dirname(env.db.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return {
      client: 'better-sqlite3',
      connection: { filename: env.db.path },
      useNullAsDefault: true,
      migrations,
      debug: env.isDevelopment,
    };
  }

  if (client === 'pg') {
    return {
      client: 'pg',
      connection: {
        host: env.db.host,
        port: env.db.port,
        database: env.db.database,
        user: env.db.user,
        password: env.db.password,
        // Force UTC session timezone — mirrors mysql2's `timezone: 'Z'`
        options: '-c TimeZone=UTC',
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
      },
      migrations,
      debug: env.isDevelopment,
    };
  }

  // Default: mysql2
  return {
    client: 'mysql2',
    connection: {
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      charset: 'utf8mb4',
      timezone: 'Z', // Store all dates in UTC
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
    },
    migrations,
    debug: env.isDevelopment,
  };
}

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<Knex> {
  if (db) {
    return db;
  }

  try {
    db = knex(buildConfig());

    // Test connection
    await db.raw('SELECT 1');

    if (env.db.client === 'sqlite3') {
      logger.info('✅ Database connected successfully', { engine: 'SQLite', file: env.db.path });
    } else {
      logger.info('✅ Database connected successfully', {
        engine: env.db.client,
        host: env.db.host,
        database: env.db.database,
      });
    }

    return db;
  } catch (error) {
    logger.error('❌ Database connection failed', { error });
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Knex {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!db) {
      return false;
    }
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
}

export default getDatabase;
