import { getDatabase } from '@config/database';
import type { BudgetLine, DashboardHint } from '@typings/core.types';
import { computeCurrentPayPeriod } from '@services/core/budgetLineService';
import { dialectHelper } from '@utils/db/dialectHelper';
import { simplefinAccountMappingRepository } from '@repositories/simplefinAccountMappingRepository';

const ANNUAL_REVIEW_THRESHOLD_MS = 365 * 24 * 60 * 60 * 1000;

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
  frequency: string;
  anchor_date: Date | string;
  frequency_interval: number | null;
  day_of_month_1: number | null;
  day_of_month_2: number | null;
}

interface FlexibleLineCountRow {
  cnt: string | number;
}

interface BudgetReviewRow {
  budget_lines_last_reviewed_at: Date | string | null;
  acknowledged_rollovers: string | null;
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
    const [
      uncatCount,
      overAvgCategories,
      anchorRow,
      flexibleLineCount,
      dashboardRow,
      unlinkedSfCount,
    ] = await Promise.all([
      // Uncategorised transactions this month
      db('transactions')
        .where({ user_id: userId, is_transfer: false })
        .whereNull('budget_line_id')
        .where('date', '>=', monthStart)
        .where('date', '<=', monthEnd)
        .count({ cnt: '*' })
        .first() as Promise<TxCountRow | undefined>,

      // Categories where this month's spend > 3-month average by ≥15%.
      // current_total is computed in a separate LEFT JOIN subquery to avoid
      // the N×M Cartesian product (monthly_totals × transactions) that would
      // inflate the SUM when a category has multiple months of history.
      db
        .raw(
          `
        SELECT
          c.name AS category_name,
          COALESCE(curr.current_total, 0) AS current_total,
          AVG(monthly_totals.monthly_spend) AS avg_past
        FROM (
          SELECT
            t2.category_id,
            ${dialectHelper.formatMonthSQL('t2.date')} AS mo,
            SUM(ABS(t2.amount)) AS monthly_spend
          FROM transactions t2
          WHERE t2.user_id = ?
            AND t2.is_transfer = false
            AND t2.amount < 0
            AND t2.category_id IS NOT NULL
            AND t2.date >= ${dialectHelper.dateSubSQL('?', 4, 'MONTH')}
            AND t2.date < ?
          GROUP BY t2.category_id, mo
        ) AS monthly_totals
        JOIN categories c ON c.id = monthly_totals.category_id
        LEFT JOIN (
          SELECT category_id, SUM(ABS(amount)) AS current_total
          FROM transactions
          WHERE user_id = ?
            AND is_transfer = false
            AND amount < 0
            AND category_id IS NOT NULL
            AND date >= ?
            AND date <= ?
          GROUP BY category_id
        ) AS curr ON curr.category_id = monthly_totals.category_id
        GROUP BY c.id, c.name, curr.current_total
        HAVING current_total > 0
          AND AVG(monthly_totals.monthly_spend) > 0
          AND (current_total / AVG(monthly_totals.monthly_spend)) > 1.15
        LIMIT 3
        `,
          [userId, monthStart, monthStart, userId, monthStart, monthEnd]
        )
        .then((result: unknown) => dialectHelper.rawRows<CategoryAvgRow>(result))
        .catch(() => [] as CategoryAvgRow[]),

      // Fetch the pay-period anchor budget line (if one exists)
      db('budget_lines')
        .where({ user_id: userId, is_pay_period_anchor: true, is_active: true })
        .select(
          'frequency',
          'anchor_date',
          'frequency_interval',
          'day_of_month_1',
          'day_of_month_2'
        )
        .first() as Promise<AnchorRow | undefined>,

      // Count of active flexible expense budget lines (needed for rollover + annual review hints)
      db('budget_lines')
        .where({
          user_id: userId,
          classification: 'expense',
          flexibility: 'flexible',
          is_active: true,
        })
        .count({ cnt: '*' })
        .first() as Promise<FlexibleLineCountRow | undefined>,

      // Dashboard config row — for acknowledged_rollovers and budget_lines_last_reviewed_at
      db('user_dashboard_config')
        .where({ user_id: userId })
        .select('budget_lines_last_reviewed_at', 'acknowledged_rollovers')
        .first() as Promise<BudgetReviewRow | undefined>,

      // Unlinked SimpleFIN accounts (non-ignored)
      simplefinAccountMappingRepository.countUnlinkedActive(userId),
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
    if (!anchorRow) {
      hints.push({
        id: 'no-pay-period-anchor',
        type: 'info',
        message: 'No pay period anchor is set — set one to enable pay-period budget view',
        linkTo: '/budget',
      });
    }

    const flexibleNum = Number(flexibleLineCount?.cnt ?? 0);

    // 4. Unreviewed rollover — only if anchor + flexible lines exist
    if (anchorRow && flexibleNum > 0) {
      // Build a minimal BudgetLine from the anchor row to pass to computeCurrentPayPeriod
      const anchorLine = {
        frequency: String(anchorRow.frequency) as BudgetLine['frequency'],
        anchorDate:
          anchorRow.anchor_date instanceof Date
            ? anchorRow.anchor_date.toISOString().slice(0, 10)
            : String(anchorRow.anchor_date).slice(0, 10),
        frequencyInterval:
          anchorRow.frequency_interval != null ? Number(anchorRow.frequency_interval) : null,
        dayOfMonth1: anchorRow.day_of_month_1 != null ? Number(anchorRow.day_of_month_1) : null,
        dayOfMonth2: anchorRow.day_of_month_2 != null ? Number(anchorRow.day_of_month_2) : null,
      } as BudgetLine;

      // Current period
      const current = computeCurrentPayPeriod(anchorLine, now);
      // Previous period = period containing the day before the current period started
      const dayBeforeCurrent = new Date(current.start.getTime() - 86_400_000);
      const previous = computeCurrentPayPeriod(anchorLine, dayBeforeCurrent);

      const prevStart = previous.start.toISOString().slice(0, 10);
      const prevEnd = previous.end.toISOString().slice(0, 10);
      const rolloverKey = `${prevStart}_${prevEnd}`;

      let acknowledgedRollovers: Record<string, string> = {};
      if (dashboardRow?.acknowledged_rollovers) {
        try {
          const raw = dashboardRow.acknowledged_rollovers;
          acknowledgedRollovers = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<
            string,
            string
          >;
        } catch {
          // Corrupt JSON — treat as empty (no acknowledged rollovers)
        }
      }

      if (!acknowledgedRollovers[rolloverKey]) {
        hints.push({
          id: 'unreviewed-rollover',
          type: 'warning',
          message: `Budget period ${prevStart} – ${prevEnd} ended without a rollover review`,
          linkTo: '/budget',
          meta: { previousStart: prevStart, previousEnd: prevEnd },
        });
      }
    }

    // 5. Annual budget line review overdue — only if flexible lines exist
    if (flexibleNum > 0) {
      const lastReviewed = dashboardRow?.budget_lines_last_reviewed_at
        ? new Date(String(dashboardRow.budget_lines_last_reviewed_at))
        : null;
      const isOverdue =
        lastReviewed === null || Date.now() - lastReviewed.getTime() > ANNUAL_REVIEW_THRESHOLD_MS;

      if (isOverdue) {
        hints.push({
          id: 'annual-budget-review',
          type: 'action',
          message:
            lastReviewed === null
              ? 'Review your budget lines to confirm amounts and frequencies are accurate'
              : "Your budget lines haven't been reviewed in over a year — take a moment to confirm they're still accurate",
          linkTo: '/budget',
        });
      }
    }

    // 6. Unlinked SimpleFIN accounts
    if (unlinkedSfCount > 0) {
      hints.push({
        id: 'unlinked-simplefin-accounts',
        type: 'action',
        message: `${unlinkedSfCount} SimpleFIN account${unlinkedSfCount === 1 ? '' : 's'} need${unlinkedSfCount === 1 ? 's' : ''} to be linked before transactions can import`,
        linkTo: '/settings/integrations',
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
