import type { Knex } from 'knex';
import { getDatabase } from '@config/database';
import type { TransactionLink, LinkType } from '@typings/core.types';

function rowToLink(row: Record<string, unknown>): TransactionLink {
  return {
    id: row['id'] as string,
    fromTransactionId: row['from_transaction_id'] as string,
    toTransactionId: row['to_transaction_id'] as string,
    linkType: row['link_type'] as LinkType,
    createdAt: new Date(row['created_at'] as string),
  };
}

class TransactionLinkRepository {
  private get db() {
    return getDatabase();
  }

  async create(
    fromId: string,
    toId: string,
    linkType: LinkType,
    trx?: Knex.Transaction
  ): Promise<TransactionLink> {
    const db = trx ?? this.db;
    const [id] = await db('transaction_links').insert({
      from_transaction_id: fromId,
      to_transaction_id: toId,
      link_type: linkType,
    });
    const row: unknown = await db('transaction_links').where({ id }).first();
    return rowToLink(row as Record<string, unknown>);
  }

  /**
   * Find the link record for a transaction, matching either side.
   */
  async findByTransactionId(txId: string): Promise<TransactionLink | null> {
    const row: unknown = await this.db('transaction_links')
      .where('from_transaction_id', txId)
      .orWhere('to_transaction_id', txId)
      .first();
    return row ? rowToLink(row as Record<string, unknown>) : null;
  }

  /**
   * Remove the link involving a given transaction (either side).
   */
  async deleteByTransactionId(txId: string, trx?: Knex.Transaction): Promise<void> {
    const db = trx ?? this.db;
    await db('transaction_links')
      .where('from_transaction_id', txId)
      .orWhere('to_transaction_id', txId)
      .delete();
  }
}

export const transactionLinkRepository = new TransactionLinkRepository();
