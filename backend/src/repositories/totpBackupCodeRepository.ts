import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { TotpBackupCode } from '@typings/auth.types';

function rowToBackupCode(row: Record<string, unknown>): TotpBackupCode {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    codeHash: row['code_hash'] as string,
    isUsed: Boolean(row['is_used']),
    usedAt: row['used_at'] ? new Date(row['used_at'] as string) : null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class TotpBackupCodeRepository {
  private get db() {
    return getDatabase();
  }

  async createBatch(userId: string, codeHashes: string[]): Promise<void> {
    const rows = codeHashes.map((codeHash) => ({
      id: randomUUID(),
      user_id: userId,
      code_hash: codeHash,
    }));
    await this.db('totp_backup_codes').insert(rows);
  }

  async findUnusedByUserAndHash(userId: string, codeHash: string): Promise<TotpBackupCode | null> {
    const row: unknown = await this.db('totp_backup_codes')
      .where({ user_id: userId, code_hash: codeHash, is_used: false })
      .first();
    return row ? rowToBackupCode(row as Record<string, unknown>) : null;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.db('totp_backup_codes').where({ id }).update({
      is_used: true,
      used_at: new Date(),
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db('totp_backup_codes').where({ user_id: userId }).delete();
  }

  async countUnusedForUser(userId: string): Promise<number> {
    const result = await this.db('totp_backup_codes')
      .where({ user_id: userId, is_used: false })
      .count('id as count')
      .first();
    return Number(result?.['count'] ?? 0);
  }
}

export const totpBackupCodeRepository = new TotpBackupCodeRepository();
