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
  // Fallback to environment variable
  return process.env[filename.replace('.txt', '').toUpperCase().replace(/_/g, '_')] || '';
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'budget_app',
      user: process.env.DB_USER || 'budget_user',
      password: process.env.DB_PASSWORD || 'dev_pass',
      charset: 'utf8mb4',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'mariadb',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'budget_app',
      user: process.env.DB_USER || 'budget_user',
      password: readSecret('db_password.txt') || process.env.DB_PASSWORD,
      charset: 'utf8mb4',
      ssl: false, // Set to true if using SSL connection
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
    migrations: {
      directory: './dist/database/migrations',
      tableName: 'knex_migrations',
      extension: 'js',
    },
    seeds: {
      directory: './dist/database/seeds',
      extension: 'js',
    },
  },
};

export default config;
