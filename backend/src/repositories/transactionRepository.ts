import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import { dialectHelper } from '@utils/db/dialectHelper';
import { getDatabase } from '@config/database';
import type {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  Account,
} from '@typings/core.types';

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    accountId: row['account_id'] as string,
    amount: Number(row['amount']),
    description: (row['description'] as string | null) ?? null,
    payee: (row['payee'] as string | null) ?? null,
    notes: (row['notes'] as string | null) ?? null,
    date: new Date(row['date'] as string),
    categoryId: (row['category_id'] as string | null) ?? null,
    isTransfer: Boolean(row['is_transfer']),
    isCleared: Boolean(row['is_cleared']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

class TransactionRepository {
  private get db() {
    return getDatabase();
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const row: unknown = await this.db('transactions').where({ id, user_id: userId }).first();
    return row ? rowToTransaction(row as Record<string, unknown>) : null;
  }

  async findAll(
    userId: string,
    filters: TransactionFilters & { allowedIds?: string[] }
  ): Promise<PaginatedTransactions> {
    // Short-circuit: search returned no matches
    if (filters.allowedIds !== undefined && filters.allowedIds.length === 0) {
      return { data: [], total: 0, page: filters.page, limit: filters.limit };
    }

    let query = this.db('transactions').where('transactions.user_id', userId);

    if (filters.accountId) query = query.where('account_id', filters.accountId);
    if (filters.categoryId) query = query.where('category_id', filters.categoryId);
    if (filters.startDate) query = query.where('date', '>=', filters.startDate);
    if (filters.endDate) query = query.where('date', '<=', filters.endDate);
    if (filters.isTransfer !== undefined) query = query.where('is_transfer', filters.isTransfer);
    if (filters.tag) {
      query = query.whereIn(
        'id',
        this.db('transaction_tags')
          .select('transaction_id')
          .where({ user_id: userId, tag: filters.tag })
      );
    }
    if (filters.allowedIds && filters.allowedIds.length > 0) {
      query = query.whereIn('id', filters.allowedIds);
    }

    const countResult = await query.clone().count('* as count').first();
    const total = Number(countResult?.['count'] ?? 0);

    const offset = (filters.page - 1) * filters.limit;
    const rows = await query
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(filters.limit)
      .offset(offset);

    return {
      data: rows.map(rowToTransaction),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async create(data: CreateTransactionData, trx?: Knex.Transaction): Promise<Transaction> {
    const db = trx ?? this.db;
    const id = randomUUID();
    await db('transactions').insert({
      id,
      user_id: data.userId,
      account_id: data.accountId,
      amount: data.amount,
      description: data.description ?? null,
      payee: data.payee ?? null,
      notes: data.notes ?? null,
      date: data.date,
      category_id: data.categoryId ?? null,
      simplefin_transaction_id: data.simplefinTransactionId ?? null,
    });
    const row: unknown = await db('transactions').where({ id }).first();
    return rowToTransaction(row as Record<string, unknown>);
  }

  /** Returns the transaction that was imported from this SimpleFIN transaction ID, if any */
  async findBySimplefinId(
    userId: string,
    simplefinTransactionId: string
  ): Promise<Transaction | null> {
    const row: unknown = await this.db('transactions')
      .where({ user_id: userId, simplefin_transaction_id: simplefinTransactionId })
      .first();
    return row ? rowToTransaction(row as Record<string, unknown>) : null;
  }

  /**
   * Returns recent transactions for an account (for fuzzy-match deduplication).
   * Results include encrypted payee/description — caller must decrypt before comparing.
   */
  async findRecentForAccount(
    userId: string,
    accountId: string,
    days: number
  ): Promise<Transaction[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const rows = await this.db('transactions')
      .where({ user_id: userId, account_id: accountId })
      .where('date', '>=', cutoffStr)
      .orderBy('date', 'desc');
    return rows.map(rowToTransaction);
  }

  async update(
    id: string,
    userId: string,
    data: UpdateTransactionData,
    trx?: Knex.Transaction
  ): Promise<Transaction | null> {
    const db = trx ?? this.db;
    const updates: Record<string, unknown> = {};
    if (data.accountId !== undefined) updates['account_id'] = data.accountId;
    if (data.amount !== undefined) updates['amount'] = data.amount;
    if (data.description !== undefined) updates['description'] = data.description;
    if (data.payee !== undefined) updates['payee'] = data.payee;
    if (data.notes !== undefined) updates['notes'] = data.notes;
    if (data.date !== undefined) updates['date'] = data.date;
    if (data.categoryId !== undefined) updates['category_id'] = data.categoryId;
    if (data.isCleared !== undefined) updates['is_cleared'] = data.isCleared;

    if (Object.keys(updates).length > 0) {
      await db('transactions').where({ id, user_id: userId }).update(updates);
    }

    const row: unknown = await db('transactions').where({ id, user_id: userId }).first();
    return row ? rowToTransaction(row as Record<string, unknown>) : null;
  }

  async delete(id: string, userId: string, trx?: Knex.Transaction): Promise<void> {
    const db = trx ?? this.db;
    await db('transactions').where({ id, user_id: userId }).delete();
  }

  async setIsTransfer(
    id: string,
    userId: string,
    isTransfer: boolean,
    trx?: Knex.Transaction
  ): Promise<void> {
    const db = trx ?? this.db;
    await db('transactions').where({ id, user_id: userId }).update({ is_transfer: isTransfer });
  }

  async setIsTransferBatch(
    ids: string[],
    userId: string,
    isTransfer: boolean,
    trx?: Knex.Transaction
  ): Promise<void> {
    if (ids.length === 0) return;
    const db = trx ?? this.db;
    await db('transactions')
      .whereIn('id', ids)
      .where('user_id', userId)
      .update({ is_transfer: isTransfer });
  }

  /**
   * Find transfer candidates for a given transaction:
   * - Same user, different account
   * - Equal and opposite amount (amounts are exact negatives of each other)
   * - Date within ±3 days
   * - Not already linked in transaction_links
   */
  async findTransferCandidates(
    tx: Transaction
  ): Promise<Array<{ transaction: Transaction; account: Account }>> {
    const targetAmount = -tx.amount; // opposite sign

    const rows = await this.db('transactions as t')
      .join('accounts as a', 't.account_id', 'a.id')
      .leftJoin('transaction_links as tl', function () {
        this.on('tl.from_transaction_id', 't.id').orOn('tl.to_transaction_id', 't.id');
      })
      .where('t.user_id', tx.userId)
      .where('t.account_id', '!=', tx.accountId)
      .where('t.amount', targetAmount)
      .whereNull('tl.id') // not already linked
      .whereRaw(`${dialectHelper.datediffAbsSQL('t.date', '?')} <= 3`, [
        tx.date.toISOString().substring(0, 10),
      ])
      .select(
        't.*',
        'a.id as a_id',
        'a.name as a_name',
        'a.type as a_type',
        'a.is_asset as a_is_asset',
        'a.starting_balance as a_starting_balance',
        'a.current_balance as a_current_balance',
        'a.currency as a_currency',
        'a.color as a_color',
        'a.institution as a_institution',
        'a.annual_rate as a_annual_rate',
        'a.is_active as a_is_active',
        'a.created_at as a_created_at',
        'a.updated_at as a_updated_at',
        'a.user_id as a_user_id'
      )
      .limit(5); // cap candidates returned

    return rows.map((row: Record<string, unknown>) => ({
      transaction: rowToTransaction(row),
      account: {
        id: row['a_id'] as string,
        userId: row['a_user_id'] as string,
        name: row['a_name'] as string,
        type: row['a_type'] as Account['type'],
        isAsset: Boolean(row['a_is_asset']),
        startingBalance: Number(row['a_starting_balance']),
        currentBalance: Number(row['a_current_balance']),
        currency: row['a_currency'] as string,
        color: (row['a_color'] as string | null) ?? null,
        institution: (row['a_institution'] as string | null) ?? null,
        annualRate: row['a_annual_rate'] != null ? Number(row['a_annual_rate']) : null,
        isActive: Boolean(row['a_is_active']),
        createdAt: new Date(row['a_created_at'] as string),
        updatedAt: new Date(row['a_updated_at'] as string),
      } satisfies Account,
    }));
  }
}

export const transactionRepository = new TransactionRepository();
