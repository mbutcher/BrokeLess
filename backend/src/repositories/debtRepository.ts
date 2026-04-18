import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { DebtSchedule, TransactionSplit, UpsertDebtScheduleData } from '@typings/core.types';

function rowToSchedule(row: Record<string, unknown>): DebtSchedule {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    accountId: row['account_id'] as string,
    principal: row['principal'] != null ? Number(row['principal']) : null,
    annualRate: Number(row['annual_rate']),
    termMonths: row['term_months'] != null ? Number(row['term_months']) : null,
    originationDate: row['origination_date'] ? (row['origination_date'] as string) : null,
    paymentAmount: row['payment_amount'] != null ? Number(row['payment_amount']) : null,
    isSimplified: Boolean(row['is_simplified']),
    asOfDate: row['as_of_date'] ? (row['as_of_date'] as string) : null,
    cashAdvanceRate: row['cash_advance_rate'] != null ? Number(row['cash_advance_rate']) : null,
    minimumPaymentType: row['minimum_payment_type']
      ? (row['minimum_payment_type'] as DebtSchedule['minimumPaymentType'])
      : null,
    minimumPaymentAmount:
      row['minimum_payment_amount'] != null ? Number(row['minimum_payment_amount']) : null,
    minimumPaymentPercent:
      row['minimum_payment_percent'] != null ? Number(row['minimum_payment_percent']) : null,
    creditLimit: row['credit_limit'] != null ? Number(row['credit_limit']) : null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

function rowToSplit(row: Record<string, unknown>): TransactionSplit {
  return {
    id: row['id'] as string,
    transactionId: row['transaction_id'] as string,
    principalAmount: Number(row['principal_amount']),
    interestAmount: Number(row['interest_amount']),
    createdAt: new Date(row['created_at'] as string),
  };
}

class DebtRepository {
  private get db() {
    return getDatabase();
  }

  async findByUserAndAccount(userId: string, accountId: string): Promise<DebtSchedule | null> {
    const row: unknown = await this.db('debt_schedules')
      .where({ user_id: userId, account_id: accountId })
      .first();
    return row ? rowToSchedule(row as Record<string, unknown>) : null;
  }

  async findAllByUser(userId: string): Promise<DebtSchedule[]> {
    const rows = await this.db('debt_schedules')
      .where({ user_id: userId })
      .orderBy('created_at', 'asc');
    return rows.map(rowToSchedule);
  }

  async upsert(userId: string, data: UpsertDebtScheduleData): Promise<DebtSchedule> {
    const fields = {
      annual_rate: data.annualRate,
      principal: data.principal ?? null,
      term_months: data.termMonths ?? null,
      origination_date: data.originationDate ?? null,
      payment_amount: data.paymentAmount ?? null,
      is_simplified: data.isSimplified ? 1 : 0,
      as_of_date: data.asOfDate ?? null,
      cash_advance_rate: data.cashAdvanceRate ?? null,
      minimum_payment_type: data.minimumPaymentType ?? null,
      minimum_payment_amount: data.minimumPaymentAmount ?? null,
      minimum_payment_percent: data.minimumPaymentPercent ?? null,
      credit_limit: data.creditLimit ?? null,
    };

    const existing = await this.findByUserAndAccount(userId, data.accountId);

    if (existing) {
      await this.db('debt_schedules')
        .where({ user_id: userId, account_id: data.accountId })
        .update(fields);
      const updated = await this.findByUserAndAccount(userId, data.accountId);
      return updated!;
    }

    const id = randomUUID();
    await this.db('debt_schedules').insert({
      id,
      user_id: userId,
      account_id: data.accountId,
      ...fields,
    });
    const created: unknown = await this.db('debt_schedules').where({ id }).first();
    return rowToSchedule(created as Record<string, unknown>);
  }

  async delete(userId: string, accountId: string): Promise<void> {
    await this.db('debt_schedules').where({ user_id: userId, account_id: accountId }).delete();
  }

  async createSplit(data: {
    transactionId: string;
    principalAmount: number;
    interestAmount: number;
  }): Promise<TransactionSplit> {
    const id = randomUUID();
    await this.db('transaction_splits').insert({
      id,
      transaction_id: data.transactionId,
      principal_amount: data.principalAmount,
      interest_amount: data.interestAmount,
    });
    const row: unknown = await this.db('transaction_splits').where({ id }).first();
    return rowToSplit(row as Record<string, unknown>);
  }

  async findSplitByTransaction(transactionId: string): Promise<TransactionSplit | null> {
    const row: unknown = await this.db('transaction_splits')
      .where({ transaction_id: transactionId })
      .first();
    return row ? rowToSplit(row as Record<string, unknown>) : null;
  }
}

export const debtRepository = new DebtRepository();
