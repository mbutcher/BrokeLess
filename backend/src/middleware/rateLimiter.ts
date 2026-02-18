import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import { TooManyRequestsError } from './errorHandler';

/**
 * Rate limiter for authentication endpoints (login, register, refresh).
 * 5 requests per 15 minutes per IP address.
 * Uses in-memory store by default (suitable for single-process deployments).
 * For multi-process/multi-instance deployments, replace the store with
 * a Redis-backed store (rate-limit-redis package).
 */
export const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.loginWindowMs,
  max: env.rateLimit.loginMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many authentication attempts. Please try again later.'));
  },
});

/**
 * General API rate limiter for all other endpoints.
 * 100 requests per 15 minutes per IP address.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many requests. Please try again later.'));
  },
});
