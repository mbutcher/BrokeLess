import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import { encryptionService } from '@services/encryption/encryptionService';
import type { SimplefinPendingReview } from '@typings/core.types';
import type { SimplefinTransaction } from '@typings/simplefin.types';

function rowToReview(row: Record<string, unknown>): SimplefinPendingReview {
  const rawData = JSON.parse(
    encryptionService.decrypt(row['raw_data_encrypted'] as string)
  ) as SimplefinTransaction;

  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    simplefinTransactionId: row['simplefin_transaction_id'] as string,
    rawData,
    candidateTransactionId: row['candidate_transaction_id']
      ? String(row['candidate_transaction_id'])
      : null,
    localAccountId: row['local_account_id'] ? String(row['local_account_id']) : null,
    similarityScore: Number(row['similarity_score']),
    createdAt: new Date(row['created_at'] as string),
  };
}

class SimplefinPendingReviewRepository {
  private get db() {
    return getDatabase();
  }

  async findAllByUser(userId: string): Promise<SimplefinPendingReview[]> {
    const rows = await this.db('simplefin_pending_reviews')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    return rows.map(rowToReview);
  }

  async findBySimplefinTxId(
    userId: string,
    simplefinTransactionId: string
  ): Promise<SimplefinPendingReview | null> {
    const row = await this.db('simplefin_pending_reviews')
      .where({ user_id: userId, simplefin_transaction_id: simplefinTransactionId })
      .first();
    return row ? rowToReview(row) : null;
  }

  async findById(userId: string, reviewId: string): Promise<SimplefinPendingReview | null> {
    const row = await this.db('simplefin_pending_reviews')
      .where({ id: reviewId, user_id: userId })
      .first();
    return row ? rowToReview(row) : null;
  }

  async create(data: {
    userId: string;
    simplefinTransactionId: string;
    rawData: SimplefinTransaction;
    candidateTransactionId: string | null;
    localAccountId: string;
    similarityScore: number;
  }): Promise<SimplefinPendingReview> {
    const id = randomUUID();
    const rawDataEncrypted = encryptionService.encrypt(JSON.stringify(data.rawData));

    await this.db('simplefin_pending_reviews').insert({
      id,
      user_id: data.userId,
      simplefin_transaction_id: data.simplefinTransactionId,
      raw_data_encrypted: rawDataEncrypted,
      candidate_transaction_id: data.candidateTransactionId,
      local_account_id: data.localAccountId,
      similarity_score: data.similarityScore,
    });

    const row = await this.db('simplefin_pending_reviews').where({ id }).first();
    return rowToReview(row as Record<string, unknown>);
  }

  async delete(userId: string, reviewId: string): Promise<void> {
    await this.db('simplefin_pending_reviews')
      .where({ id: reviewId, user_id: userId })
      .delete();
  }

  async countByUser(userId: string): Promise<number> {
    const result = await this.db('simplefin_pending_reviews')
      .where({ user_id: userId })
      .count('id as count')
      .first();
    return Number(result?.['count'] ?? 0);
  }
}

export const simplefinPendingReviewRepository = new SimplefinPendingReviewRepository();
