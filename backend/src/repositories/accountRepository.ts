import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import { getDatabase } from '@config/database';
import type { Account, CreateAccountData, UpdateAccountData } from '@typings/core.types';

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    name: row['name'] as string,
    type: row['type'] as Account['type'],
    isAsset: Boolean(row['is_asset']),
    startingBalance: Number(row['starting_balance']),
    currentBalance: Number(row['current_balance']),
    currency: row['currency'] as string,
    color: (row['color'] as string | null) ?? null,
    institution: (row['institution'] as string | null) ?? null,
    annualRate: row['annual_rate'] != null ? Number(row['annual_rate']) : null,
    isActive: Boolean(row['is_active']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class AccountRepository {
  private get db() {
    return getDatabase();
  }

  async findById(id: string, userId: string): Promise<Account | null> {
    const db = this.db;
    const row: unknown = await db('accounts')
      .where('accounts.id', id)
      .where((qb) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        qb.where('accounts.user_id', userId).orWhereExists(function () {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.select(1)
            .from('account_shares')
            .where('account_id', db.ref('accounts.id'))
            .where('shared_with_user_id', userId);
        });
      })
      .select('accounts.*')
      .first();
    return row ? rowToAccount(row as Record<string, unknown>) : null;
  }

  async findAllForUser(userId: string, activeOnly = true): Promise<Account[]> {
    const db = this.db;
    let query = db('accounts')
      .where((qb) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        qb.where('accounts.user_id', userId).orWhereExists(function () {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.select(1)
            .from('account_shares')
            .where('account_id', db.ref('accounts.id'))
            .where('shared_with_user_id', userId);
        });
      })
      .select('accounts.*');
    if (activeOnly) query = query.where('accounts.is_active', true);
    const rows = await query.orderBy('accounts.name', 'asc');
    return rows.map(rowToAccount);
  }

  async create(data: CreateAccountData): Promise<Account> {
    const id = randomUUID();
    await this.db('accounts').insert({
      id,
      user_id: data.userId,
      name: data.name,
      type: data.type,
      is_asset: data.isAsset,
      starting_balance: data.startingBalance,
      current_balance: data.startingBalance, // starts equal to starting balance
      currency: data.currency,
      color: data.color ?? null,
      institution: data.institution ?? null,
      annual_rate: data.annualRate ?? null,
    });
    const row: unknown = await this.db('accounts').where({ id }).first();
    return rowToAccount(row as Record<string, unknown>);
  }

  async update(id: string, userId: string, data: UpdateAccountData): Promise<Account | null> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates['name'] = data.name;
    if (data.type !== undefined) updates['type'] = data.type;
    if (data.isAsset !== undefined) updates['is_asset'] = data.isAsset;
    if (data.currency !== undefined) updates['currency'] = data.currency;
    if (data.color !== undefined) updates['color'] = data.color;
    if (data.institution !== undefined) updates['institution'] = data.institution;
    if (data.isActive !== undefined) updates['is_active'] = data.isActive;
    if (data.annualRate !== undefined) updates['annual_rate'] = data.annualRate;

    if (data.startingBalance !== undefined) {
      const current = await this.findById(id, userId);
      if (current) {
        const delta = data.startingBalance - current.startingBalance;
        updates['starting_balance'] = data.startingBalance;
        updates['current_balance'] = this.db.raw('current_balance + ?', [delta]);
      }
    }

    if (Object.keys(updates).length === 0) return this.findById(id, userId);

    // Write operations are owner-only
    await this.db('accounts').where({ id, user_id: userId }).update(updates);
    return this.findById(id, userId);
  }

  /**
   * Atomically update the current balance by delta.
   * Must be called inside a knex transaction when modifying alongside a transaction row.
   */
  async updateBalance(id: string, delta: number, trx?: Knex.Transaction): Promise<void> {
    const query = trx ? trx('accounts') : this.db('accounts');
    await query.where({ id }).increment('current_balance', delta);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    // Soft delete is owner-only
    await this.db('accounts').where({ id, user_id: userId }).update({ is_active: false });
  }

  async countTransactions(id: string): Promise<number> {
    const result = await this.db('transactions')
      .where({ account_id: id })
      .count('* as cnt')
      .first();
    return Number((result as Record<string, unknown>)?.['cnt'] ?? 0);
  }

  async hardDelete(id: string, userId: string): Promise<void> {
    const db = this.db;
    await db.transaction(async (trx) => {
      await trx('account_shares').where({ account_id: id }).del();
      await trx('transactions').where({ account_id: id }).del();
      await trx('accounts').where({ id, user_id: userId }).del();
    });
  }

  async setSimplefinAccountId(
    id: string,
    userId: string,
    simplefinAccountId: string
  ): Promise<void> {
    await this.db('accounts')
      .where({ id, user_id: userId })
      .update({ simplefin_account_id: simplefinAccountId });
  }

  async setCurrentBalance(id: string, userId: string, balance: number): Promise<void> {
    await this.db('accounts').where({ id, user_id: userId }).update({ current_balance: balance });
  }
}

export const accountRepository = new AccountRepository();
