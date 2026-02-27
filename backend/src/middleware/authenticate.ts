import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '@services/auth/tokenService';
import { apiKeyService } from '@services/auth/apiKeyService';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

/**
 * Middleware to authenticate requests using a Bearer access token.
 * Attaches { id: userId } to req.user on success.
 * Rejects tokens with type '2fa_pending' — those are only accepted by authenticateTwoFactor.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const token = authHeader.substring(7);
  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to authenticate the intermediate 2FA step using a twoFactorToken.
 * Only accepts tokens with type '2fa_pending'.
 * Rejects regular access tokens.
 */
export const authenticateTwoFactor = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Two-factor authentication token required'));
  }

  const token = authHeader.substring(7);
  try {
    const payload = tokenService.verifyTwoFactorToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to authenticate requests using an X-API-Key header.
 * Sets req.user and req.apiKeyScopes on success.
 */
export const authenticateApiKey = (req: Request, _res: Response, next: NextFunction): void => {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey || typeof rawKey !== 'string') {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  void apiKeyService
    .authenticate(rawKey)
    .then(({ userId, scopes }) => {
      req.user = { id: userId };
      req.apiKeyScopes = scopes;
      next();
    })
    .catch(() => {
      next(new UnauthorizedError('Invalid or expired API key'));
    });
};

/**
 * Unified auth middleware: accepts JWT Bearer token OR X-API-Key header.
 * JWT auth sets only req.user (full access, no scope restrictions).
 * API key auth sets req.user and req.apiKeyScopes.
 */
export const authenticateAny = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader?.startsWith('Bearer ')) {
    // JWT path — same as authenticate()
    const token = authHeader.substring(7);
    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = { id: payload.sub };
      next();
    } catch (err) {
      next(err);
    }
    return;
  }

  if (apiKey && typeof apiKey === 'string') {
    void apiKeyService
      .authenticate(apiKey)
      .then(({ userId, scopes }) => {
        req.user = { id: userId };
        req.apiKeyScopes = scopes;
        next();
      })
      .catch(() => {
        next(new UnauthorizedError('Invalid or expired API key'));
      });
    return;
  }

  next(new UnauthorizedError('Authentication required'));
};

/**
 * Scope guard middleware factory. Must be used after authenticateAny.
 *
 * - If req.apiKeyScopes is undefined (JWT), grants full access (no-op).
 * - Otherwise checks that the required scope is present, treating
 *   `${resource}:write` as implying `${resource}:read`.
 */
export const requireScope =
  (scope: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    // JWT users bypass all scope checks
    if (!req.apiKeyScopes) {
      return next();
    }

    const scopes = req.apiKeyScopes;
    if (scopes.includes(scope)) {
      return next();
    }

    // write implies read for the same resource
    const [resource, action] = scope.split(':');
    if (action === 'read' && scopes.includes(`${resource}:write`)) {
      return next();
    }

    next(new ForbiddenError('Insufficient API key scopes'));
  };
