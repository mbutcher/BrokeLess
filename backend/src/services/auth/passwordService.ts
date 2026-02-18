import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { env } from '@config/env';

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

/**
 * A real Argon2id hash of a random value, computed once at startup.
 * Used when a user is not found to prevent timing attacks: we run a full Argon2id
 * verification instead of returning immediately (which would be faster and reveal
 * whether the email is registered).
 *
 * Using a real hash (not a fake format string) ensures argon2.verify() runs the
 * full computation time rather than throwing on an invalid hash format.
 */
const DUMMY_HASH: Promise<string> = argon2.hash(
  crypto.randomBytes(32).toString('hex'),
  ARGON2_OPTIONS
);

class PasswordService {
  /**
   * Pre-computed Argon2id hash for timing-safe "user not found" responses.
   * Access via passwordService.DUMMY_HASH (a Promise, resolved at startup).
   */
  readonly DUMMY_HASH: Promise<string> = DUMMY_HASH;

  /**
   * Hash a password using Argon2id.
   * The pepper is prepended to the password before hashing so that even if
   * the database is compromised the hashes cannot be cracked without the pepper.
   */
  async hash(password: string): Promise<string> {
    const peppered = env.password.pepper + password;
    return argon2.hash(peppered, ARGON2_OPTIONS);
  }

  /**
   * Verify a password against a stored Argon2id hash.
   * Returns false (not throws) for wrong password — callers handle the error logic.
   */
  async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const peppered = env.password.pepper + password;
      return await argon2.verify(storedHash, peppered, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  }

  /**
   * Validate password complexity requirements.
   * Returns a list of validation errors; empty array means valid.
   */
  validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      errors.push(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters`);
    }

    return { valid: errors.length === 0, errors };
  }
}

export const passwordService = new PasswordService();
