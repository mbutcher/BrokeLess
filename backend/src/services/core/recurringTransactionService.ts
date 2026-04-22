import { encryptionService } from '@services/encryption/encryptionService';
import { transactionRepository } from '@repositories/transactionRepository';
import { accountRepository } from '@repositories/accountRepository';
import { recurringTransactionRepository } from '@repositories/recurringTransactionRepository';
import { computeNextDueDate, computeInitialNextDueDate, toISODate } from '@utils/recurringDates';
import { AppError } from '@middleware/errorHandler';
import { getDatabase } from '@config/database';
import type {
  RecurringTransaction,
  CreateRecurringTransactionData,
  UpdateRecurringTransactionData,
} from '@typings/core.types';

/** Decrypts sensitive fields on a RecurringTransaction for API responses. */
function decryptRecurring(r: RecurringTransaction): RecurringTransaction {
  return {
    ...r,
    description: r.description ? encryptionService.decrypt(r.description) : null,
    payee: r.payee ? encryptionService.decrypt(r.payee) : null,
    notes: r.notes ? encryptionService.decrypt(r.notes) : null,
  };
}

class RecurringTransactionService {
  private get db() {
    return getDatabase();
  }

  async getAll(userId: string): Promise<RecurringTransaction[]> {
    const records = await recurringTransactionRepository.findAllForUser(userId);
    return records.map(decryptRecurring);
  }

  async getById(id: string, userId: string): Promise<RecurringTransaction> {
    const record = await recurringTransactionRepository.findById(id, userId);
    if (!record) throw new AppError('Recurring transaction not found', 404);
    return decryptRecurring(record);
  }

  async create(
    userId: string,
    input: Omit<CreateRecurringTransactionData, 'userId'>
  ): Promise<RecurringTransaction> {
    const account = await accountRepository.findById(input.accountId, userId);
    if (!account) throw new AppError('Account not found', 404);

    const nextDueDate = computeInitialNextDueDate(
      input.anchorDate,
      input.frequency,
      input.frequencyInterval
    );

    const data: CreateRecurringTransactionData & { nextDueDate: string } = {
      ...input,
      userId,
      description: input.description ? encryptionService.encrypt(input.description) : undefined,
      payee: input.payee ? encryptionService.encrypt(input.payee) : undefined,
      notes: input.notes ? encryptionService.encrypt(input.notes) : undefined,
      nextDueDate,
    };

    const record = await recurringTransactionRepository.create(data);
    return decryptRecurring(record);
  }

  async update(
    id: string,
    userId: string,
    input: UpdateRecurringTransactionData
  ): Promise<RecurringTransaction> {
    const existing = await recurringTransactionRepository.findById(id, userId);
    if (!existing) throw new AppError('Recurring transaction not found', 404);

    if (input.accountId) {
      const account = await accountRepository.findById(input.accountId, userId);
      if (!account) throw new AppError('Account not found', 404);
    }

    const updates: UpdateRecurringTransactionData = { ...input };

    // Re-encrypt changed sensitive fields
    if (input.description !== undefined) {
      updates.description = input.description ? encryptionService.encrypt(input.description) : null;
    }
    if (input.payee !== undefined) {
      updates.payee = input.payee ? encryptionService.encrypt(input.payee) : null;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes ? encryptionService.encrypt(input.notes) : null;
    }

    // If frequency or anchorDate changed, recompute next_due_date
    if (input.frequency !== undefined || input.anchorDate !== undefined) {
      const newFrequency = input.frequency ?? existing.frequency;
      const newAnchor = input.anchorDate ?? existing.anchorDate;
      const newInterval = input.frequencyInterval ?? existing.frequencyInterval;
      updates.nextDueDate = computeInitialNextDueDate(newAnchor, newFrequency, newInterval);
    }

    const updated = await recurringTransactionRepository.update(id, userId, updates);
    if (!updated) throw new AppError('Recurring transaction not found', 404);
    return decryptRecurring(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await recurringTransactionRepository.findById(id, userId);
    if (!existing) throw new AppError('Recurring transaction not found', 404);
    await recurringTransactionRepository.softDelete(id, userId);
  }

  /**
   * Skip the next occurrence of a recurring transaction by advancing
   * next_due_date by one period without generating a transaction.
   */
  async skipOccurrence(id: string, userId: string): Promise<RecurringTransaction> {
    const existing = await recurringTransactionRepository.findById(id, userId);
    if (!existing) throw new AppError('Recurring transaction not found', 404);

    const nextDate = computeNextDueDate(
      new Date(existing.nextDueDate + 'T00:00:00'),
      existing.frequency,
      existing.frequencyInterval ?? undefined
    );
    const nextDueDateStr = toISODate(nextDate);
    await recurringTransactionRepository.advanceNextDue(id, nextDueDateStr);

    const updated = await recurringTransactionRepository.findById(id, userId);
    return decryptRecurring(updated!);
  }

  /**
   * Generate real transactions for all due recurring entries.
   *
   * For each due record:
   * 1. Insert a real transaction on the account.
   * 2. Advance next_due_date until it is past the cutoff.
   *    (This catches up any missed runs, e.g. if the server was down.)
   *
   * @param cutoffDate - Process records with next_due_date <= cutoffDate. Defaults to today.
   * @returns Number of transactions generated.
   */
  async generateDue(cutoffDate?: string): Promise<number> {
    const cutoff = cutoffDate ?? new Date().toISOString().slice(0, 10);
    const due = await recurringTransactionRepository.findDue(cutoff);

    let generated = 0;

    for (const record of due) {
      let nextDue = record.nextDueDate;

      // Loop: generate one transaction per occurrence, advancing next_due_date
      while (nextDue <= cutoff) {
        // Skip if end_date has passed
        if (record.endDate && nextDue > record.endDate) {
          break;
        }

        // Create the real transaction (amount is signed — positive = income, negative = expense)
        try {
          await this.db.transaction(async (trx) => {
            await transactionRepository.create(
              {
                userId: record.userId,
                accountId: record.accountId,
                amount: record.amount,
                description: record.description ?? undefined,
                payee: record.payee ?? undefined,
                notes: record.notes ?? undefined,
                date: nextDue,
              },
              trx
            );
            await accountRepository.updateBalance(record.accountId, record.amount, trx);
          });
          generated++;
        } catch (err) {
          // Log and continue — don't abort the whole batch for one failure
          const logger = (await import('@utils/logger')).default;
          logger.error('Recurring transaction generation failed', {
            recordId: record.id,
            date: nextDue,
            err,
          });
          break;
        }

        // Advance to the next occurrence
        const nextDate = computeNextDueDate(
          new Date(nextDue + 'T00:00:00'),
          record.frequency,
          record.frequencyInterval
        );
        nextDue = toISODate(nextDate);
      }

      // Update the repository record with the advanced next_due_date
      if (nextDue !== record.nextDueDate) {
        await recurringTransactionRepository.advanceNextDue(record.id, nextDue);
      }
    }

    return generated;
  }
}

export const recurringTransactionService = new RecurringTransactionService();
