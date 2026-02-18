import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '@services/auth/tokenService';
import { UnauthorizedError } from './errorHandler';

// Extend Express Request to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

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
export const authenticateTwoFactor = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
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
