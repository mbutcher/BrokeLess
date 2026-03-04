import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';

class TransactionTagRepository {
  private get db() {
    return getDatabase();
  }

  /**
   * Returns a map of transaction_id → string[] for all given transaction IDs.
   * Missing entries mean no tags for that transaction.
   */
  async findByTransactionIds(transactionIds: string[]): Promise<Map<string, string[]>> {
    if (transactionIds.length === 0) return new Map();

    const rows = await this.db('transaction_tags')
      .select('transaction_id', 'tag')
      .whereIn('transaction_id', transactionIds)
      .orderBy('tag');

    const result = new Map<string, string[]>();
    for (const row of rows as { transaction_id: string; tag: string }[]) {
      const existing = result.get(row.transaction_id) ?? [];
      existing.push(row.tag);
      result.set(row.transaction_id, existing);
    }
    return result;
  }

  /**
   * Replaces all tags for a transaction with the given list.
   * Tags are normalised to lowercase and trimmed; duplicates are removed.
   */
  async setTags(transactionId: string, userId: string, tags: string[]): Promise<void> {
    const normalised = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];

    await this.db.transaction(async (trx) => {
      await trx('transaction_tags')
        .where({ transaction_id: transactionId, user_id: userId })
        .delete();
      if (normalised.length > 0) {
        await trx('transaction_tags').insert(
          normalised.map((tag) => ({
            id: randomUUID(),
            transaction_id: transactionId,
            user_id: userId,
            tag,
          }))
        );
      }
    });
  }

  /**
   * Returns all distinct tags used by a user, sorted alphabetically.
   * Used to power the autocomplete endpoint.
   */
  async findAllForUser(userId: string): Promise<string[]> {
    const rows = await this.db('transaction_tags')
      .distinct('tag')
      .where({ user_id: userId })
      .orderBy('tag');
    return (rows as { tag: string }[]).map((r) => r.tag);
  }
}

export const transactionTagRepository = new TransactionTagRepository();
