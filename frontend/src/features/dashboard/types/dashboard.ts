export type WidgetId =
  | 'net-worth'
  | 'account-balances'
  | 'budget-snapshot'
  | 'upcoming-expenses'
  | 'monthly-chart'
  | 'savings-goals'
  | 'recent-transactions'
  | 'hints'
  | 'spending-by-category'
  | 'debt-payoff'
  | 'tag-summary';

export type WidgetCategory = 'overview' | 'budgeting' | 'savings' | 'spending' | 'debt';

export interface GridLayoutItem {
  i: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

export interface DashboardLayouts {
  xs: GridLayoutItem[];
  sm: GridLayoutItem[];
  lg: GridLayoutItem[];
  xl: GridLayoutItem[];
}

export interface DashboardConfig {
  userId: string;
  widgetVisibility: Record<WidgetId, boolean>;
  excludedAccountIds: string[];
  layouts: DashboardLayouts;
  updatedAt: string;
  /** Keys: "YYYY-MM-DD_YYYY-MM-DD". Values: ISO ack timestamp. */
  acknowledgedRollovers?: Record<string, string>;
  /** ISO timestamp of last annual budget review. Null = never reviewed. */
  budgetLinesLastReviewedAt?: string | null;
}

export interface DashboardHint {
  id: string;
  type: string;
  message: string;
  linkTo?: string;
  /** Optional extra structured data (e.g. period dates for rollover hint). */
  meta?: Record<string, string>;
}

/** Metadata used to populate the Widget Tray. */
export interface WidgetMeta {
  id: WidgetId;
  labelKey: string;
  category: WidgetCategory;
  /** Minimum grid columns */
  minW: number;
  /** Minimum grid rows */
  minH: number;
  /** True for widgets that cannot be disabled or repositioned */
  alwaysOn?: boolean;
  /** Default h (row-height units) used when auto-placed */
  defaultH: number;
  /** If set, widget is hidden in the tray unless this feature flag is enabled */
  featureFlag?: string;
  /** True if the widget has its own settings modal */
  hasSettings?: boolean;
}
