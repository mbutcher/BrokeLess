import 'dotenv/config';
import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { buildSwaggerSpec } from './utils/swagger';

// Configuration
import { env, validateEnv } from './config/env';
import { logger } from './utils/logger';
import { initializeDatabase, checkDatabaseHealth, closeDatabase } from './config/database';
import {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
} from './middleware/errorHandler';

// Validate environment variables before starting
try {
  validateEnv();
  logger.info('✅ Environment variables validated');
} catch (error) {
  logger.error('❌ Environment validation failed', { error });
  process.exit(1);
}

// Setup global error handlers
handleUnhandledRejection();
handleUncaughtException();

const app: Application = express();

// API docs — mounted before helmet so swagger-ui CSS/JS are not blocked by CSP
const swaggerSpec = buildSwaggerSpec();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.cors.origin,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging in development
if (env.isDevelopment) {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();

  const health = {
    status: dbHealth ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
    checks: {
      database: dbHealth ? 'ok' : 'error',
    },
  };

  res.status(dbHealth ? 200 : 503).json(health);
});

// API routes
import apiRouter from './routes/index';
import { simplefinScheduler } from './services/integrations/simplefinScheduler';
import { netWorthScheduler } from './services/netWorthScheduler';
import { recurringTransactionScheduler } from './services/recurringTransactionScheduler';
import { notificationScheduler } from './services/notifications/notificationScheduler';
app.use('/api/v1', apiRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection and run pending migrations
    const db = await initializeDatabase();
    logger.info('Running database migrations...');
    await db.migrate.latest();
    logger.info('Migrations complete');

    // Start background services
    simplefinScheduler.start();
    netWorthScheduler.start();
    recurringTransactionScheduler.start();
    notificationScheduler.start();

    // Start server
    const server = app.listen(env.appPort, () => {
      logger.info('🚀 Server started successfully', {
        port: env.appPort,
        environment: env.nodeEnv,
        nodeVersion: process.version,
      });
      logger.info(`🏥 Health check: http://localhost:${env.appPort}/health`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      simplefinScheduler.shutdown();
      netWorthScheduler.shutdown();
      recurringTransactionScheduler.shutdown();
      notificationScheduler.shutdown();
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.close(async () => {
        await closeDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
void startServer();

export default app;
