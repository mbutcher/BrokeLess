import { Router } from 'express';
import { authController } from '@controllers/authController';
import { authenticate, authenticateTwoFactor } from '@middleware/authenticate';
import { authRateLimiter } from '@middleware/rateLimiter';
import { validateRequest } from '@middleware/validateRequest';
import {
  registerSchema,
  loginSchema,
  totpTokenSchema,
  totpConfirmSchema,
  backupCodeSchema,
  webAuthnDeviceNameSchema,
  challengeTokenSchema,
} from '@validators/authValidators';

const router = Router();

// ─── Registration & Login ─────────────────────────────────────────────────────
router.post('/register', authRateLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.post('/refresh', authRateLimiter, authController.refresh);
router.get('/me', authenticate, authController.me);

// ─── TOTP / 2FA ───────────────────────────────────────────────────────────────
router.post('/totp/setup', authenticate, authController.totpSetup);
router.post('/totp/confirm', authenticate, validateRequest(totpConfirmSchema), authController.totpConfirm);
router.post('/totp/verify', authenticateTwoFactor, validateRequest(totpTokenSchema), authController.totpVerify);
router.post('/totp/backup-verify', authenticateTwoFactor, validateRequest(backupCodeSchema), authController.totpBackupVerify);
router.delete('/totp', authenticate, authController.totpDisable);

// ─── WebAuthn / Passkeys ──────────────────────────────────────────────────────
router.post('/webauthn/register/options', authenticate, authController.webAuthnRegisterOptions);
router.post('/webauthn/register/verify', authenticate, validateRequest(webAuthnDeviceNameSchema), authController.webAuthnRegisterVerify);
router.post('/webauthn/authenticate/options', authRateLimiter, authController.webAuthnAuthenticateOptions);
router.post('/webauthn/authenticate/verify', authRateLimiter, validateRequest(challengeTokenSchema), authController.webAuthnAuthenticateVerify);

// ─── Passkey management ───────────────────────────────────────────────────────
router.get('/passkeys', authenticate, authController.listPasskeys);
router.delete('/passkeys/:id', authenticate, authController.deletePasskey);

export default router;
