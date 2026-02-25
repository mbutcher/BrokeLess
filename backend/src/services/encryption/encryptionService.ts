import * as crypto from 'crypto';
import { env } from '@config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length (96 bits)
const AUTH_TAG_LENGTH = 16; // GCM authentication tag length in bytes

class EncryptionService {
  private readonly key: Buffer;

  constructor(masterKey: string) {
    if (!masterKey) {
      throw new Error('Encryption master key is required');
    }
    // Derive a 32-byte key from the master key using SHA-256
    this.key = crypto.createHash('sha256').update(masterKey).digest();
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   * Returns a self-contained string: "iv:authTag:ciphertext" (all base64).
   * A fresh random IV is generated per call — never reused.
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(
      ':'
    );
  }

  /**
   * Decrypt an "iv:authTag:ciphertext" string produced by encrypt().
   * Throws if the authentication tag is invalid (tampered data).
   */
  decrypt(encryptedValue: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const [ivBase64, authTagBase64, ciphertextBase64] = parts;
    const iv = Buffer.from(ivBase64 ?? '', 'base64');
    const authTag = Buffer.from(authTagBase64 ?? '', 'base64');
    const ciphertext = Buffer.from(ciphertextBase64 ?? '', 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /**
   * Compute an HMAC-SHA256 of a value using the encryption key.
   * Used for deterministic, searchable hashes of sensitive values (e.g., email).
   * Returns a 64-character hex string.
   */
  hash(value: string): string {
    return crypto.createHmac('sha256', this.key).update(value).digest('hex');
  }

  /**
   * Compute a plain SHA-256 hash of a token.
   * Used for refresh tokens and backup codes — values that are randomly generated
   * and have sufficient entropy that a keyed HMAC is not required.
   * Returns a 64-character hex string.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

// Singleton instance initialised from environment configuration
export const encryptionService = new EncryptionService(env.encryption.masterKey);
