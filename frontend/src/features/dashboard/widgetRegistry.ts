import type { WidgetId, DashboardConfig, DashboardLayouts, GridLayoutItem, WidgetMeta } from './types/dashboard';

// ─── Widget metadata ──────────────────────────────────────────────────────────

export const WIDGET_META: WidgetMeta[] = [
  { id: 'warnings', labelKey: 'dashboard.widgets.warnings', alwaysOn: true, defaultH: 2 },
  { id: 'net-worth', labelKey: 'dashboard.widgets.netWorth', defaultH: 3 },
  { id: 'account-balances', labelKey: 'dashboard.widgets.accountBalances', defaultH: 4 },
  { id: 'budget-snapshot', labelKey: 'dashboard.widgets.budgetSnapshot', defaultH: 5 },
  { id: 'upcoming-expenses', labelKey: 'dashboard.widgets.upcomingExpenses', defaultH: 5 },
  { id: 'monthly-chart', labelKey: 'dashboard.widgets.monthlyChart', defaultH: 5 },
  { id: 'savings-goals', labelKey: 'dashboard.widgets.savingsGoals', defaultH: 4 },
  { id: 'recent-transactions', labelKey: 'dashboard.widgets.recentTransactions', defaultH: 6 },
  { id: 'hints', labelKey: 'dashboard.widgets.hints', defaultH: 3 },
];

// ─── Default visibility ───────────────────────────────────────────────────────

export const DEFAULT_WIDGET_VISIBILITY: Record<WidgetId, boolean> = {
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

// ─── Default layouts ──────────────────────────────────────────────────────────

function buildDefaultLayouts(): DashboardLayouts {
  const xs = (): GridLayoutItem[] => [
    { i: 'warnings', x: 0, y: 0, w: 2, h: 2 },
    { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
    { i: 'account-balances', x: 0, y: 5, w: 2, h: 4 },
    { i: 'monthly-chart', x: 0, y: 9, w: 2, h: 5 },
    { i: 'upcoming-expenses', x: 0, y: 14, w: 2, h: 5 },
    { i: 'budget-snapshot', x: 0, y: 19, w: 2, h: 5 },
    { i: 'recent-transactions', x: 0, y: 24, w: 2, h: 6 },
    { i: 'savings-goals', x: 0, y: 30, w: 2, h: 4 },
    { i: 'hints', x: 0, y: 34, w: 2, h: 3 },
  ];
  const sm = (): GridLayoutItem[] => [
    { i: 'warnings', x: 0, y: 0, w: 4, h: 2 },
    { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
    { i: 'savings-goals', x: 2, y: 2, w: 2, h: 3 },
    { i: 'account-balances', x: 0, y: 5, w: 4, h: 4 },
    { i: 'monthly-chart', x: 0, y: 9, w: 4, h: 5 },
    { i: 'upcoming-expenses', x: 0, y: 14, w: 4, h: 5 },
    { i: 'budget-snapshot', x: 0, y: 19, w: 4, h: 5 },
    { i: 'recent-transactions', x: 0, y: 24, w: 4, h: 6 },
    { i: 'hints', x: 0, y: 30, w: 2, h: 3 },
  ];
  const lg = (): GridLayoutItem[] => [
    { i: 'warnings', x: 0, y: 0, w: 6, h: 2 },
    { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
    { i: 'savings-goals', x: 2, y: 2, w: 2, h: 3 },
    { i: 'hints', x: 4, y: 2, w: 2, h: 3 },
    { i: 'account-balances', x: 0, y: 5, w: 4, h: 4 },
    { i: 'monthly-chart', x: 0, y: 9, w: 6, h: 5 },
    { i: 'upcoming-expenses', x: 0, y: 14, w: 4, h: 5 },
    { i: 'budget-snapshot', x: 4, y: 14, w: 2, h: 5 },
    { i: 'recent-transactions', x: 0, y: 19, w: 4, h: 6 },
  ];
  const xl = (): GridLayoutItem[] => [
    { i: 'warnings', x: 0, y: 0, w: 8, h: 2 },
    { i: 'net-worth', x: 0, y: 2, w: 2, h: 3 },
    { i: 'savings-goals', x: 2, y: 2, w: 2, h: 3 },
    { i: 'hints', x: 4, y: 2, w: 2, h: 3 },
    { i: 'account-balances', x: 0, y: 5, w: 4, h: 4 },
    { i: 'monthly-chart', x: 0, y: 9, w: 6, h: 5 },
    { i: 'upcoming-expenses', x: 6, y: 9, w: 2, h: 5 },
    { i: 'budget-snapshot', x: 4, y: 5, w: 4, h: 4 },
    { i: 'recent-transactions', x: 0, y: 14, w: 4, h: 6 },
  ];
  return { xs: xs(), sm: sm(), lg: lg(), xl: xl() };
}

export const DEFAULT_LAYOUTS = buildDefaultLayouts();

export function buildDefaultConfig(userId: string): DashboardConfig {
  return {
    userId,
    widgetVisibility: { ...DEFAULT_WIDGET_VISIBILITY },
    excludedAccountIds: [],
    layouts: buildDefaultLayouts(),
    updatedAt: new Date().toISOString(),
  };
}
