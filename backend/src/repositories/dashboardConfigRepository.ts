import { getDatabase } from '@config/database';
import type {
  DashboardConfig,
  DashboardLayouts,
  GridLayoutItem,
  WidgetId,
} from '@typings/core.types';

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_WIDGET_VISIBILITY: Record<WidgetId, boolean> = {
  warnings: true,
  'net-worth': true,
  'account-balances': true,
  'budget-snapshot': true,
  'upcoming-expenses': true,
  'monthly-chart': true,
  'savings-goals': true,
  'recent-transactions': true,
  hints: true,
  'spending-by-category': false,
  'debt-payoff': false,
  'tag-summary': false,
};

/**
 * Default grid layouts per breakpoint.
 * warnings is always first and spans full width; it is not draggable/removable.
 */
function buildDefaultLayouts(): DashboardLayouts {
  // Each breakpoint column count: xs=2, sm=4, lg=6, xl=8
  const rows = {
    xs: (): GridLayoutItem[] => [
      { i: 'warnings', x: 0, y: 0, w: 2, h: 2 },
      { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
      { i: 'account-balances', x: 0, y: 5, w: 2, h: 4 },
      { i: 'monthly-chart', x: 0, y: 9, w: 2, h: 5 },
      { i: 'upcoming-expenses', x: 0, y: 14, w: 2, h: 5 },
      { i: 'budget-snapshot', x: 0, y: 19, w: 2, h: 5 },
      { i: 'recent-transactions', x: 0, y: 24, w: 2, h: 6 },
      { i: 'savings-goals', x: 0, y: 30, w: 2, h: 4 },
      { i: 'hints', x: 0, y: 34, w: 2, h: 3 },
    ],
    sm: (): GridLayoutItem[] => [
      { i: 'warnings', x: 0, y: 0, w: 4, h: 2 },
      { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
      { i: 'savings-goals', x: 2, y: 2, w: 2, h: 3 },
      { i: 'account-balances', x: 0, y: 5, w: 4, h: 4 },
      { i: 'monthly-chart', x: 0, y: 9, w: 4, h: 5 },
      { i: 'upcoming-expenses', x: 0, y: 14, w: 4, h: 5 },
      { i: 'budget-snapshot', x: 0, y: 19, w: 4, h: 5 },
      { i: 'recent-transactions', x: 0, y: 24, w: 4, h: 6 },
      { i: 'hints', x: 0, y: 30, w: 2, h: 3 },
    ],
    lg: (): GridLayoutItem[] => [
      { i: 'warnings', x: 0, y: 0, w: 6, h: 2 },
      { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
      { i: 'savings-goals', x: 2, y: 2, w: 2, h: 3 },
      { i: 'hints', x: 4, y: 2, w: 2, h: 3 },
      { i: 'account-balances', x: 0, y: 5, w: 4, h: 4 },
      { i: 'monthly-chart', x: 0, y: 9, w: 6, h: 5 },
      { i: 'upcoming-expenses', x: 0, y: 14, w: 4, h: 5 },
      { i: 'budget-snapshot', x: 4, y: 14, w: 2, h: 5 },
      { i: 'recent-transactions', x: 0, y: 19, w: 4, h: 6 },
    ],
    xl: (): GridLayoutItem[] => [
      { i: 'warnings', x: 0, y: 0, w: 8, h: 2 },
      { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
      { i: 'savings-goals', x: 2, y: 2, w: 2, h: 3 },
      { i: 'hints', x: 4, y: 2, w: 2, h: 3 },
      { i: 'account-balances', x: 0, y: 5, w: 4, h: 4 },
      { i: 'monthly-chart', x: 0, y: 9, w: 6, h: 5 },
      { i: 'upcoming-expenses', x: 6, y: 9, w: 2, h: 5 },
      { i: 'budget-snapshot', x: 4, y: 5, w: 4, h: 4 },
      { i: 'recent-transactions', x: 0, y: 14, w: 4, h: 6 },
    ],
  };
  return {
    xs: rows.xs(),
    sm: rows.sm(),
    lg: rows.lg(),
    xl: rows.xl(),
  };
}

export function buildDefaultConfig(userId: string): DashboardConfig {
  return {
    userId,
    widgetVisibility: { ...DEFAULT_WIDGET_VISIBILITY },
    excludedAccountIds: [],
    layouts: buildDefaultLayouts(),
    updatedAt: new Date(),
    acknowledgedRollovers: {},
    budgetLinesLastReviewedAt: null,
  };
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return raw !== null && raw !== undefined ? (raw as T) : fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapRow(row: Record<string, unknown>): DashboardConfig {
  return {
    userId: String(row['user_id']),
    widgetVisibility: safeJsonParse<Record<WidgetId, boolean>>(
      row['widget_visibility'],
      { ...DEFAULT_WIDGET_VISIBILITY }
    ),
    excludedAccountIds: safeJsonParse<string[]>(row['excluded_account_ids'], []),
    layouts: safeJsonParse<DashboardLayouts>(row['layouts'], buildDefaultLayouts()),
    updatedAt: new Date(String(row['updated_at'])),
    acknowledgedRollovers: row['acknowledged_rollovers']
      ? safeJsonParse<Record<string, string>>(row['acknowledged_rollovers'], {})
      : {},
    budgetLinesLastReviewedAt: row['budget_lines_last_reviewed_at']
      ? new Date(String(row['budget_lines_last_reviewed_at']))
      : null,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

class DashboardConfigRepository {
  async findByUserId(userId: string): Promise<DashboardConfig | null> {
    const db = getDatabase();
    const row = (await db('user_dashboard_config').where({ user_id: userId }).first()) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return mapRow(row);
  }

  async upsert(config: DashboardConfig): Promise<DashboardConfig> {
    const db = getDatabase();
    const now = new Date();
    const acknowledgedRollovers = JSON.stringify(config.acknowledgedRollovers ?? {});
    await db('user_dashboard_config')
      .insert({
        user_id: config.userId,
        widget_visibility: JSON.stringify(config.widgetVisibility),
        excluded_account_ids: JSON.stringify(config.excludedAccountIds),
        layouts: JSON.stringify(config.layouts),
        acknowledged_rollovers: acknowledgedRollovers,
        budget_lines_last_reviewed_at: config.budgetLinesLastReviewedAt ?? null,
        updated_at: now,
      })
      .onConflict('user_id')
      .merge({
        widget_visibility: JSON.stringify(config.widgetVisibility),
        excluded_account_ids: JSON.stringify(config.excludedAccountIds),
        layouts: JSON.stringify(config.layouts),
        acknowledged_rollovers: acknowledgedRollovers,
        budget_lines_last_reviewed_at: config.budgetLinesLastReviewedAt ?? null,
        updated_at: now,
      });
    return { ...config, updatedAt: now };
  }

  /**
   * Patch only the rollover-config fields on an existing row without touching
   * widget_visibility, layouts, or excluded_account_ids.
   */
  async patchRolloverConfig(
    userId: string,
    patch: {
      acknowledgedRollovers?: Record<string, string>;
      budgetLinesLastReviewedAt?: Date | null;
    }
  ): Promise<void> {
    const db = getDatabase();
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (patch.acknowledgedRollovers !== undefined) {
      updates['acknowledged_rollovers'] = JSON.stringify(patch.acknowledgedRollovers);
    }
    if (patch.budgetLinesLastReviewedAt !== undefined) {
      updates['budget_lines_last_reviewed_at'] = patch.budgetLinesLastReviewedAt;
    }
    await db('user_dashboard_config').where({ user_id: userId }).update(updates);
  }
}

export const dashboardConfigRepository = new DashboardConfigRepository();
export { buildDefaultLayouts };
