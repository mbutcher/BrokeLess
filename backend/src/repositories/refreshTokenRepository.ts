import { getDatabase } from '@config/database';
import type { RefreshToken, CreateRefreshTokenData } from '@types/auth.types';

function rowToRefreshToken(row: Record<string, unknown>): RefreshToken {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    tokenHash: row['token_hash'] as string,
    deviceFingerprint: (row['device_fingerprint'] as string | null) ?? null,
    userAgent: (row['user_agent'] as string | null) ?? null,
    ipAddress: (row['ip_address'] as string | null) ?? null,
    isRevoked: Boolean(row['is_revoked']),
    expiresAt: new Date(row['expires_at'] as string),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class RefreshTokenRepository {
  private get db() {
    return getDatabase();
  }

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    await this.db('refresh_tokens').insert({
      user_id: data.userId,
      token_hash: data.tokenHash,
      device_fingerprint: data.deviceFingerprint,
      user_agent: data.userAgent,
      ip_address: data.ipAddress,
      expires_at: data.expiresAt,
    });
    const row = await this.db('refresh_tokens')
      .where({ token_hash: data.tokenHash })
      .first();
    return rowToRefreshToken(row as Record<string, unknown>);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.db('refresh_tokens').where({ token_hash: tokenHash }).first();
    return row ? rowToRefreshToken(row as Record<string, unknown>) : null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.db('refresh_tokens')
      .where({ token_hash: tokenHash })
      .update({ is_revoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db('refresh_tokens')
      .where({ user_id: userId, is_revoked: false })
      .update({ is_revoked: true });
  }

  /** Delete tokens that have expired AND been revoked — safe to prune. */
  async deleteExpiredTokens(): Promise<number> {
    const now = new Date();
    return this.db('refresh_tokens')
      .where('expires_at', '<', now)
      .where('is_revoked', true)
      .delete();
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
