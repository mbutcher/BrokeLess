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
  };
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): DashboardConfig {
  return {
    userId: String(row['user_id']),
    widgetVisibility: JSON.parse(String(row['widget_visibility'])) as Record<WidgetId, boolean>,
    excludedAccountIds: JSON.parse(String(row['excluded_account_ids'])) as string[],
    layouts: JSON.parse(String(row['layouts'])) as DashboardLayouts,
    updatedAt: new Date(String(row['updated_at'])),
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
    await db('user_dashboard_config')
      .insert({
        user_id: config.userId,
        widget_visibility: JSON.stringify(config.widgetVisibility),
        excluded_account_ids: JSON.stringify(config.excludedAccountIds),
        layouts: JSON.stringify(config.layouts),
        updated_at: now,
      })
      .onConflict('user_id')
      .merge({
        widget_visibility: JSON.stringify(config.widgetVisibility),
        excluded_account_ids: JSON.stringify(config.excludedAccountIds),
        layouts: JSON.stringify(config.layouts),
        updated_at: now,
      });
    return { ...config, updatedAt: now };
  }
}

export const dashboardConfigRepository = new DashboardConfigRepository();
export { buildDefaultLayouts };
