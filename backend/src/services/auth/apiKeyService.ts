import { randomBytes } from 'crypto';
import { encryptionService } from '@services/encryption/encryptionService';
import { apiKeyRepository } from '@repositories/apiKeyRepository';
import { NotFoundError } from '@middleware/errorHandler';
import type { PublicApiKey } from '@typings/auth.types';

export const VALID_SCOPES = [
  'accounts:read',
  'transactions:read',
  'transactions:write',
  'budget:read',
  'reports:read',
  'simplefin:read',
  'simplefin:write',
] as const;

export type ApiKeyScope = (typeof VALID_SCOPES)[number];

function toPublicApiKey(key: {
  id: string;
  label: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}): PublicApiKey {
  return {
    id: key.id,
    label: key.label,
    scopes: key.scopes,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
  };
}

class ApiKeyService {
  async create(
    userId: string,
    opts: { label: string; scopes: string[]; expiresAt?: Date | null }
  ): Promise<{ apiKey: PublicApiKey; rawKey: string }> {
    const rawKey = randomBytes(32).toString('base64url'); // 43 URL-safe chars
    const keyHash = encryptionService.hashToken(rawKey);

    const created = await apiKeyRepository.create({
      userId,
      label: opts.label,
      keyHash,
      scopes: opts.scopes,
      expiresAt: opts.expiresAt ?? null,
    });

    return { apiKey: toPublicApiKey(created), rawKey };
  }

  async list(userId: string): Promise<PublicApiKey[]> {
    const keys = await apiKeyRepository.findAllForUser(userId);
    return keys.map(toPublicApiKey);
  }

  async authenticate(rawKey: string): Promise<{ userId: string; scopes: string[] }> {
    const hash = encryptionService.hashToken(rawKey);
    const key = await apiKeyRepository.findByHash(hash);

    if (!key) {
      throw new Error('Invalid API key');
    }
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new Error('API key has expired');
    }

    // Fire-and-forget last-used update
    void apiKeyRepository.touchLastUsed(hash).catch(() => undefined);

    return { userId: key.userId, scopes: key.scopes };
  }

  async delete(userId: string, keyId: string): Promise<void> {
    const deleted = await apiKeyRepository.delete(keyId, userId);
    if (!deleted) {
      throw new NotFoundError('API key not found');
    }
  }
}

export const apiKeyService = new ApiKeyService();
