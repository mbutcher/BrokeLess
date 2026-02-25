import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import { accountRepository } from '@repositories/accountRepository';
import type { NetWorthSnapshot } from '@typings/core.types';

function rowToSnapshot(row: Record<string, unknown>): NetWorthSnapshot {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    snapshotDate:
      row['snapshot_date'] instanceof Date
        ? row['snapshot_date'].toISOString().slice(0, 10)
        : String(row['snapshot_date']).slice(0, 10),
    totalAssets: Number(row['total_assets']),
    totalLiabilities: Number(row['total_liabilities']),
    netWorth: Number(row['net_worth']),
    createdAt: new Date(row['created_at'] as string),
  };
}

class NetWorthSnapshotRepository {
  private get db() {
    return getDatabase();
  }

  /**
   * Take a net worth snapshot for a user by summing their account balances.
   * If a snapshot for today already exists it is replaced (upsert).
   */
  async takeSnapshot(userId: string): Promise<NetWorthSnapshot> {
    const accounts = await accountRepository.findAllForUser(userId, true);

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const account of accounts) {
      if (account.isAsset) {
        totalAssets += account.currentBalance;
      } else {
        // Liability balances are stored as negative; treat absolute value as liability
        totalLiabilities += Math.abs(account.currentBalance);
      }
    }

    const netWorth = totalAssets - totalLiabilities;
    const today = new Date().toISOString().slice(0, 10);

    // Upsert: delete existing snapshot for today then insert fresh
    await this.db('net_worth_snapshots')
      .where({ user_id: userId, snapshot_date: today })
      .delete();

    const id = randomUUID();
    await this.db('net_worth_snapshots').insert({
      id,
      user_id: userId,
      snapshot_date: today,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth,
    });

    const row = await this.db('net_worth_snapshots').where({ id }).first();
    return rowToSnapshot(row as Record<string, unknown>);
  }

  /**
   * Return snapshots for the last N months, one per day, ordered ascending.
   */
  async findHistory(userId: string, months: number): Promise<NetWorthSnapshot[]> {
    const rows = await this.db('net_worth_snapshots')
      .where({ user_id: userId })
      .where('snapshot_date', '>=', this.db.raw('DATE_SUB(CURDATE(), INTERVAL ? MONTH)', [months]))
      .orderBy('snapshot_date', 'asc');
    return rows.map(rowToSnapshot);
  }

  /** Return the most recent snapshot for a user (or null if none exists). */
  async findLatest(userId: string): Promise<NetWorthSnapshot | null> {
    const row = await this.db('net_worth_snapshots')
      .where({ user_id: userId })
      .orderBy('snapshot_date', 'desc')
      .first();
    return row ? rowToSnapshot(row as Record<string, unknown>) : null;
  }
}

export const netWorthSnapshotRepository = new NetWorthSnapshotRepository();
