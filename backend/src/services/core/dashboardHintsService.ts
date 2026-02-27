import { getDatabase } from '@config/database';
import type { DashboardHint } from '@typings/core.types';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  hints: DashboardHint[];
  expiresAt: number;
}

// In-memory cache keyed by userId
const hintCache = new Map<string, CacheEntry>();

interface TxCountRow {
  cnt: string | number;
}

interface CategoryAvgRow {
  category_name: string;
  current_total: string | number;
  avg_past: string | number;
}

interface AnchorRow {
  cnt: string | number;
}

class DashboardHintsService {
  async getHints(userId: string): Promise<DashboardHint[]> {
    const cached = hintCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.hints;
    }

    const hints: DashboardHint[] = [];
    const db = getDatabase();
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Run all hint queries in parallel
    const [uncatCount, overAvgCategories, , anchorCount] = await Promise.all([
      // Uncategorised transactions this month
      db('transactions')
        .where({ user_id: userId, is_transfer: false })
        .whereNull('category_id')
        .where('date', '>=', monthStart)
        .where('date', '<=', monthEnd)
        .count({ cnt: '*' })
        .first() as Promise<TxCountRow | undefined>,

      // Categories where this month's spend > 3-month average by ≥15%
      db
        .raw<{ rows: CategoryAvgRow[] }>(
          `
        SELECT
          c.name AS category_name,
          SUM(CASE WHEN t.date >= ? AND t.date <= ? THEN ABS(t.amount) ELSE 0 END) AS current_total,
          AVG(monthly_totals.monthly_spend) AS avg_past
        FROM (
          SELECT
            t2.category_id,
            DATE_FORMAT(t2.date, '%Y-%m') AS mo,
            SUM(ABS(t2.amount)) AS monthly_spend
          FROM transactions t2
          WHERE t2.user_id = ?
            AND t2.is_transfer = 0
            AND t2.amount < 0
            AND t2.category_id IS NOT NULL
            AND t2.date >= DATE_SUB(?, INTERVAL 4 MONTH)
            AND t2.date < ?
          GROUP BY t2.category_id, mo
        ) AS monthly_totals
        JOIN categories c ON c.id = monthly_totals.category_id
        JOIN transactions t ON t.category_id = monthly_totals.category_id AND t.user_id = ?
        WHERE t.date >= ? AND t.date <= ? AND t.is_transfer = 0 AND t.amount < 0
        GROUP BY c.id, c.name
        HAVING current_total > 0 AND avg_past > 0 AND (current_total / avg_past) > 1.15
        LIMIT 3
        `,
          [monthStart, monthEnd, userId, monthStart, monthStart, userId, monthStart, monthEnd]
        )
        .then((result) => result.rows ?? [])
        .catch(() => [] as CategoryAvgRow[]),

      // Unlinked transfer candidates (is_transfer = false, same amount in opposite sign same day)
      db('transactions')
        .where({ user_id: userId, is_transfer: false })
        .whereNull('link_id')
        .where('date', '>=', monthStart)
        .where('date', '<=', monthEnd)
        .count({ cnt: '*' })
        .first() as Promise<AnchorRow | undefined>,

      // Whether a pay-period anchor budget line exists
      db('budget_lines')
        .where({ user_id: userId, is_pay_period_anchor: true, is_active: true })
        .count({ cnt: '*' })
        .first() as Promise<AnchorRow | undefined>,
    ]);

    // 1. Uncategorised transactions
    const uncatNum = Number(uncatCount?.cnt ?? 0);
    if (uncatNum > 0) {
      hints.push({
        id: 'uncategorized-transactions',
        type: 'action',
        message: `${uncatNum} transaction${uncatNum === 1 ? '' : 's'} uncategorised this month`,
        linkTo: '/transactions?filter=uncategorized',
      });
    }

    // 2. Category overspend vs 3-month average
    for (const row of overAvgCategories) {
      const current = Number(row.current_total);
      const avg = Number(row.avg_past);
      if (avg > 0) {
        const pct = Math.round(((current - avg) / avg) * 100);
        hints.push({
          id: `overspend-${row.category_name}`,
          type: 'warning',
          message: `${row.category_name} spending is ${pct}% above your 3-month average`,
          linkTo: '/reports',
        });
      }
    }

    // 3. No pay-period anchor set
    const anchorNum = Number(anchorCount?.cnt ?? 0);
    if (anchorNum === 0) {
      hints.push({
        id: 'no-pay-period-anchor',
        type: 'info',
        message: 'No pay period anchor is set — set one to enable pay-period budget view',
        linkTo: '/budget',
      });
    }

    // Cache result
    hintCache.set(userId, { hints, expiresAt: Date.now() + CACHE_TTL_MS });
    return hints;
  }

  clearCache(userId: string): void {
    hintCache.delete(userId);
  }
}

export const dashboardHintsService = new DashboardHintsService();
