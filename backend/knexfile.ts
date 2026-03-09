import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Helper to read secret files
const readSecret = (filename: string): string => {
  const secretPath = path.join(__dirname, 'secrets', filename);
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf-8').trim();
  }
  return process.env[filename.replace('.txt', '').toUpperCase().replace(/_/g, '_')] || '';
};

type DbClient = 'sqlite3' | 'mysql2' | 'pg';
const dbClient = (process.env['DB_CLIENT'] as DbClient) ?? 'sqlite3';
const dbPath = process.env['DB_PATH'] ?? './data/budget.db';

function buildDevConfig(): Knex.Config {
  const migrations: Knex.MigratorConfig = {
    directory: './src/database/migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
  };
  const seeds = {
    directory: './src/database/seeds',
    extension: 'ts',
  };

  if (dbClient === 'sqlite3') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return {
      client: 'better-sqlite3',
      connection: { filename: dbPath },
      useNullAsDefault: true,
      migrations,
      seeds,
    };
  }

  if (dbClient === 'pg') {
    return {
      client: 'pg',
      connection: {
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '5432', 10),
        database: process.env['DB_NAME'] || 'budget_app',
        user: process.env['DB_USER'] || 'budget_user',
        password: process.env['DB_PASSWORD'] || 'dev_pass',
        options: '-c TimeZone=UTC',
      },
      pool: { min: 2, max: 10 },
      migrations,
      seeds,
    };
  }

  // Default: mysql2
  return {
    client: 'mysql2',
    connection: {
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '3306', 10),
      database: process.env['DB_NAME'] || 'budget_app',
      user: process.env['DB_USER'] || 'budget_user',
      password: process.env['DB_PASSWORD'] || 'dev_pass',
      charset: 'utf8mb4',
    },
    pool: { min: 2, max: 10 },
    migrations,
    seeds,
  };
}

function buildProdConfig(): Knex.Config {
  const migrations: Knex.MigratorConfig = {
    directory: './dist/database/migrations',
    tableName: 'knex_migrations',
    extension: 'js',
  };
  const seeds = {
    directory: './dist/database/seeds',
    extension: 'js',
  };

  if (dbClient === 'sqlite3') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return {
      client: 'better-sqlite3',
      connection: { filename: dbPath },
      useNullAsDefault: true,
      migrations,
      seeds,
    };
  }

  if (dbClient === 'pg') {
    return {
      client: 'pg',
      connection: {
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '5432', 10),
        database: process.env['DB_NAME'] || 'budget_app',
        user: process.env['DB_USER'] || 'budget_user',
        password: readSecret('db_password.txt') || process.env['DB_PASSWORD'],
        options: '-c TimeZone=UTC',
      },
      pool: { min: 2, max: 10, acquireTimeoutMillis: 30000, idleTimeoutMillis: 30000 },
      migrations,
      seeds,
    };
  }

  // Default: mysql2
  return {
    client: 'mysql2',
    connection: {
      host: process.env['DB_HOST'] || 'mariadb',
      port: parseInt(process.env['DB_PORT'] || '3306', 10),
      database: process.env['DB_NAME'] || 'budget_app',
      user: process.env['DB_USER'] || 'budget_user',
      password: readSecret('db_password.txt') || process.env['DB_PASSWORD'],
      charset: 'utf8mb4',
      ssl: false,
    },
    pool: { min: 2, max: 10, acquireTimeoutMillis: 30000, idleTimeoutMillis: 30000 },
    migrations,
    seeds,
  };
}

const config: { [key: string]: Knex.Config } = {
  development: buildDevConfig(),
  production: buildProdConfig(),
};

export default config;
