import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
import { getDatabase } from '@config/database';
import { dialectHelper } from '@utils/db/dialectHelper';
import { forecastService } from '@services/core/forecastService';
import { netWorthSnapshotRepository } from '@repositories/netWorthSnapshotRepository';
import { encryptionService } from '@services/encryption/encryptionService';
import type { SpendingByCategoryItem, TopPayeeItem, TagSummaryItem } from '@typings/core.types';

interface PayeeRow {
  payee: string;
  amount: string | number;
}

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
      .where('date', '>=', dialectHelper.nowMinusInterval(db, months, 'MONTH'))
      .select(db.raw(`${dialectHelper.formatMonthSQL('date')} as month`))
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
    if (start > end) {
      throw new AppError('start must be on or before end', 400);
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

  topPayees = asyncHandler(async (req: Request, res: Response) => {
    const { start, end, type = 'expense' } = req.query as Record<string, string>;
    const rawLimit = req.query['limit'];
    const limit = Math.min(Math.max(parseInt(String(rawLimit ?? '10'), 10) || 10, 1), 50);

    if (!start || !ISO_DATE_RE.test(start)) {
      throw new AppError('start query param is required (YYYY-MM-DD)', 400);
    }
    if (!end || !ISO_DATE_RE.test(end)) {
      throw new AppError('end query param is required (YYYY-MM-DD)', 400);
    }
    if (start > end) {
      throw new AppError('start must be on or before end', 400);
    }
    if (type !== 'expense' && type !== 'income') {
      throw new AppError('type must be expense or income', 400);
    }

    const db = getDatabase();
    const amountFilter = type === 'income' ? db.raw('amount > 0') : db.raw('amount < 0');

    const rows = (await db('transactions')
      .where({ user_id: req.user!.id, is_transfer: false })
      .whereNotNull('payee')
      .where('date', '>=', start)
      .where('date', '<=', end)
      .whereRaw(amountFilter)
      .select('payee', 'amount')) as PayeeRow[];

    // Decrypt and aggregate by payee
    const totals = new Map<string, number>();
    for (const row of rows) {
      const decrypted = encryptionService.decrypt(String(row.payee));
      const existing = totals.get(decrypted) ?? 0;
      totals.set(decrypted, existing + Math.abs(Number(row.amount)));
    }

    const grandTotal = Array.from(totals.values()).reduce((sum, v) => sum + v, 0);

    const payees: TopPayeeItem[] = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([payee, totalAmount]) => ({
        payee,
        totalAmount,
        percentage: grandTotal > 0 ? Math.round((totalAmount / grandTotal) * 1000) / 10 : 0,
      }));

    res.json({ status: 'success', data: { start, end, type, total: grandTotal, payees } });
  });

  tagSummary = asyncHandler(async (req: Request, res: Response) => {
    const { start, end, type = 'expense' } = req.query as Record<string, string>;

    if (!start || !ISO_DATE_RE.test(start)) {
      throw new AppError('start query param is required (YYYY-MM-DD)', 400);
    }
    if (!end || !ISO_DATE_RE.test(end)) {
      throw new AppError('end query param is required (YYYY-MM-DD)', 400);
    }
    if (start > end) {
      throw new AppError('start must be on or before end', 400);
    }
    if (type !== 'expense' && type !== 'income') {
      throw new AppError('type must be expense or income', 400);
    }

    const db = getDatabase();
    const amountFilter = type === 'income' ? db.raw('t.amount > 0') : db.raw('t.amount < 0');

    interface TagRow {
      tag: string;
      total_amount: string | number;
      tx_count: string | number;
    }

    const rows = (await db('transaction_tags as tt')
      .join('transactions as t', 't.id', 'tt.transaction_id')
      .where('t.user_id', req.user!.id)
      .where('t.is_transfer', false)
      .where('t.date', '>=', start)
      .where('t.date', '<=', end)
      .whereRaw(amountFilter)
      .groupBy('tt.tag')
      .select('tt.tag')
      .sum({ total_amount: db.raw('ABS(t.amount)') })
      .count({ tx_count: 't.id' })
      .orderBy('total_amount', 'desc')) as TagRow[];

    const grandTotal = rows.reduce((sum, r) => sum + Number(r.total_amount), 0);

    const tags: TagSummaryItem[] = rows.map((r) => ({
      tag: r.tag,
      totalAmount: Number(r.total_amount),
      percentage:
        grandTotal > 0 ? Math.round((Number(r.total_amount) / grandTotal) * 1000) / 10 : 0,
      count: Number(r.tx_count),
    }));

    res.json({ status: 'success', data: { start, end, type, total: grandTotal, tags } });
  });
}

export const reportController = new ReportController();
