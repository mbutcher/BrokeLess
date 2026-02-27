import { env } from '@config/env';
import { logger, loggers } from '@utils/logger';
import { ConflictError, UnauthorizedError } from '@middleware/errorHandler';
import { encryptionService } from '@services/encryption/encryptionService';
import { categoryService } from '@services/core/categoryService';
import { passwordService } from './passwordService';
import { tokenService } from './tokenService';
import { userRepository } from '@repositories/userRepository';
import { refreshTokenRepository } from '@repositories/refreshTokenRepository';
import type {
  RegisterInput,
  LoginInput,
  RequestMeta,
  AuthResult,
  AuthTokens,
  PublicUser,
  SessionInfo,
  UpdateProfileData,
} from '@typings/auth.types';

/**
 * Parse a User-Agent string into a human-readable device name.
 * Returns a short label like "Chrome on macOS" or "Safari on iPhone".
 */
function parseDeviceName(userAgent: string): string {
  const ua = userAgent;
  // Browser detection (order matters — Edge must precede Chrome)
  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/MSIE|Trident/.test(ua)) browser = 'Internet Explorer';

  // OS detection
  let os = 'Unknown OS';
  if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
}

const GENERIC_AUTH_ERROR = 'Invalid email or password';
const LOCKOUT_ERROR = 'Account temporarily locked due to too many failed login attempts';

class AuthService {
  /**
   * Register a new user account.
   * Throws ConflictError if the email is already registered (without confirming the email exists).
   */
  async register(input: RegisterInput): Promise<PublicUser> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const emailHash = encryptionService.hash(normalizedEmail);

    // Check for duplicate without revealing whether email exists
    const exists = await userRepository.existsByEmailHash(emailHash);
    if (exists) {
      // Use the same ConflictError message regardless of reason to avoid user enumeration
      throw new ConflictError('Registration failed. Please try a different email address.');
    }

    const { errors } = passwordService.validate(input.password);
    if (errors.length > 0) {
      throw new ConflictError(errors.join('. '));
    }

    const emailEncrypted = encryptionService.encrypt(normalizedEmail);
    const passwordHash = await passwordService.hash(input.password);

    const user = await userRepository.create({ emailEncrypted, emailHash, passwordHash });

    // Seed default categories for the new user (non-fatal if this fails)
    categoryService.seedDefaultsForUser(user.id).catch((err: unknown) => {
      logger.error('Failed to seed default categories for user', { userId: user.id, err });
    });

    loggers.auth('user_registered', user.id);
    logger.info('New user registered', { userId: user.id });

    return this.toPublicUser(user, normalizedEmail);
  }

  /**
   * Authenticate a user with email + password.
   *
   * Returns one of:
   *   - Full tokens (no 2FA): { tokens, user }
   *   - 2FA required:         { requiresTwoFactor: true, twoFactorToken, methods }
   *
   * SECURITY: Always runs Argon2 verify (even when user not found) to prevent
   * timing attacks that could reveal whether an email is registered.
   */
  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const emailHash = encryptionService.hash(normalizedEmail);

    const user = await userRepository.findByEmailHash(emailHash);

    if (!user) {
      // Verify against a real dummy hash to maintain consistent response time.
      // DUMMY_HASH is a Promise (computed at startup) so this always runs the
      // full Argon2id computation, preventing timing-based user enumeration.
      await passwordService.verify(input.password, await passwordService.DUMMY_HASH);
      loggers.security('login_unknown_email', { ip: meta.ip });
      throw new UnauthorizedError(GENERIC_AUTH_ERROR);
    }

    // Check lockout BEFORE verifying password
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      loggers.security('login_account_locked', { userId: user.id, ip: meta.ip });
      throw new UnauthorizedError(LOCKOUT_ERROR);
    }

    const passwordValid = await passwordService.verify(input.password, user.passwordHash);

    if (!passwordValid) {
      const newAttempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        newAttempts >= env.security.maxLoginAttempts
          ? new Date(Date.now() + env.security.lockoutDuration * 1000)
          : null;

      await userRepository.updateFailedAttempts(user.id, newAttempts, lockedUntil);

      if (lockedUntil) {
        loggers.security('account_locked', {
          userId: user.id,
          attempts: newAttempts,
          ip: meta.ip,
        });
      }

      loggers.auth('login_failed', user.id, { ip: meta.ip });
      throw new UnauthorizedError(GENERIC_AUTH_ERROR);
    }

    // Password correct — reset failure tracking
    await userRepository.resetFailedAttempts(user.id);
    await userRepository.updateLastLogin(user.id);

    // If 2FA is enabled, issue an intermediate token instead of full access
    if (user.totpEnabled || user.webauthnEnabled) {
      const twoFactorToken = tokenService.signTwoFactorToken(user.id);
      const methods: Array<'totp' | 'webauthn'> = [];
      if (user.totpEnabled) methods.push('totp');
      if (user.webauthnEnabled) methods.push('webauthn');

      loggers.auth('login_2fa_required', user.id, { methods, ip: meta.ip });
      return { requiresTwoFactor: true, twoFactorToken, methods };
    }

    const tokens = await this.issueTokens(user.id, meta);
    loggers.auth('login_success', user.id, { ip: meta.ip });

    return { tokens, user: this.toPublicUser(user, normalizedEmail) };
  }

  /**
   * Complete a login that required 2FA — called after TOTP or WebAuthn verification.
   * The userId has already been validated by the 2FA service.
   */
  async completeLogin(userId: string, meta: RequestMeta): Promise<AuthResult> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError(GENERIC_AUTH_ERROR);

    const tokens = await this.issueTokens(userId, meta);
    loggers.auth('login_2fa_success', userId, { ip: meta.ip });

    const email = encryptionService.decrypt(user.emailEncrypted);
    return { tokens, user: this.toPublicUser(user, email) };
  }

  /**
   * Rotate a refresh token (issue new access + refresh tokens).
   * Implements rotation with reuse detection:
   *   - If a revoked token is presented, all user sessions are killed (potential theft).
   */
  async refreshTokens(rawRefreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    const tokenHash = encryptionService.hashToken(rawRefreshToken);
    const storedToken = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reuse detection: if token is already revoked, kill all sessions
    if (storedToken.isRevoked) {
      await refreshTokenRepository.revokeAllForUser(storedToken.userId);
      loggers.security('refresh_token_reuse_detected', {
        userId: storedToken.userId,
        ip: meta.ip,
      });
      throw new UnauthorizedError('Session invalidated due to suspicious activity');
    }

    if (storedToken.expiresAt < new Date()) {
      await refreshTokenRepository.revokeByTokenHash(tokenHash);
      throw new UnauthorizedError('Refresh token expired');
    }

    // Revoke the used token and issue fresh ones
    await refreshTokenRepository.revokeByTokenHash(tokenHash);

    const user = await userRepository.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account not found or inactive');
    }

    const tokens = await this.issueTokens(storedToken.userId, meta);
    const email = encryptionService.decrypt(user.emailEncrypted);

    loggers.auth('tokens_refreshed', storedToken.userId, { ip: meta.ip });
    return { tokens, user: this.toPublicUser(user, email) };
  }

  /** Revoke the refresh token for the current session (logout). */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = encryptionService.hashToken(rawRefreshToken);
    await refreshTokenRepository.revokeByTokenHash(tokenHash);
  }

  /** Revoke all refresh tokens for a user (logout all sessions). */
  async logoutAll(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllForUser(userId);
    loggers.auth('logout_all_sessions', userId);
  }

  /** Fetch the public profile for a user. */
  async getPublicUser(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');
    const email = encryptionService.decrypt(user.emailEncrypted);
    return this.toPublicUser(user, email);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async issueTokens(userId: string, meta: RequestMeta): Promise<AuthTokens> {
    const accessToken = tokenService.signAccessToken(userId);
    const rawRefreshToken = tokenService.signRefreshToken(userId);
    const tokenHash = encryptionService.hashToken(rawRefreshToken);
    const fingerprint = tokenService.computeFingerprint(meta.ip, meta.userAgent);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await refreshTokenRepository.create({
      userId,
      tokenHash,
      deviceFingerprint: fingerprint,
      userAgent: meta.userAgent.substring(0, 512),
      deviceName: parseDeviceName(meta.userAgent).substring(0, 100),
      ipAddress: meta.ip,
      expiresAt,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /** List all active sessions for a user, marking the current one if the refresh token hash is provided. */
  async listSessions(userId: string, currentTokenHash: string | null): Promise<SessionInfo[]> {
    return refreshTokenRepository.listActiveForUser(userId, currentTokenHash);
  }

  /** Revoke a specific session. Returns false if not found or already revoked. */
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    return refreshTokenRepository.revokeByIdForUser(sessionId, userId);
  }

  /** Update user profile preferences. */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<PublicUser> {
    await userRepository.updatePreferences(userId, data);
    return this.getPublicUser(userId);
  }

  private toPublicUser(
    user: {
      id: string;
      totpEnabled: boolean;
      webauthnEnabled: boolean;
      emailVerified: boolean;
      defaultCurrency: string;
      locale: string;
      dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
      timeFormat: '12h' | '24h';
      timezone: string;
      weekStart: 'sunday' | 'monday' | 'saturday';
      createdAt: Date;
    },
    email: string
  ): PublicUser {
    return {
      id: user.id,
      email,
      totpEnabled: user.totpEnabled,
      webauthnEnabled: user.webauthnEnabled,
      emailVerified: user.emailVerified,
      defaultCurrency: user.defaultCurrency,
      locale: user.locale,
      dateFormat: user.dateFormat,
      timeFormat: user.timeFormat,
      timezone: user.timezone,
      weekStart: user.weekStart,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
