import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { env } from '@config/env';
import { UnauthorizedError } from '@middleware/errorHandler';
import type {
  AccessTokenPayload,
  TwoFactorTokenPayload,
} from '@types/auth.types';

class TokenService {
  private readonly secret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;
  private readonly twoFactorExpiry = '5m';

  constructor() {
    this.secret = env.jwt.secret;
    this.accessExpiry = env.jwt.expiry; // '15m'
    this.refreshExpiry = env.jwt.refreshExpiry; // '30d'
  }

  /** Sign a short-lived access token (15 min). Type: 'access'. */
  signAccessToken(userId: string): string {
    return jwt.sign({ sub: userId, type: 'access' }, this.secret, {
      expiresIn: this.accessExpiry,
    });
  }

  /** Sign a long-lived refresh token (30 days). Type: 'refresh'. */
  signRefreshToken(userId: string): string {
    return jwt.sign({ sub: userId, type: 'refresh' }, this.secret, {
      expiresIn: this.refreshExpiry,
    });
  }

  /**
   * Sign a short-lived intermediate token used during the 2FA step (5 min).
   * Type: '2fa_pending'. The authenticate middleware REJECTS this type;
   * only authenticateTwoFactor accepts it.
   */
  signTwoFactorToken(userId: string): string {
    return jwt.sign({ sub: userId, type: '2fa_pending' }, this.secret, {
      expiresIn: this.twoFactorExpiry,
    });
  }

  /**
   * Verify and decode an access token.
   * Throws UnauthorizedError if the token is missing, invalid, expired,
   * or has the wrong type (e.g., a 2fa_pending token passed to a protected route).
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, this.secret) as AccessTokenPayload;
      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * Verify and decode a two-factor intermediate token.
   * Throws UnauthorizedError if invalid or wrong type.
   */
  verifyTwoFactorToken(token: string): TwoFactorTokenPayload {
    try {
      const payload = jwt.verify(token, this.secret) as TwoFactorTokenPayload;
      if (payload.type !== '2fa_pending') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired two-factor token');
    }
  }

  /**
   * Compute a stable device fingerprint from IP + User-Agent.
   * Used for binding refresh tokens to the issuing device.
   */
  computeFingerprint(ip: string, userAgent: string): string {
    return crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}`)
      .digest('hex');
  }
}

export const tokenService = new TokenService();
