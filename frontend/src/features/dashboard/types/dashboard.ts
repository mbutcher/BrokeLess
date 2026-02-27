export type WidgetId =
  | 'warnings'
  | 'net-worth'
  | 'account-balances'
  | 'budget-snapshot'
  | 'upcoming-expenses'
  | 'monthly-chart'
  | 'savings-goals'
  | 'recent-transactions'
  | 'hints';

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
}

export interface DashboardHint {
  id: string;
  type: string;
  message: string;
  linkTo?: string;
}

/** Metadata used to populate the Widget Tray. */
export interface WidgetMeta {
  id: WidgetId;
  labelKey: string;
  /** True for widgets that cannot be disabled or repositioned */
  alwaysOn?: boolean;
  /** Default h (row-height units) used when auto-placed */
  defaultH: number;
}
