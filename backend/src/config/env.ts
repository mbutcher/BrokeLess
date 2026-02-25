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
const requiredEnvVars = ['NODE_ENV', 'APP_PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];

// Bracket notation required by noPropertyAccessFromIndexSignature
const e = process.env;

// Environment variable configuration
export const env = {
  // Application
  nodeEnv: e['NODE_ENV'] ?? 'development',
  appPort: parseInt(e['APP_PORT'] ?? '3001', 10),
  appUrl: e['APP_URL'] ?? 'http://localhost:3000',

  // Database
  db: {
    host: e['DB_HOST'] ?? '',
    port: parseInt(e['DB_PORT'] ?? '3306', 10),
    database: e['DB_NAME'] ?? '',
    user: e['DB_USER'] ?? '',
    password: readSecret('db_password.txt') ?? e['DB_PASSWORD'] ?? '',
  },

  // Redis
  redis: {
    host: e['REDIS_HOST'] ?? 'localhost',
    port: parseInt(e['REDIS_PORT'] ?? '6379', 10),
    password: readSecret('redis_password.txt') ?? e['REDIS_PASSWORD'],
  },

  // JWT
  jwt: {
    secret: readSecret('jwt_secret.txt') ?? e['JWT_SECRET'] ?? '',
    expiry: e['JWT_EXPIRY'] ?? '15m',
    refreshExpiry: e['JWT_REFRESH_EXPIRY'] ?? '30d',
  },

  // Encryption
  encryption: {
    masterKey: readSecret('encryption_key.txt') ?? e['ENCRYPTION_KEY'] ?? '',
    algorithm: e['ENCRYPTION_ALGORITHM'] ?? 'aes-256-gcm',
  },

  // Password
  password: {
    pepper: readSecret('password_pepper.txt') ?? e['PASSWORD_PEPPER'] ?? '',
    bcryptRounds: parseInt(e['BCRYPT_ROUNDS'] ?? '12', 10),
  },

  // Security
  security: {
    sessionTimeout: parseInt(e['SESSION_TIMEOUT'] ?? '3600', 10),
    maxLoginAttempts: parseInt(e['MAX_LOGIN_ATTEMPTS'] ?? '5', 10),
    lockoutDuration: parseInt(e['LOCKOUT_DURATION'] ?? '900', 10),
  },

  // CORS
  cors: {
    origin: e['CORS_ORIGIN'] ?? 'http://localhost:3000',
  },

  // Logging
  logging: {
    level: e['LOG_LEVEL'] ?? 'info',
    dir: e['LOG_DIR'] ?? './logs',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(e['RATE_LIMIT_WINDOW_MS'] ?? '900000', 10),
    maxRequests: parseInt(e['RATE_LIMIT_MAX_REQUESTS'] ?? '100', 10),
    loginMaxRequests: parseInt(e['LOGIN_RATE_LIMIT_MAX'] ?? '5', 10),
    loginWindowMs: parseInt(e['LOGIN_RATE_LIMIT_WINDOW_MS'] ?? '900000', 10),
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(e['MAX_FILE_SIZE'] ?? '10485760', 10), // 10MB
    uploadDir: e['UPLOAD_DIR'] ?? './uploads',
  },

  // WebAuthn
  webauthn: {
    rpName: e['WEBAUTHN_RP_NAME'] ?? 'Budget App',
    rpId: e['WEBAUTHN_RP_ID'] ?? 'localhost',
    origin: e['WEBAUTHN_ORIGIN'] ?? 'http://localhost:3000',
  },

  // Feature Flags
  isDevelopment: e['NODE_ENV'] === 'development',
  isProduction: e['NODE_ENV'] === 'production',
  isTest: e['NODE_ENV'] === 'test',
};

// Validate required environment variables
export function validateEnv(): void {
  const missing: string[] = [];

  requiredEnvVars.forEach((varName) => {
    if (!e[varName]) {
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
      console.warn('Warning: PASSWORD_PEPPER not set. Passwords will be less secure.');
    }
    if (!env.redis.password) {
      console.warn('Warning: REDIS_PASSWORD not set. Redis is not password-protected.');
    }
  }
}
