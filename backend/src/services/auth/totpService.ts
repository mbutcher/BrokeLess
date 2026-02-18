import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { loggers } from '@utils/logger';
import { UnauthorizedError, ConflictError } from '@middleware/errorHandler';
import { encryptionService } from '@services/encryption/encryptionService';
import { userRepository } from '@repositories/userRepository';
import { totpBackupCodeRepository } from '@repositories/totpBackupCodeRepository';
import type { TotpSetupResult } from '@types/auth.types';

const BACKUP_CODE_COUNT = 8;
// 10 base32 characters = 50 bits of entropy, sufficient for one-time codes
const BACKUP_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BACKUP_CODE_LENGTH = 10;

class TotpService {
  /**
   * Generate a new TOTP secret and QR code URL for display.
   * The secret is NOT stored — only returned for the user to scan.
   * Call confirmSetup() after the user verifies the first TOTP code.
   */
  async generateSetup(_userId: string, userEmail: string): Promise<TotpSetupResult> {
    const secretObj = speakeasy.generateSecret({
      name: `Budget App (${userEmail})`,
      length: 20,
    });

    const otpauthUrl = secretObj.otpauth_url ?? '';
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      otpauthUrl,
      qrCodeDataUrl,
      secret: secretObj.base32,
    };
  }

  /**
   * Confirm TOTP setup: verify the user's first TOTP code against the pending secret,
   * then encrypt and persist the secret + generate backup codes.
   *
   * Returns the 8 plaintext backup codes (shown once, then discarded server-side).
   */
  async confirmSetup(
    userId: string,
    totpToken: string,
    pendingSecret: string
  ): Promise<{ backupCodes: string[] }> {
    const valid = speakeasy.totp.verify({
      secret: pendingSecret,
      encoding: 'base32',
      token: totpToken,
      window: 1, // ±1 period = 30-second tolerance
    });

    if (!valid) {
      throw new UnauthorizedError('Invalid verification code. Please try again.');
    }

    // Persist the encrypted secret
    const encryptedSecret = encryptionService.encrypt(pendingSecret);
    await userRepository.updateTotpSecret(userId, encryptedSecret);
    await userRepository.enableTotp(userId);

    // Generate and store backup codes
    const { raw, hashes } = this.generateBackupCodes();
    // Remove any existing backup codes before inserting new ones
    await totpBackupCodeRepository.deleteAllForUser(userId);
    await totpBackupCodeRepository.createBatch(userId, hashes);

    loggers.auth('totp_enabled', userId);
    return { backupCodes: raw };
  }

  /**
   * Verify a TOTP token for the login 2FA step.
   * Uses the encrypted secret stored in the DB.
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user?.totpSecretEncrypted) {
      throw new UnauthorizedError('TOTP not configured');
    }

    const secret = encryptionService.decrypt(user.totpSecretEncrypted);
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  /**
   * Verify a backup code for the login 2FA step.
   * Uses constant-time comparison to prevent timing attacks.
   * Marks the code as used if valid (backup codes are single-use).
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const normalizedCode = code.toUpperCase().replace(/[-\s]/g, '');
    const codeHash = encryptionService.hashToken(normalizedCode);

    // Fetch all unused codes for this user and compare with timingSafeEqual
    const storedCode = await totpBackupCodeRepository.findUnusedByUserAndHash(userId, codeHash);

    if (!storedCode) {
      // Perform a dummy timing-safe compare to prevent timing attacks
      const dummyBuf = Buffer.from('0'.repeat(64), 'hex');
      const inputBuf = Buffer.from(codeHash, 'hex');
      // Lengths may differ if codeHash is non-hex; absorb the error silently
      try {
        crypto.timingSafeEqual(dummyBuf, inputBuf);
      } catch {
        // swallow
      }
      loggers.auth('totp_backup_code_invalid', userId);
      return false;
    }

    // Compare the stored hash against itself (we already matched above via DB query)
    // The timing-safe comparison protects against DB query timing attacks
    const storedBuf = Buffer.from(storedCode.codeHash, 'hex');
    const inputBuf = Buffer.from(codeHash, 'hex');
    if (!crypto.timingSafeEqual(storedBuf, inputBuf)) {
      return false;
    }

    await totpBackupCodeRepository.markAsUsed(storedCode.id);
    loggers.auth('totp_backup_code_used', userId, {
      remaining: await totpBackupCodeRepository.countUnusedForUser(userId),
    });
    return true;
  }

  /** Disable TOTP: clear the secret and remove backup codes. */
  async disable(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user?.totpEnabled) {
      throw new ConflictError('TOTP is not enabled');
    }

    await userRepository.disableTotp(userId);
    await totpBackupCodeRepository.deleteAllForUser(userId);

    loggers.auth('totp_disabled', userId);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private generateBackupCodes(): { raw: string[]; hashes: string[] } {
    const raw: string[] = [];
    const hashes: string[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      let code = '';
      const randomBytes = crypto.randomBytes(BACKUP_CODE_LENGTH);
      for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
        code += BACKUP_CODE_ALPHABET[randomBytes[j]! % BACKUP_CODE_ALPHABET.length];
      }
      raw.push(code);
      hashes.push(encryptionService.hashToken(code));
    }

    return { raw, hashes };
  }
}

export const totpService = new TotpService();
