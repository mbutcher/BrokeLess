import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Get configuration from environment (bracket notation for noPropertyAccessFromIndexSignature)
const e = process.env;
const NODE_ENV = e['NODE_ENV'] ?? 'development';
const LOG_LEVEL = e['LOG_LEVEL'] ?? (NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = e['LOG_DIR'] ?? './logs';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${String(timestamp)} [${String(level)}]: ${String(message)}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'budget-app-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: NODE_ENV === 'development' ? consoleFormat : logFormat,
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
  // Don't exit on uncaught exception
  exitOnError: false,
});

// Redact sensitive information from logs
const sensitiveFields = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apiKey',
  'api_key',
  'encryption_key',
  'jwt_secret',
  'db_password',
];

logger.on('data', (info: unknown) => {
  // Redact sensitive fields recursively
  const redactObject = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const record = obj as Record<string, unknown>;
    const redacted: Record<string, unknown> = { ...record };
    Object.keys(redacted).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = redactObject(redacted[key]);
      }
    });
    return redacted;
  };

  return redactObject(info);
});

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Utility functions for structured logging
export const loggers = {
  // Log database queries (use sparingly to avoid performance issues)
  query: (query: string, params?: unknown): void => {
    logger.debug('Database Query', { query, params });
  },

  // Log API requests
  request: (method: string, url: string, metadata?: Record<string, unknown>): void => {
    logger.info('API Request', { method, url, ...metadata });
  },

  // Log authentication events
  auth: (event: string, userId?: string, metadata?: Record<string, unknown>): void => {
    logger.info('Auth Event', { event, userId, ...metadata });
  },

  // Log security events
  security: (event: string, metadata?: Record<string, unknown>): void => {
    logger.warn('Security Event', { event, ...metadata });
  },

  // Log errors with context
  error: (error: Error, context?: Record<string, unknown>): void => {
    logger.error('Error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  },

  // Log performance metrics
  performance: (
    operation: string,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): void => {
    logger.debug('Performance', { operation, durationMs, ...metadata });
  },
};

export default logger;
