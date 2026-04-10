import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { RefreshToken, CreateRefreshTokenData, SessionInfo } from '@typings/auth.types';

function rowToRefreshToken(row: Record<string, unknown>): RefreshToken {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    tokenHash: row['token_hash'] as string,
    deviceFingerprint: (row['device_fingerprint'] as string | null) ?? null,
    userAgent: (row['user_agent'] as string | null) ?? null,
    deviceName: (row['device_name'] as string | null) ?? null,
    lastUsedAt: row['last_used_at'] ? new Date(row['last_used_at'] as string) : null,
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
    const id = randomUUID();
    await this.db('refresh_tokens').insert({
      id,
      user_id: data.userId,
      token_hash: data.tokenHash,
      device_fingerprint: data.deviceFingerprint,
      user_agent: data.userAgent,
      device_name: data.deviceName,
      ip_address: data.ipAddress,
      expires_at: data.expiresAt,
      last_used_at: data.lastUsedAt ?? null,
    });
    const row: unknown = await this.db('refresh_tokens').where({ id }).first();
    return rowToRefreshToken(row as Record<string, unknown>);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const row: unknown = await this.db('refresh_tokens').where({ token_hash: tokenHash }).first();
    return row ? rowToRefreshToken(row as Record<string, unknown>) : null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.db('refresh_tokens').where({ token_hash: tokenHash }).update({ is_revoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db('refresh_tokens')
      .where({ user_id: userId, is_revoked: false })
      .update({ is_revoked: true });
  }

  /** Revoke a specific session by ID — only if it belongs to the given user. */
  async revokeByIdForUser(sessionId: string, userId: string): Promise<boolean> {
    const count = await this.db('refresh_tokens')
      .where({ id: sessionId, user_id: userId, is_revoked: false })
      .update({ is_revoked: true });
    return count > 0;
  }

  /** Update last_used_at timestamp for a token. */
  async touchLastUsed(tokenHash: string): Promise<void> {
    await this.db('refresh_tokens')
      .where({ token_hash: tokenHash })
      .update({ last_used_at: new Date() });
  }

  /**
   * List all active (non-revoked, non-expired) sessions for a user.
   * The caller provides the current session's token hash to mark it as isCurrent.
   */
  async listActiveForUser(userId: string, currentTokenHash: string | null): Promise<SessionInfo[]> {
    const now = new Date();
    const rows = await this.db('refresh_tokens')
      .where({ user_id: userId, is_revoked: false })
      .where('expires_at', '>', now)
      .orderBy('created_at', 'desc')
      .select('id', 'device_name', 'ip_address', 'last_used_at', 'created_at', 'token_hash');

    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r['id']),
      deviceName: (r['device_name'] as string | null) ?? null,
      ipAddress: (r['ip_address'] as string | null) ?? null,
      lastUsedAt: r['last_used_at'] ? new Date(r['last_used_at'] as string) : null,
      createdAt: new Date(r['created_at'] as string),
      isCurrent: currentTokenHash !== null && r['token_hash'] === currentTokenHash,
    }));
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
