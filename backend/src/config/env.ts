import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Helper to read secret files
const readSecret = (filename: string): string | undefined => {
  const secretPath = path.join(process.cwd(), 'secrets', filename);
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf-8').trim();
  }
  // Try Docker secrets location
  const dockerSecretPath = `/run/secrets/${filename.replace('.txt', '')}`;
  if (fs.existsSync(dockerSecretPath)) {
    return fs.readFileSync(dockerSecretPath, 'utf-8').trim();
  }
  return undefined;
};

// Required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'APP_PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
];

// Environment variable configuration
export const env = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  appPort: parseInt(process.env.APP_PORT || '3001', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  // Database
  db: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: readSecret('db_password.txt') || process.env.DB_PASSWORD || '',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: readSecret('redis_password.txt') || process.env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: readSecret('jwt_secret.txt') || process.env.JWT_SECRET || '',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },

  // Encryption
  encryption: {
    masterKey: readSecret('encryption_key.txt') || process.env.ENCRYPTION_KEY || '',
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  },

  // Password
  password: {
    pepper: readSecret('password_pepper.txt') || process.env.PASSWORD_PEPPER || '',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // Security
  security: {
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    loginMaxRequests: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10),
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },

  // WebAuthn
  webauthn: {
    rpName: process.env.WEBAUTHN_RP_NAME || 'Budget App',
    rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
    origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
  },

  // Feature Flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

// Validate required environment variables
export function validateEnv(): void {
  const missing: string[] = [];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check for critical secrets in production
  if (env.isProduction) {
    if (!env.jwt.secret) {
      missing.push('JWT_SECRET');
    }
    if (!env.encryption.masterKey) {
      missing.push('ENCRYPTION_KEY');
    }
    if (!env.db.password) {
      missing.push('DB_PASSWORD');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Please check your .env file or environment configuration.`
    );
  }

  // Warn about missing optional but recommended variables
  if (env.isProduction) {
    if (!env.password.pepper) {
      console.warn('⚠️  Warning: PASSWORD_PEPPER not set. Passwords will be less secure.');
    }
    if (!env.redis.password) {
      console.warn('⚠️  Warning: REDIS_PASSWORD not set. Redis is not password-protected.');
    }
  }
}
