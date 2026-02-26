import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';

class TransactionSearchRepository {
  private get db() {
    return getDatabase();
  }

  /**
   * Replaces all search index rows for a transaction with the given token hashes.
   * Idempotent — safe to call on create or update.
   */
  async index(transactionId: string, userId: string, tokenHashes: string[]): Promise<void> {
    await this.db('transaction_search_index').where({ transaction_id: transactionId }).delete();

    if (tokenHashes.length === 0) return;

    const rows = tokenHashes.map((hash) => ({
      id: randomUUID(),
      transaction_id: transactionId,
      user_id: userId,
      search_token: hash,
    }));

    await this.db('transaction_search_index').insert(rows);
  }

  /**
   * Returns transaction IDs that contain ALL of the given token hashes (AND semantics).
   * Returns an empty array when tokenHashes is empty.
   */
  async findMatchingIds(userId: string, tokenHashes: string[]): Promise<string[]> {
    if (tokenHashes.length === 0) return [];

    const rows = (await this.db('transaction_search_index')
      .where('user_id', userId)
      .whereIn('search_token', tokenHashes)
      .select('transaction_id')
      .groupBy('transaction_id')
      .havingRaw('COUNT(DISTINCT search_token) = ?', [tokenHashes.length])) as Array<{
      transaction_id: string;
    }>;

    return rows.map((r) => r.transaction_id);
  }
}

export const transactionSearchRepository = new TransactionSearchRepository();
