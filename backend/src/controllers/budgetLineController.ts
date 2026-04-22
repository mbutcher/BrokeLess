import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';
import { budgetLineService } from '@services/core/budgetLineService';
import { budgetLineRepository } from '@repositories/budgetLineRepository';
import { getDatabase } from '@config/database';
import { computeOccurrences, toISODate } from '@utils/recurringDates';
import type {
  CreateBudgetLineData,
  UpdateBudgetLineData,
  BudgetLineFrequency,
  UpcomingFixedItem,
  UpcomingFlexibleItem,
} from '@typings/core.types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class BudgetLineController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const lines = await budgetLineService.listBudgetLines(req.user!.id);
    res.json({ status: 'success', data: { budgetLines: lines } });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const line = await budgetLineService.getBudgetLine(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: { budgetLine: line } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateBudgetLineData, 'userId'>;
    const line = await budgetLineService.createBudgetLine(
      req.user!.id,
      input,
      req.user!.householdId
    );
    res.status(201).json({ status: 'success', data: { budgetLine: line } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateBudgetLineData;
    const line = await budgetLineService.updateBudgetLine(
      req.user!.id,
      req.params['id']!,
      input,
      req.user!.householdId
    );
    res.json({ status: 'success', data: { budgetLine: line } });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await budgetLineService.deleteBudgetLine(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });

  getRollover = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = req.query;
    if (typeof start !== 'string' || !ISO_DATE_RE.test(start)) {
      throw new AppError('start must be a valid ISO date (YYYY-MM-DD)', 400);
    }
    if (typeof end !== 'string' || !ISO_DATE_RE.test(end)) {
      throw new AppError('end must be a valid ISO date (YYYY-MM-DD)', 400);
    }
    const summary = await budgetLineService.getRolloverSummary(req.user!.id, start, end);
    res.json({ status: 'success', data: { rollover: summary } });
  });

  getBudgetView = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = req.query;
    if (typeof start !== 'string' || !ISO_DATE_RE.test(start)) {
      throw new AppError('start must be a valid ISO date (YYYY-MM-DD)', 400);
    }
    if (typeof end !== 'string' || !ISO_DATE_RE.test(end)) {
      throw new AppError('end must be a valid ISO date (YYYY-MM-DD)', 400);
    }
    const view = await budgetLineService.getBudgetView(req.user!.id, start, end);
    res.json({ status: 'success', data: { budgetView: view } });
  });

  getPayPeriod = asyncHandler(async (req: Request, res: Response) => {
    const period = await budgetLineService.getCurrentPayPeriod(req.user!.id);
    res.json({ status: 'success', data: { payPeriod: period } });
  });

  getUpcoming = asyncHandler(async (req: Request, res: Response) => {
    const { start, end, includeFlexible } = req.query;

    if (typeof start !== 'string' || !ISO_DATE_RE.test(start)) {
      throw new AppError('start must be a valid ISO date (YYYY-MM-DD)', 400);
    }
    if (typeof end !== 'string' || !ISO_DATE_RE.test(end)) {
      throw new AppError('end must be a valid ISO date (YYYY-MM-DD)', 400);
    }

    // Middleware coerces 'true'/'false' strings to booleans; String() handles both
    const showFlexible = String(includeFlexible) === 'true';
    const userId = req.user!.id;

    const lines = await budgetLineRepository.findAllForUser(userId);
    const expenseLines = lines.filter((l) => l.classification === 'expense');

    // Fetch account names for lines that have account_id
    const accountIds = [
      ...new Set(expenseLines.map((l) => l.accountId).filter(Boolean)),
    ] as string[];
    const accountMap = new Map<string, string>();
    if (accountIds.length > 0) {
      const db = getDatabase();
      const accountRows = await db('accounts')
        .where('user_id', userId)
        .whereIn('id', accountIds)
        .select<Array<{ id: string; name: string }>>('id', 'name');
      for (const row of accountRows) {
        accountMap.set(row.id, row.name);
      }
    }

    // Period days lookup for proration (approximate days per cycle)
    const periodDays: Record<BudgetLineFrequency, (interval?: number | null) => number> = {
      weekly: () => 7,
      biweekly: () => 14,
      semi_monthly: () => 15,
      twice_monthly: () => 15,
      monthly: () => 30,
      annually: () => 365,
      every_n_days: (interval) => interval ?? 1,
      one_time: () => Infinity,
    };

    const windowStart = new Date(start + 'T00:00:00');
    const windowEnd = new Date(end + 'T00:00:00');
    const windowDays = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24) + 1;

    const fixedItems: UpcomingFixedItem[] = [];
    const flexibleItems: UpcomingFlexibleItem[] = [];

    for (const line of expenseLines) {
      if (line.flexibility === 'fixed') {
        const occurrenceDates = computeOccurrences(
          new Date(line.anchorDate + 'T00:00:00'),
          line.frequency,
          line.frequencyInterval,
          windowStart,
          windowEnd,
          line.dayOfMonth1,
          line.dayOfMonth2
        );
        for (const date of occurrenceDates) {
          fixedItems.push({
            budgetLineId: line.id,
            name: line.name,
            amount: line.amount,
            date: toISODate(date),
            categoryId: line.categoryId,
            subcategoryId: line.subcategoryId,
            accountId: line.accountId,
            accountName: line.accountId ? (accountMap.get(line.accountId) ?? null) : null,
          });
        }
      } else if (showFlexible && line.flexibility === 'flexible') {
        // one_time flexible lines only appear if their anchor date falls in the window
        if (line.frequency === 'one_time' && (line.anchorDate < start || line.anchorDate > end)) {
          continue;
        }
        const pDays = periodDays[line.frequency](line.frequencyInterval);
        const proratedAmount =
          pDays === Infinity
            ? line.amount
            : Math.round(((line.amount * windowDays) / pDays) * 100) / 100;
        flexibleItems.push({
          budgetLineId: line.id,
          name: line.name,
          fullPeriodAmount: line.amount,
          proratedAmount,
          frequency: line.frequency,
          categoryId: line.categoryId,
        });
      }
    }

    fixedItems.sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      status: 'success',
      data: { upcoming: { start, end, fixedItems, flexibleItems } },
    });
  });
}

export const budgetLineController = new BudgetLineController();
