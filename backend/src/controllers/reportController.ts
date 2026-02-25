import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
import { getDatabase } from '@config/database';
import { forecastService } from '@services/core/forecastService';
import { netWorthSnapshotRepository } from '@repositories/netWorthSnapshotRepository';
import type { SpendingByCategoryItem } from '@typings/core.types';

interface MonthlySummaryRow {
  month: string;
  income: string | number;
  expenses: string | number;
}

interface CategorySpendRow {
  category_id: string;
  category_name: string;
  parent_id: string | null;
  color: string | null;
  total: string | number;
}

class ReportController {
  monthlySummary = asyncHandler(async (req: Request, res: Response) => {
    const rawMonths = req.query['months'];
    const months = Math.min(Math.max(parseInt(String(rawMonths ?? '6'), 10) || 6, 1), 24);

    const db = getDatabase();
    const rows = (await db('transactions')
      .where({ user_id: req.user!.id, is_transfer: false })
      .where('date', '>=', db.raw('DATE_SUB(CURDATE(), INTERVAL ? MONTH)', [months]))
      .select(db.raw("DATE_FORMAT(date, '%Y-%m') as month"))
      .sum({ income: db.raw('CASE WHEN amount > 0 THEN amount ELSE 0 END') })
      .sum({ expenses: db.raw('CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END') })
      .groupBy('month')
      .orderBy('month', 'asc')) as MonthlySummaryRow[];

    const data = rows.map((row) => ({
      month: row['month'],
      income: Number(row['income']),
      expenses: Number(row['expenses']),
    }));

    res.json({ status: 'success', data: { summary: data } });
  });

  forecast = asyncHandler(async (req: Request, res: Response) => {
    const rawMonths = req.query['months'];
    const months = Math.min(Math.max(parseInt(String(rawMonths ?? '3'), 10) || 3, 1), 12);
    const data = await forecastService.getForecast(req.user!.id, months);
    res.json({ status: 'success', data: { forecast: data } });
  });

  spendingByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { start, end, type = 'expense' } = req.query as Record<string, string>;

    if (!start || !ISO_DATE_RE.test(start)) {
      throw new AppError('start query param is required (YYYY-MM-DD)', 400);
    }
    if (!end || !ISO_DATE_RE.test(end)) {
      throw new AppError('end query param is required (YYYY-MM-DD)', 400);
    }
    if (type !== 'expense' && type !== 'income') {
      throw new AppError('type must be expense or income', 400);
    }

    const db = getDatabase();

    // Sign filter: expenses are negative amounts, income is positive
    const amountFilter = type === 'income' ? db.raw('t.amount > 0') : db.raw('t.amount < 0');

    const rows = (await db('transactions as t')
      .join('categories as c', 't.category_id', 'c.id')
      .where('t.user_id', req.user!.id)
      .where('t.is_transfer', false)
      .whereNotNull('t.category_id')
      .where('t.date', '>=', start)
      .where('t.date', '<=', end)
      .whereRaw(amountFilter)
      .select('t.category_id', 'c.name as category_name', 'c.parent_id', 'c.color')
      .sum({ total: db.raw('ABS(t.amount)') })
      .groupBy('t.category_id', 'c.name', 'c.parent_id', 'c.color')
      .orderBy('total', 'desc')) as CategorySpendRow[];

    const grandTotal = rows.reduce((sum, r) => sum + Number(r['total']), 0);

    const categories: SpendingByCategoryItem[] = rows.map((r) => ({
      categoryId: r['category_id'],
      categoryName: r['category_name'],
      parentId: r['parent_id'] ?? null,
      color: r['color'] ?? null,
      totalAmount: Number(r['total']),
      percentage: grandTotal > 0 ? Math.round((Number(r['total']) / grandTotal) * 1000) / 10 : 0,
    }));

    res.json({
      status: 'success',
      data: {
        start,
        end,
        type,
        total: grandTotal,
        categories,
      },
    });
  });

  netWorthHistory = asyncHandler(async (req: Request, res: Response) => {
    const rawMonths = req.query['months'];
    const months = Math.min(Math.max(parseInt(String(rawMonths ?? '12'), 10) || 12, 1), 60);
    const snapshots = await netWorthSnapshotRepository.findHistory(req.user!.id, months);
    const latest = snapshots[snapshots.length - 1] ?? null;
    res.json({ status: 'success', data: { snapshots, latest } });
  });

  takeNetWorthSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const snapshot = await netWorthSnapshotRepository.takeSnapshot(req.user!.id);
    res.status(201).json({ status: 'success', data: { snapshot } });
  });
}

export const reportController = new ReportController();
