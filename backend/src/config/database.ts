import knex, { Knex } from 'knex';
import { env } from './env';
import { logger } from '../utils/logger';

let db: Knex | null = null;

// Database configuration
const dbConfig: Knex.Config = {
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
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
  },
  debug: env.isDevelopment,
};

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<Knex> {
  if (db) {
    return db;
  }

  try {
    db = knex(dbConfig);

    // Test connection
    await db.raw('SELECT 1');
    logger.info('✅ Database connected successfully', {
      host: env.db.host,
      database: env.db.database,
    });

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
