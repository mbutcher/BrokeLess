import type { Request, Response } from 'express';
import { authService } from '@services/auth/authService';
import { totpService } from '@services/auth/totpService';
import { webauthnService } from '@services/auth/webauthnService';
import { apiKeyService } from '@services/auth/apiKeyService';
import { asyncHandler, UnauthorizedError } from '@middleware/errorHandler';
import { passkeyRepository } from '@repositories/passkeyRepository';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth', // Scoped to auth routes to minimize cookie exposure
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
};

function getRequestMeta(req: Request) {
  return {
    ip: (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace('::ffff:', ''),
    userAgent: req.get('user-agent') ?? 'unknown',
  };
}

class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(
      req.body as { username: string; email: string; password: string }
    );
    res.status(201).json({ status: 'success', data: { user } });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(
      req.body as { username: string; password: string },
      getRequestMeta(req)
    );

    if (result.requiresTwoFactor) {
      res.status(200).json({
        status: 'success',
        data: {
          requiresTwoFactor: true,
          twoFactorToken: result.twoFactorToken,
          methods: result.methods,
        },
      });
      return;
    }

    res.cookie(REFRESH_COOKIE_NAME, result.tokens!.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.tokens!.accessToken,
        user: result.user,
      },
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    res.status(200).json({ status: 'success', data: null });
  });

  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    await authService.logoutAll(req.user!.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    res.status(200).json({ status: 'success', data: null });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token not found');
    }
    const result = await authService.refreshTokens(rawRefreshToken, getRequestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.tokens!.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      status: 'success',
      data: { accessToken: result.tokens!.accessToken, user: result.user },
    });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getPublicUser(req.user!.id);
    res.status(200).json({ status: 'success', data: { user } });
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.status(200).json({ status: 'success', data: { user } });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await authService.changePassword(req.user!.id, { currentPassword, newPassword });
    res.status(200).json({ status: 'success', data: null });
  });

  // ─── TOTP ─────────────────────────────────────────────────────────────────

  totpSetup = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getPublicUser(req.user!.id);
    const setup = await totpService.generateSetup(req.user!.id, user.email);
    res.status(200).json({ status: 'success', data: setup });
  });

  totpConfirm = asyncHandler(async (req: Request, res: Response) => {
    const { token, pendingSecret } = req.body as { token: string; pendingSecret: string };
    const { backupCodes } = await totpService.confirmSetup(req.user!.id, token, pendingSecret);
    res.status(200).json({ status: 'success', data: { backupCodes } });
  });

  totpVerify = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body as { token: string };
    const valid = await totpService.verifyToken(req.user!.id, token);
    if (!valid) throw new UnauthorizedError('Invalid verification code');

    const result = await authService.completeLogin(req.user!.id, getRequestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.tokens!.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      status: 'success',
      data: { accessToken: result.tokens!.accessToken, user: result.user },
    });
  });

  totpBackupVerify = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body as { code: string };
    const valid = await totpService.verifyBackupCode(req.user!.id, code);
    if (!valid) throw new UnauthorizedError('Invalid backup code');

    const result = await authService.completeLogin(req.user!.id, getRequestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.tokens!.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      status: 'success',
      data: { accessToken: result.tokens!.accessToken, user: result.user },
    });
  });

  totpDisable = asyncHandler(async (req: Request, res: Response) => {
    await totpService.disable(req.user!.id);
    res.status(200).json({ status: 'success', data: null });
  });

  // ─── WebAuthn ─────────────────────────────────────────────────────────────

  webAuthnRegisterOptions = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getPublicUser(req.user!.id);
    const options = await webauthnService.generateRegistrationOptions(req.user!.id, user.email);
    res.status(200).json({ status: 'success', data: options });
  });

  webAuthnRegisterVerify = asyncHandler(async (req: Request, res: Response) => {
    const { response, deviceName } = req.body as { response: unknown; deviceName?: string };
    const passkey = await webauthnService.verifyRegistration(
      req.user!.id,
      response as Parameters<typeof webauthnService.verifyRegistration>[1],
      deviceName
    );
    res.status(201).json({ status: 'success', data: { passkey } });
  });

  webAuthnAuthenticateOptions = asyncHandler(async (_req: Request, res: Response) => {
    // No userId provided — returns options without restricting credentials
    const { options, challengeToken } = await webauthnService.generateAuthenticationOptions();
    res.status(200).json({ status: 'success', data: { ...options, challengeToken } });
  });

  webAuthnAuthenticateVerify = asyncHandler(async (req: Request, res: Response) => {
    const { response, challengeToken } = req.body as {
      response: unknown;
      challengeToken: string;
    };
    const userId = await webauthnService.verifyAuthentication(
      response as Parameters<typeof webauthnService.verifyAuthentication>[0],
      challengeToken
    );

    const result = await authService.completeLogin(userId, getRequestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.tokens!.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      status: 'success',
      data: { accessToken: result.tokens!.accessToken, user: result.user },
    });
  });

  // ─── Passkey management ────────────────────────────────────────────────────

  listPasskeys = asyncHandler(async (req: Request, res: Response) => {
    const passkeys = await passkeyRepository.findAllForUser(req.user!.id);
    // Return safe subset (no public key bytes)
    const safePasskeys = passkeys.map(({ id, deviceName, transports, lastUsedAt, createdAt }) => ({
      id,
      deviceName,
      transports,
      lastUsedAt,
      createdAt,
    }));
    res.status(200).json({ status: 'success', data: { passkeys: safePasskeys } });
  });

  deletePasskey = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await passkeyRepository.delete(id!, req.user!.id);
    res.status(200).json({ status: 'success', data: null });
  });

  // ─── Session management ────────────────────────────────────────────────────

  listSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    // Read the refresh token cookie to identify the current session
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rawRefreshToken: string | undefined = req.cookies[REFRESH_COOKIE_NAME];
    let currentTokenHash: string | null = null;
    if (rawRefreshToken) {
      const { encryptionService } = await import('@services/encryption/encryptionService');
      currentTokenHash = encryptionService.hashToken(rawRefreshToken);
    }
    const sessions = await authService.listSessions(userId, currentTokenHash);
    res.json({ status: 'success', data: { sessions } });
  });

  revokeSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params['id'];
    if (!sessionId) throw new UnauthorizedError('Session ID required');
    const revoked = await authService.revokeSession(userId, sessionId);
    if (!revoked) {
      res.status(404).json({ status: 'error', error: 'Session not found' });
      return;
    }
    res.json({ status: 'success', data: null });
  });

  // ─── API Key management ────────────────────────────────────────────────────

  createApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { label, scopes, expiresAt } = req.body as {
      label: string;
      scopes: string[];
      expiresAt?: string;
    };
    const result = await apiKeyService.create(req.user!.id, {
      label,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    res.status(201).json({ status: 'success', data: result });
  });

  listApiKeys = asyncHandler(async (req: Request, res: Response) => {
    const apiKeys = await apiKeyService.list(req.user!.id);
    res.status(200).json({ status: 'success', data: { apiKeys } });
  });

  deleteApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await apiKeyService.delete(req.user!.id, id!);
    res.status(200).json({ status: 'success', data: null });
  });

  /** GET /auth/registration-status — no auth required */
  getRegistrationStatus = asyncHandler(async (_req: Request, res: Response) => {
    const status = await authService.getRegistrationStatus();
    res.json({ status: 'success', data: status });
  });
}

export const authController = new AuthController();
