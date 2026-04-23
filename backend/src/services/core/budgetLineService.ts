import { budgetLineRepository } from '@repositories/budgetLineRepository';
import type {
  BudgetLine,
  BudgetView,
  BudgetViewLine,
  CreateBudgetLineData,
  Occurrence,
  PayPeriod,
  RolloverLine,
  RolloverSummary,
  UpdateBudgetLineData,
} from '@typings/core.types';
import { categoryRepository } from '@repositories/categoryRepository';
import { accountRepository } from '@repositories/accountRepository';
import { computeOccurrences, toISODate } from '@utils/recurringDates';
import { AppError } from '@middleware/errorHandler';

// ─── Schedule math ────────────────────────────────────────────────────────────

/**
 * Convert a Budget Line amount to its annual equivalent.
 * Used for prorating to any arbitrary view window.
 */
function toAnnual(
  amount: number,
  frequency: BudgetLine['frequency'],
  interval: number | null
): number {
  switch (frequency) {
    case 'weekly':
      return amount * 52;
    case 'biweekly':
      return amount * 26;
    case 'semi_monthly':
      return amount * 24;
    case 'twice_monthly':
      return amount * 24;
    case 'monthly':
      return amount * 12;
    case 'annually':
      return amount;
    case 'every_n_days':
      return interval && interval > 0 ? amount * (365 / interval) : amount * 12;
    case 'one_time':
      return amount; // handled separately in proration
  }
}

/**
 * Returns the prorated amount for a Budget Line within a view window [start, end].
 * For one_time: the full amount if anchor_date falls in the window, else 0.
 */
function proratedAmount(
  amount: number,
  frequency: BudgetLine['frequency'],
  interval: number | null,
  anchorDate: Date,
  windowStart: Date,
  windowEnd: Date
): number {
  if (frequency === 'one_time') {
    const anchor = anchorDate.getTime();
    return anchor >= windowStart.getTime() && anchor <= windowEnd.getTime() ? amount : 0;
  }
  const daysInWindow = (windowEnd.getTime() - windowStart.getTime()) / 86_400_000 + 1;
  const annual = toAnnual(amount, frequency, interval);
  return Math.round(annual * (daysInWindow / 365) * 100) / 100;
}

/**
 * Given a pay-period anchor Budget Line, compute the start and end of the
 * pay period that contains `referenceDate` (defaults to today).
 * Exported so dashboardHintsService can compute the previous pay period.
 */
export function computeCurrentPayPeriod(
  anchorLine: BudgetLine,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const anchor = new Date(anchorLine.anchorDate);
  const ref = new Date(referenceDate);

  if (anchorLine.frequency === 'one_time') {
    // Degenerate: use anchor date as single-day period
    return { start: anchor, end: anchor };
  }

  const stepMs: number = (() => {
    switch (anchorLine.frequency) {
      case 'weekly':
        return 7 * 86_400_000;
      case 'biweekly':
        return 14 * 86_400_000;
      case 'every_n_days':
        return (anchorLine.frequencyInterval ?? 30) * 86_400_000;
      default:
        return 0; // month-based handled separately
    }
  })();

  // Fixed-day-count frequencies
  if (stepMs > 0) {
    let periodStart = new Date(anchor);
    // Walk forward until periodStart > ref
    while (periodStart.getTime() + stepMs <= ref.getTime()) {
      periodStart = new Date(periodStart.getTime() + stepMs);
    }
    // Walk backward if ref < anchor
    while (periodStart > ref) {
      periodStart = new Date(periodStart.getTime() - stepMs);
    }
    const periodEnd = new Date(periodStart.getTime() + stepMs - 86_400_000);
    return { start: periodStart, end: periodEnd };
  }

  // Month-based frequencies (monthly, semi_monthly, twice_monthly, annually)
  // Find the most recent occurrence on or before ref, then the next one after.
  const d1 = anchorLine.dayOfMonth1 ?? 1;
  const d2 = anchorLine.dayOfMonth2 ?? 15;

  const stepForward = (d: Date): Date => {
    const next = new Date(d);
    switch (anchorLine.frequency) {
      case 'monthly':
        next.setUTCMonth(next.getUTCMonth() + 1);
        break;
      case 'semi_monthly': {
        const day = next.getUTCDate();
        if (day < 15) next.setUTCDate(15);
        else {
          next.setUTCMonth(next.getUTCMonth() + 1);
          next.setUTCDate(1);
        }
        break;
      }
      case 'twice_monthly': {
        const currentDay = next.getUTCDate();
        const lastDayThisMonth = new Date(
          Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
        ).getUTCDate();
        const resolvedD2 = d2 === 31 ? lastDayThisMonth : Math.min(d2, lastDayThisMonth);
        if (currentDay < resolvedD2) {
          next.setUTCDate(resolvedD2);
        } else {
          next.setUTCMonth(next.getUTCMonth() + 1, 1);
          const lastDayNextMonth = new Date(
            Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
          ).getUTCDate();
          next.setUTCDate(d1 === 31 ? lastDayNextMonth : Math.min(d1, lastDayNextMonth));
        }
        break;
      }
      case 'annually':
        next.setUTCFullYear(next.getUTCFullYear() + 1);
        break;
      default:
        break;
    }
    return next;
  };

  // Step backward one occurrence (inverse of stepForward)
  const stepBackward = (d: Date): Date => {
    const prev = new Date(d);
    switch (anchorLine.frequency) {
      case 'monthly':
        prev.setUTCMonth(prev.getUTCMonth() - 1);
        break;
      case 'semi_monthly': {
        const day = prev.getUTCDate();
        if (day >= 15) {
          prev.setUTCDate(1);
        } else {
          prev.setUTCMonth(prev.getUTCMonth() - 1);
          prev.setUTCDate(15);
        }
        break;
      }
      case 'twice_monthly': {
        const currentDay = prev.getUTCDate();
        const lastDayThisMonth = new Date(
          Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0)
        ).getUTCDate();
        const resolvedD1 = d1 === 31 ? lastDayThisMonth : Math.min(d1, lastDayThisMonth);
        if (currentDay <= resolvedD1) {
          // We're at d1 — step back to d2 of previous month
          prev.setUTCMonth(prev.getUTCMonth() - 1);
          const lastDayPrev = new Date(
            Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0)
          ).getUTCDate();
          prev.setUTCDate(d2 === 31 ? lastDayPrev : Math.min(d2, lastDayPrev));
        } else {
          // We're at d2 — step back to d1 of same month
          prev.setUTCDate(resolvedD1);
        }
        break;
      }
      case 'annually':
        prev.setUTCFullYear(prev.getUTCFullYear() - 1);
        break;
      default:
        break;
    }
    return prev;
  };

  let current = new Date(anchor);
  // If anchor is ahead of ref, walk backward until we're at or before ref
  while (current > ref) {
    current = stepBackward(current);
  }
  // Walk forward to find the last period start still <= ref
  while (stepForward(current) <= ref) {
    current = stepForward(current);
  }
  const next = stepForward(current);
  const periodEnd = new Date(next.getTime() - 86_400_000);
  return { start: current, end: periodEnd };
}

// ─── Service ──────────────────────────────────────────────────────────────────

class BudgetLineService {
  /** Validates that accountId, if provided, belongs to the requesting user. */
  private async validateAccountOwnership(userId: string, accountId?: string | null): Promise<void> {
    if (!accountId) return;
    const account = await accountRepository.findById(accountId, userId);
    if (!account) throw new AppError('Account not found', 404);
  }

  /**
   * Validates that categoryId references a top-level Category and, when
   * provided, that subcategoryId is a direct child of that Category.
   */
  private async validateCategoryHierarchy(
    householdId: string,
    categoryId: string,
    subcategoryId?: string | null
  ): Promise<void> {
    const category = await categoryRepository.findById(categoryId, householdId);
    if (!category) throw new AppError('Category not found', 404);
    if (category.parentId !== null) {
      throw new AppError('categoryId must be a top-level Category (not a Subcategory)', 400);
    }

    if (subcategoryId) {
      const sub = await categoryRepository.findById(subcategoryId, householdId);
      if (!sub) throw new AppError('Subcategory not found', 404);
      if (sub.parentId !== categoryId) {
        throw new AppError('subcategoryId must be a child of the specified categoryId', 400);
      }
    }
  }

  async listBudgetLines(userId: string): Promise<BudgetLine[]> {
    return budgetLineRepository.findAllForUser(userId);
  }

  async getBudgetLine(userId: string, id: string): Promise<BudgetLine> {
    const line = await budgetLineRepository.findById(id, userId);
    if (!line) throw new AppError('Budget line not found', 404);
    return line;
  }

  async createBudgetLine(
    userId: string,
    input: Omit<CreateBudgetLineData, 'userId'>,
    householdId?: string
  ): Promise<BudgetLine> {
    if (householdId) {
      await this.validateCategoryHierarchy(householdId, input.categoryId, input.subcategoryId);
    }
    await this.validateAccountOwnership(userId, input.accountId);

    if (input.isPayPeriodAnchor && input.classification === 'expense') {
      throw new AppError('isPayPeriodAnchor can only be set on income Budget Lines', 400);
    }

    // Atomically clear existing anchors and create the new line
    if (input.isPayPeriodAnchor && input.classification === 'income') {
      return budgetLineRepository.transaction(async (trx) => {
        await budgetLineRepository.clearPayPeriodAnchors(userId, trx);
        return budgetLineRepository.create({ ...input, userId }, trx);
      });
    }

    return budgetLineRepository.create({ ...input, userId });
  }

  async updateBudgetLine(
    userId: string,
    id: string,
    input: UpdateBudgetLineData,
    householdId?: string
  ): Promise<BudgetLine> {
    const existing = await budgetLineRepository.findById(id, userId);
    if (!existing) throw new AppError('Budget line not found', 404);

    if (householdId && (input.categoryId !== undefined || input.subcategoryId !== undefined)) {
      await this.validateCategoryHierarchy(
        householdId,
        input.categoryId ?? existing.categoryId,
        input.subcategoryId
      );
    }

    if (input.accountId !== undefined) {
      await this.validateAccountOwnership(userId, input.accountId);
    }

    if (input.isPayPeriodAnchor === true) {
      const effectiveClassification = input.classification ?? existing.classification;
      if (effectiveClassification !== 'income') {
        throw new AppError('isPayPeriodAnchor can only be set on income Budget Lines', 400);
      }
      // Atomically clear existing anchors and apply the update
      const updated = await budgetLineRepository.transaction(async (trx) => {
        await budgetLineRepository.clearPayPeriodAnchors(userId, trx);
        return budgetLineRepository.update(id, userId, input, trx);
      });
      if (!updated) throw new AppError('Budget line not found', 404);
      return updated;
    }

    const updated = await budgetLineRepository.update(id, userId, input);
    if (!updated) throw new AppError('Budget line not found', 404);
    return updated;
  }

  async deleteBudgetLine(userId: string, id: string): Promise<void> {
    const existing = await budgetLineRepository.findById(id, userId);
    if (!existing) throw new AppError('Budget line not found', 404);
    await budgetLineRepository.softDelete(id, userId);
  }

  // ─── Budget View ───────────────────────────────────────────────────────────

  async getBudgetView(userId: string, start: string, end: string): Promise<BudgetView> {
    const windowStart = new Date(start + 'T00:00:00');
    const windowEnd = new Date(end + 'T00:00:00');

    if (windowStart > windowEnd) {
      throw new AppError('start must be on or before end', 400);
    }

    const lines = await budgetLineRepository.findAllForUser(userId);

    // Fetch actuals per budget line: budget_line_id match OR (no link + category match).
    // Running in parallel is fine — users typically have < 40 lines.
    const actualsPerLine = new Map(
      await Promise.all(
        lines.map(
          async (line) =>
            [
              line.id,
              await budgetLineRepository.getActualsForLine(
                userId,
                line.id,
                start,
                end,
                line.classification === 'income'
              ),
            ] as [string, number]
        )
      )
    );

    // Build Budget View Lines
    const viewLines: BudgetViewLine[] = lines.map((line) => {
      const anchor = new Date(line.anchorDate + 'T00:00:00');
      const prorated = proratedAmount(
        line.amount,
        line.frequency,
        line.frequencyInterval,
        anchor,
        windowStart,
        windowEnd
      );

      const actual = actualsPerLine.get(line.id) ?? 0;

      const occurrenceDates = computeOccurrences(
        anchor,
        line.frequency,
        line.frequencyInterval,
        windowStart,
        windowEnd,
        line.dayOfMonth1,
        line.dayOfMonth2
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const occurrences: Occurrence[] = occurrenceDates.map((d) => ({
        budgetLineId: line.id,
        dueDate: toISODate(d),
        expectedAmount: line.amount,
        status: d <= today ? 'missed' : 'upcoming',
      }));

      return {
        budgetLine: line,
        proratedAmount: prorated,
        actualAmount: actual,
        variance: prorated - actual,
        occurrences,
      };
    });

    const expenseLines = viewLines.filter((l) => l.budgetLine.classification === 'expense');
    const incomeLines = viewLines.filter((l) => l.budgetLine.classification === 'income');

    return {
      start,
      end,
      lines: viewLines,
      totalProratedIncome: incomeLines.reduce((s, l) => s + l.proratedAmount, 0),
      totalProratedExpenses: expenseLines.reduce((s, l) => s + l.proratedAmount, 0),
      totalActualIncome: incomeLines.reduce((s, l) => s + l.actualAmount, 0),
      totalActualExpenses: expenseLines.reduce((s, l) => s + l.actualAmount, 0),
    };
  }

  async getCurrentPayPeriod(userId: string): Promise<PayPeriod | null> {
    const anchor = await budgetLineRepository.findPayPeriodAnchor(userId);
    if (!anchor) return null;

    const { start, end } = computeCurrentPayPeriod(anchor);
    return {
      start: start.toISOString().substring(0, 10),
      end: end.toISOString().substring(0, 10),
      budgetLineId: anchor.id,
      frequency: anchor.frequency,
    };
  }

  /**
   * Computes a rollover variance summary for all flexible expense Budget Lines
   * within the given prior period window. Positive variance = underspent (surplus);
   * negative variance = overspent (deficit).
   */
  async getRolloverSummary(userId: string, start: string, end: string): Promise<RolloverSummary> {
    const windowStart = new Date(start + 'T00:00:00');
    const windowEnd = new Date(end + 'T00:00:00');

    if (windowStart > windowEnd) {
      throw new AppError('start must be on or before end', 400);
    }

    const lines = await budgetLineRepository.findAllForUser(userId);
    const flexibleExpenseLines = lines.filter(
      (l) => l.classification === 'expense' && l.flexibility === 'flexible'
    );

    const actualsPerLine = new Map(
      await Promise.all(
        flexibleExpenseLines.map(
          async (line) =>
            [
              line.id,
              await budgetLineRepository.getActualsForLine(userId, line.id, start, end, false),
            ] as [string, number]
        )
      )
    );

    const rolloverLines: RolloverLine[] = flexibleExpenseLines.map((line) => {
      const anchor = new Date(line.anchorDate + 'T00:00:00');
      const prorated = proratedAmount(
        line.amount,
        line.frequency,
        line.frequencyInterval,
        anchor,
        windowStart,
        windowEnd
      );
      const actual = actualsPerLine.get(line.id) ?? 0;
      return {
        budgetLineId: line.id,
        name: line.name,
        categoryId: line.categoryId,
        proratedAmount: prorated,
        actualAmount: actual,
        variance: prorated - actual,
      };
    });

    return {
      previousPeriod: { start, end },
      flexibleLines: rolloverLines,
      totalProratedFlexible: rolloverLines.reduce((s, l) => s + l.proratedAmount, 0),
      totalActualFlexible: rolloverLines.reduce((s, l) => s + l.actualAmount, 0),
    };
  }
}

export const budgetLineService = new BudgetLineService();
