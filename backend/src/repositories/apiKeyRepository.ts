import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import { getDatabase } from '@config/database';
import type { ApiKey, CreateApiKeyData } from '@typings/auth.types';

function rowToApiKey(row: Record<string, unknown>): ApiKey {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    label: row['label'] as string,
    keyHash: row['key_hash'] as string,
    scopes: JSON.parse(row['scopes'] as string) as string[],
    lastUsedAt: row['last_used_at'] ? new Date(row['last_used_at'] as string) : null,
    expiresAt: row['expires_at'] ? new Date(row['expires_at'] as string) : null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class ApiKeyRepository {
  private get db(): Knex {
    return getDatabase();
  }

  async create(data: CreateApiKeyData): Promise<ApiKey> {
    const id = randomUUID();
    await this.db('api_keys').insert({
      id,
      user_id: data.userId,
      label: data.label,
      key_hash: data.keyHash,
      scopes: JSON.stringify(data.scopes),
      expires_at: data.expiresAt ?? null,
    });
    const row: unknown = await this.db('api_keys').where({ id }).first();
    return rowToApiKey(row as Record<string, unknown>);
  }

  async findByHash(hash: string): Promise<ApiKey | null> {
    const row: unknown = await this.db('api_keys').where({ key_hash: hash }).first();
    return row ? rowToApiKey(row as Record<string, unknown>) : null;
  }

  async findAllForUser(userId: string): Promise<ApiKey[]> {
    const rows: unknown[] = await this.db('api_keys')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    return rows.map((r) => rowToApiKey(r as Record<string, unknown>));
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const count = await this.db('api_keys').where({ id, user_id: userId }).delete();
    return count > 0;
  }

  async touchLastUsed(hash: string): Promise<void> {
    await this.db('api_keys').where({ key_hash: hash }).update({ last_used_at: this.db.fn.now() });
  }
}

export const apiKeyRepository = new ApiKeyRepository();
