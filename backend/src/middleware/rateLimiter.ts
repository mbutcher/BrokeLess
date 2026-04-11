import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import { TooManyRequestsError } from './errorHandler';

// Rate limiting is only enforced in production. Dev and staging use a noop so
// repeated logins / reseeds / test runs don't lock the test user out.
const noopLimiter: RequestHandler = (_req, _res, next) => next();

/**
 * Rate limiter for credential-based auth endpoints (login, register, WebAuthn authenticate).
 * 5 requests per 15 minutes per IP address.
 * Disabled outside production (dev, staging, test).
 */
export const authRateLimiter: RequestHandler = !env.isProduction
  ? noopLimiter
  : rateLimit({
      windowMs: env.rateLimit.loginWindowMs,
      max: env.rateLimit.loginMaxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, _res, next) => {
        next(new TooManyRequestsError('Too many authentication attempts. Please try again later.'));
      },
    });

/**
 * Rate limiter for the token refresh endpoint.
 * More lenient than the login limiter because refresh is called automatically
 * by the frontend whenever an access token expires — it is not a user-initiated
 * credential attempt.
 * 30 requests per 15 minutes per IP address.
 * Disabled outside production (dev, staging, test).
 */
export const refreshRateLimiter: RequestHandler = !env.isProduction
  ? noopLimiter
  : rateLimit({
      windowMs: env.rateLimit.loginWindowMs,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, _res, next) => {
        next(new TooManyRequestsError('Too many token refresh requests. Please try again later.'));
      },
    });

/**
 * Rate limiter for WebAuthn authenticate endpoints (options + verify).
 * 15 requests per 15 minutes per IP address.
 * Disabled outside production (dev, staging, test).
 */
export const webauthnRateLimiter: RequestHandler = !env.isProduction
  ? noopLimiter
  : rateLimit({
      windowMs: env.rateLimit.loginWindowMs,
      max: 15,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, _res, next) => {
        next(new TooManyRequestsError('Too many WebAuthn attempts. Please try again later.'));
      },
    });

/**
 * General API rate limiter for all other endpoints.
 * 100 requests per 15 minutes per IP address.
 * Disabled outside production (dev, staging, test).
 */
export const apiRateLimiter: RequestHandler = !env.isProduction
  ? noopLimiter
  : rateLimit({
      windowMs: env.rateLimit.windowMs,
      max: env.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, _res, next) => {
        next(new TooManyRequestsError('Too many requests. Please try again later.'));
      },
    });
