import * as fs from 'fs';
import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';
import { getDatabase } from '@config/database';
import { env } from '@config/env';

/**
 * Read a secret file from the Docker secrets location or local secrets directory.
 * Returns the trimmed value, or null if the file does not exist.
 */
function readSecretFile(name: string): string | null {
  const dockerPath = `/run/secrets/${name}`;
  if (fs.existsSync(dockerPath)) {
    return fs.readFileSync(dockerPath, 'utf-8').trim();
  }
  const localPath = `secrets/production/${name}.txt`;
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath, 'utf-8').trim();
  }
  return null;
}

export interface InitialSecret {
  name: string;
  description: string;
  value: string;
}

export interface InitialSecretsResponse {
  /** The single master secret the user must back up. All others are derived from this. */
  masterSecret: string | null;
  /** All derived sub-keys shown for reference (e.g. for direct DB access). */
  secrets: InitialSecret[];
}

class SetupController {
  /**
   * GET /api/v1/setup/initial-secrets
   *
   * Returns the master secret and all derived sub-keys exactly once — only while no
   * household (and therefore no user) exists. The moment the owner completes
   * registration, this endpoint returns 410.
   *
   * Security invariant: if household count is 0, the app has never been used, so
   * only the person who just deployed it can reach this URL.
   */
  getInitialSecrets = asyncHandler(async (_req: Request, res: Response) => {
    // Guard: only available before the first household/user is created
    const result = (await getDatabase()('households').count({ cnt: '*' }).first()) as
      | { cnt: string | number }
      | undefined;

    if (Number(result?.cnt ?? 0) > 0) {
      throw new AppError('Initial secrets are no longer available after first registration.', 410);
    }

    // Master secret — only present in production (derived key setup)
    const masterSecret = readSecretFile('master_secret');

    // Build derived-secret list from values already loaded into env (avoids
    // re-reading most files). Production-only secrets that are NOT in env are
    // read directly from the secret files.
    const secrets: InitialSecret[] = [
      {
        name: 'JWT Secret',
        description:
          'Signs all access and refresh tokens. Rotating this invalidates all active sessions.',
        value: env.jwt.secret,
      },
      {
        name: 'Encryption Key',
        description: 'AES-256-GCM master key for field-level encryption (payee, notes, email).',
        value: env.encryption.masterKey,
      },
      {
        name: 'Password Pepper',
        description:
          'Mixed into every password hash via Argon2id. Changing this after setup locks out all users.',
        value: env.password.pepper,
      },
      {
        name: 'Database Password',
        description: 'MariaDB application user password (budget_user).',
        value: env.db.password,
      },
    ];

    const backupEncryptionKey = readSecretFile('backup_encryption_key');
    if (backupEncryptionKey) {
      secrets.push({
        name: 'Backup Encryption Key',
        description: 'Used to encrypt database backup archives.',
        value: backupEncryptionKey,
      });
    }

    const data: InitialSecretsResponse = { masterSecret, secrets };
    res.json({ status: 'success', data });
  });
}

export const setupController = new SetupController();
