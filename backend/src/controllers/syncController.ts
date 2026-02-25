import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';
import { getDatabase } from '@config/database';
import { encryptionService } from '@services/encryption/encryptionService';
import type {
  Account,
  Category,
  PublicTransaction,
  Budget,
  BudgetCategory,
  SavingsGoal,
} from '@typings/core.types';

class SyncController {
  /**
   * GET /api/v1/sync?updatedSince=<ISO8601>
   *
   * Returns all core entities for the authenticated user, optionally filtered
   * to records modified since the given timestamp (delta sync).
   *
   * Omit `updatedSince` to request a full snapshot (initial sync).
   * The response includes a `syncedAt` ISO8601 timestamp which the client
   * should store as the cursor for the next delta sync request.
   */
  get = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { updatedSince } = req.query as Record<string, string | undefined>;

    let since: Date | null = null;
    if (updatedSince) {
      const parsed = new Date(updatedSince);
      if (isNaN(parsed.getTime())) {
        throw new AppError('updatedSince must be a valid ISO 8601 date string', 400);
      }
      since = parsed;
    }

    const db = getDatabase();

    const [accountRows, categoryRows, txRows, budgetRows, budgetCategoryRows, goalRows] =
      await Promise.all([
        since
          ? db('accounts').where({ user_id: userId }).where('updated_at', '>=', since)
          : db('accounts').where({ user_id: userId }),

        since
          ? db('categories').where({ user_id: userId }).where('updated_at', '>=', since)
          : db('categories').where({ user_id: userId }),

        since
          ? db('transactions').where({ user_id: userId }).where('updated_at', '>=', since)
          : db('transactions').where({ user_id: userId }),

        since
          ? db('budgets').where({ user_id: userId }).where('updated_at', '>=', since)
          : db('budgets').where({ user_id: userId }),

        since
          ? db('budget_categories as bc')
              .join('budgets as b', 'bc.budget_id', 'b.id')
              .where('b.user_id', userId)
              .where('bc.updated_at', '>=', since)
              .select('bc.*')
          : db('budget_categories as bc')
              .join('budgets as b', 'bc.budget_id', 'b.id')
              .where('b.user_id', userId)
              .select('bc.*'),

        since
          ? db('savings_goals').where({ user_id: userId }).where('updated_at', '>=', since)
          : db('savings_goals').where({ user_id: userId }),
      ]);

    const accounts: Account[] = (accountRows as Record<string, unknown>[]).map((r) => ({
      id: String(r['id']),
      userId: String(r['user_id']),
      name: String(r['name']),
      type: r['type'] as Account['type'],
      isAsset: Boolean(r['is_asset']),
      startingBalance: Number(r['starting_balance']),
      currentBalance: Number(r['current_balance']),
      currency: String(r['currency']),
      color: r['color'] != null ? String(r['color']) : null,
      institution: r['institution'] != null ? String(r['institution']) : null,
      annualRate: r['annual_rate'] != null ? Number(r['annual_rate']) : null,
      isActive: Boolean(r['is_active']),
      createdAt: new Date(String(r['created_at'])),
      updatedAt: new Date(String(r['updated_at'])),
    }));

    const categories: Category[] = (categoryRows as Record<string, unknown>[]).map((r) => ({
      id: String(r['id']),
      userId: String(r['user_id']),
      name: String(r['name']),
      color: r['color'] != null ? String(r['color']) : null,
      icon: r['icon'] != null ? String(r['icon']) : null,
      isIncome: Boolean(r['is_income']),
      parentId: r['parent_id'] != null ? String(r['parent_id']) : null,
      isActive: Boolean(r['is_active']),
      createdAt: new Date(String(r['created_at'])),
      updatedAt: new Date(String(r['updated_at'])),
    }));

    const transactions: PublicTransaction[] = (txRows as Record<string, unknown>[]).map((r) => ({
      id: String(r['id']),
      userId: String(r['user_id']),
      accountId: String(r['account_id']),
      amount: Number(r['amount']),
      description:
        r['description'] != null ? encryptionService.decrypt(String(r['description'])) : null,
      payee: r['payee'] != null ? encryptionService.decrypt(String(r['payee'])) : null,
      notes: r['notes'] != null ? encryptionService.decrypt(String(r['notes'])) : null,
      date: new Date(String(r['date'])),
      categoryId: r['category_id'] != null ? String(r['category_id']) : null,
      isTransfer: Boolean(r['is_transfer']),
      isCleared: Boolean(r['is_cleared']),
      createdAt: new Date(String(r['created_at'])),
      updatedAt: new Date(String(r['updated_at'])),
    }));

    const budgets: Budget[] = (budgetRows as Record<string, unknown>[]).map((r) => ({
      id: String(r['id']),
      userId: String(r['user_id']),
      name: String(r['name']),
      startDate: new Date(String(r['start_date'])),
      endDate: new Date(String(r['end_date'])),
      isActive: Boolean(r['is_active']),
      createdAt: new Date(String(r['created_at'])),
      updatedAt: new Date(String(r['updated_at'])),
    }));

    const budgetCategories: BudgetCategory[] = (
      budgetCategoryRows as Record<string, unknown>[]
    ).map((r) => ({
      id: String(r['id']),
      budgetId: String(r['budget_id']),
      categoryId: String(r['category_id']),
      allocatedAmount: Number(r['allocated_amount']),
      createdAt: new Date(String(r['created_at'])),
      updatedAt: new Date(String(r['updated_at'])),
    }));

    const savingsGoals: SavingsGoal[] = (goalRows as Record<string, unknown>[]).map((r) => ({
      id: String(r['id']),
      userId: String(r['user_id']),
      accountId: String(r['account_id']),
      name: String(r['name']),
      targetAmount: Number(r['target_amount']),
      targetDate: r['target_date'] != null ? String(r['target_date']) : null,
      createdAt: new Date(String(r['created_at'])),
      updatedAt: new Date(String(r['updated_at'])),
    }));

    res.json({
      status: 'success',
      data: {
        accounts,
        categories,
        transactions,
        budgets,
        budgetCategories,
        savingsGoals,
        syncedAt: new Date().toISOString(),
      },
    });
  });
}

export const syncController = new SyncController();
