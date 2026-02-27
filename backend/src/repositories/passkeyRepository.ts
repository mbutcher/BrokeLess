import { getDatabase } from '@config/database';
import type { Passkey, CreatePasskeyData } from '@typings/auth.types';

function rowToPasskey(row: Record<string, unknown>): Passkey {
  let transports: string[] | null = null;
  if (row['transports']) {
    try {
      transports = JSON.parse(row['transports'] as string) as string[];
    } catch {
      transports = null;
    }
  }

  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    credentialId: row['credential_id'] as string,
    publicKey: row['public_key'] as string,
    counter: Number(row['counter']),
    aaguid: (row['aaguid'] as string | null) ?? null,
    deviceName: (row['device_name'] as string | null) ?? null,
    transports,
    lastUsedAt: row['last_used_at'] ? new Date(row['last_used_at'] as string) : null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class PasskeyRepository {
  private get db() {
    return getDatabase();
  }

  async findByCredentialId(credentialId: string): Promise<Passkey | null> {
    const row: unknown = await this.db('passkeys').where({ credential_id: credentialId }).first();
    return row ? rowToPasskey(row as Record<string, unknown>) : null;
  }

  async findAllForUser(userId: string): Promise<Passkey[]> {
    const rows = await this.db('passkeys').where({ user_id: userId }).orderBy('created_at', 'desc');
    return rows.map((row) => rowToPasskey(row as Record<string, unknown>));
  }

  async existsByCredentialId(credentialId: string): Promise<boolean> {
    const result = await this.db('passkeys')
      .where({ credential_id: credentialId })
      .count('id as count')
      .first();
    return Number(result?.['count'] ?? 0) > 0;
  }

  async create(data: CreatePasskeyData): Promise<Passkey> {
    await this.db('passkeys').insert({
      user_id: data.userId,
      credential_id: data.credentialId,
      public_key: data.publicKey,
      counter: data.counter,
      aaguid: data.aaguid,
      device_name: data.deviceName,
      transports: data.transports ? JSON.stringify(data.transports) : null,
    });
    const row: unknown = await this.db('passkeys')
      .where({ credential_id: data.credentialId })
      .first();
    return rowToPasskey(row as Record<string, unknown>);
  }

  async updateCounter(credentialId: string, counter: number, lastUsedAt: Date): Promise<void> {
    await this.db('passkeys').where({ credential_id: credentialId }).update({
      counter,
      last_used_at: lastUsedAt,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db('passkeys').where({ id, user_id: userId }).delete();
  }
}

export const passkeyRepository = new PasskeyRepository();
