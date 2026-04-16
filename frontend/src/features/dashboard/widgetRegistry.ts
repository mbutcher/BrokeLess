import type { WidgetId, DashboardConfig, DashboardLayouts, GridLayoutItem, WidgetMeta } from './types/dashboard';

// ─── Widget metadata ──────────────────────────────────────────────────────────

export const WIDGET_META: WidgetMeta[] = [
  // Overview
  { id: 'net-worth', labelKey: 'dashboard.widgets.netWorth', category: 'overview', minW: 2, minH: 1, defaultH: 1 },
  { id: 'account-balances', labelKey: 'dashboard.widgets.accountBalances', category: 'overview', minW: 2, minH: 2, defaultH: 4, hasSettings: true },
  { id: 'hints', labelKey: 'dashboard.widgets.hints', category: 'overview', minW: 2, minH: 2, defaultH: 3 },
  // Budgeting
  { id: 'budget-snapshot', labelKey: 'dashboard.widgets.budgetSnapshot', category: 'budgeting', minW: 3, minH: 3, defaultH: 5 },
  { id: 'monthly-chart', labelKey: 'dashboard.widgets.monthlyChart', category: 'budgeting', minW: 2, minH: 3, defaultH: 5 },
  { id: 'upcoming-expenses', labelKey: 'dashboard.widgets.upcomingExpenses', category: 'budgeting', minW: 2, minH: 3, defaultH: 5 },
  // Savings
  { id: 'savings-goals', labelKey: 'dashboard.widgets.savingsGoals', category: 'savings', minW: 2, minH: 3, defaultH: 4 },
  // Spending
  { id: 'spending-by-category', labelKey: 'dashboard.widgets.spendingByCategory', category: 'spending', minW: 3, minH: 3, defaultH: 5 },
  { id: 'recent-transactions', labelKey: 'dashboard.widgets.recentTransactions', category: 'spending', minW: 3, minH: 3, defaultH: 6 },
  { id: 'tag-summary', labelKey: 'dashboard.widgets.tagSummary', category: 'spending', minW: 3, minH: 2, defaultH: 4 },
  // Debt
  { id: 'debt-payoff', labelKey: 'dashboard.widgets.debtPayoff', category: 'debt', minW: 3, minH: 3, defaultH: 4 },
];

// ─── Default visibility ───────────────────────────────────────────────────────

export const DEFAULT_WIDGET_VISIBILITY: Record<WidgetId, boolean> = {
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

// ─── Default layouts ──────────────────────────────────────────────────────────

function buildDefaultLayouts(): DashboardLayouts {
  // Warnings are shown in the header bar (WarningsIndicator) — not part of the grid
  const xs = (): GridLayoutItem[] => [
    { i: 'savings-goals', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'account-balances', x: 0, y: 4, w: 2, h: 4, minW: 2, minH: 2 },
    { i: 'hints', x: 0, y: 8, w: 2, h: 3, minW: 2, minH: 2 },
    { i: 'upcoming-expenses', x: 0, y: 11, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'budget-snapshot', x: 0, y: 16, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'monthly-chart', x: 0, y: 21, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'recent-transactions', x: 0, y: 26, w: 2, h: 6, minW: 2, minH: 3 },
    { i: 'spending-by-category', x: 0, y: 32, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'debt-payoff', x: 0, y: 37, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'tag-summary', x: 0, y: 41, w: 2, h: 4, minW: 2, minH: 2 },
  ];
  const sm = (): GridLayoutItem[] => [
    { i: 'savings-goals', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'account-balances', x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 2 },
    { i: 'hints', x: 0, y: 4, w: 4, h: 3, minW: 2, minH: 2 },
    { i: 'upcoming-expenses', x: 0, y: 7, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'budget-snapshot', x: 2, y: 7, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'monthly-chart', x: 0, y: 12, w: 4, h: 5, minW: 2, minH: 3 },
    { i: 'recent-transactions', x: 0, y: 17, w: 4, h: 6, minW: 3, minH: 3 },
    { i: 'spending-by-category', x: 0, y: 23, w: 4, h: 5, minW: 3, minH: 3 },
    { i: 'debt-payoff', x: 0, y: 28, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'tag-summary', x: 0, y: 32, w: 4, h: 4, minW: 3, minH: 2 },
  ];
  const lg = (): GridLayoutItem[] => [
    { i: 'savings-goals', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'account-balances', x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 2 },
    { i: 'hints', x: 4, y: 0, w: 2, h: 4, minW: 2, minH: 2 },
    { i: 'upcoming-expenses', x: 0, y: 4, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'budget-snapshot', x: 2, y: 4, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'monthly-chart', x: 4, y: 4, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'recent-transactions', x: 0, y: 9, w: 4, h: 6, minW: 3, minH: 3 },
    { i: 'spending-by-category', x: 0, y: 15, w: 3, h: 5, minW: 3, minH: 3 },
    { i: 'debt-payoff', x: 3, y: 15, w: 3, h: 5, minW: 3, minH: 3 },
    { i: 'tag-summary', x: 0, y: 20, w: 4, h: 4, minW: 3, minH: 2 },
  ];
  const xl = (): GridLayoutItem[] => [
    { i: 'savings-goals', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'account-balances', x: 2, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
    { i: 'hints', x: 6, y: 0, w: 2, h: 4, minW: 2, minH: 2 },
    { i: 'upcoming-expenses', x: 0, y: 4, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'budget-snapshot', x: 2, y: 4, w: 2, h: 5, minW: 2, minH: 3 },
    { i: 'monthly-chart', x: 4, y: 4, w: 4, h: 5, minW: 2, minH: 3 },
    { i: 'recent-transactions', x: 0, y: 9, w: 8, h: 6, minW: 3, minH: 3 },
    { i: 'spending-by-category', x: 0, y: 15, w: 4, h: 5, minW: 3, minH: 3 },
    { i: 'debt-payoff', x: 4, y: 15, w: 4, h: 5, minW: 3, minH: 3 },
    { i: 'tag-summary', x: 0, y: 20, w: 4, h: 4, minW: 3, minH: 2 },
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
