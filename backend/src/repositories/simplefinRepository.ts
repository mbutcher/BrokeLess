import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { SimplefinConnection, UpdateSimplefinScheduleData } from '@typings/core.types';

function rowToConnection(row: Record<string, unknown>): SimplefinConnection {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    lastSyncAt: row['last_sync_at'] ? String(row['last_sync_at']) : null,
    lastSyncStatus: (row['last_sync_status'] as SimplefinConnection['lastSyncStatus']) ?? null,
    lastSyncError: row['last_sync_error'] ? String(row['last_sync_error']) : null,
    autoSyncEnabled: Boolean(row['auto_sync_enabled']),
    autoSyncIntervalHours: Number(row['auto_sync_interval_hours']),
    autoSyncWindowStart: Number(row['auto_sync_window_start']),
    autoSyncWindowEnd: Number(row['auto_sync_window_end']),
    discardedIdsJson: row['discarded_ids_json'] ? String(row['discarded_ids_json']) : null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class SimplefinRepository {
  private get db() {
    return getDatabase();
  }

  async findConnectionByUser(userId: string): Promise<SimplefinConnection | null> {
    const row = await this.db('simplefin_connections').where({ user_id: userId }).first();
    return row ? rowToConnection(row) : null;
  }

  /** Find encrypted access URL for internal use by the service layer only */
  async findAccessUrl(userId: string): Promise<string | null> {
    const row = await this.db('simplefin_connections')
      .where({ user_id: userId })
      .select('access_url_encrypted')
      .first();
    return row ? (row['access_url_encrypted'] as string) : null;
  }

  async upsertConnection(userId: string, accessUrlEncrypted: string): Promise<SimplefinConnection> {
    const existing = await this.findConnectionByUser(userId);

    if (existing) {
      await this.db('simplefin_connections')
        .where({ user_id: userId })
        .update({ access_url_encrypted: accessUrlEncrypted });
      const updated = await this.findConnectionByUser(userId);
      return updated!;
    }

    const id = randomUUID();
    await this.db('simplefin_connections').insert({
      id,
      user_id: userId,
      access_url_encrypted: accessUrlEncrypted,
    });
    const created = await this.db('simplefin_connections').where({ id }).first();
    return rowToConnection(created as Record<string, unknown>);
  }

  async updateSyncStatus(
    userId: string,
    status: 'success' | 'error' | 'pending',
    error?: string
  ): Promise<void> {
    await this.db('simplefin_connections').where({ user_id: userId }).update({
      last_sync_status: status,
      last_sync_error: error ?? null,
    });
  }

  async updateSyncTimestamp(userId: string): Promise<void> {
    await this.db('simplefin_connections').where({ user_id: userId }).update({
      last_sync_at: this.db.fn.now(),
    });
  }

  async updateSchedule(
    userId: string,
    data: UpdateSimplefinScheduleData
  ): Promise<SimplefinConnection> {
    await this.db('simplefin_connections').where({ user_id: userId }).update({
      auto_sync_enabled: data.autoSyncEnabled,
      auto_sync_interval_hours: data.autoSyncIntervalHours,
      auto_sync_window_start: data.autoSyncWindowStart,
      auto_sync_window_end: data.autoSyncWindowEnd,
    });
    const updated = await this.findConnectionByUser(userId);
    return updated!;
  }

  async addDiscardedId(userId: string, simplefinTxId: string): Promise<void> {
    const row = await this.db('simplefin_connections')
      .where({ user_id: userId })
      .select('discarded_ids_json')
      .first();
    if (!row) return;

    let existing: string[] = [];
    if (row['discarded_ids_json']) {
      try {
        existing = JSON.parse(row['discarded_ids_json'] as string) as string[];
      } catch {
        existing = [];
      }
    }

    if (!existing.includes(simplefinTxId)) {
      existing.push(simplefinTxId);
      await this.db('simplefin_connections')
        .where({ user_id: userId })
        .update({ discarded_ids_json: JSON.stringify(existing) });
    }
  }

  async getDiscardedIds(userId: string): Promise<string[]> {
    const row = await this.db('simplefin_connections')
      .where({ user_id: userId })
      .select('discarded_ids_json')
      .first();
    if (!row || !row['discarded_ids_json']) return [];
    try {
      return JSON.parse(row['discarded_ids_json'] as string) as string[];
    } catch {
      return [];
    }
  }

  async deleteConnection(userId: string): Promise<void> {
    await this.db('simplefin_connections').where({ user_id: userId }).delete();
  }

  /** Returns all connections with auto_sync_enabled = true (for the scheduler) */
  async findAllAutoSyncEligible(): Promise<SimplefinConnection[]> {
    const rows = await this.db('simplefin_connections').where({ auto_sync_enabled: true });
    return rows.map(rowToConnection);
  }
}

export const simplefinRepository = new SimplefinRepository();
