import { useCallback, useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { DashboardConfig, WidgetId, GridLayoutItem } from '../types/dashboard';
import { WIDGET_META } from '../widgetRegistry';
import { useWidgetCollapseState, WidgetCollapseProvider } from '../hooks/useWidgetCollapse';
import { NetWorthWidget } from '../widgets/NetWorthWidget';
import { AccountBalancesWidget } from '../widgets/AccountBalancesWidget';
import { BudgetSnapshotWidget } from '../widgets/BudgetSnapshotWidget';
import { UpcomingExpensesWidget } from '../widgets/UpcomingExpensesWidget';
import { MonthlyChartWidget } from '../widgets/MonthlyChartWidget';
import { SavingsGoalsWidget } from '../widgets/SavingsGoalsWidget';
import { RecentTransactionsWidget } from '../widgets/RecentTransactionsWidget';
import { HintsWidget } from '../widgets/HintsWidget';
import { SpendingByCategoryWidget } from '../widgets/SpendingByCategoryWidget';
import { DebtPayoffWidget } from '../widgets/DebtPayoffWidget';
import { TagSummaryWidget } from '../widgets/TagSummaryWidget';

const ROW_HEIGHT = 80; // px per row unit
const BREAKPOINTS = { xl: 1440, lg: 1024, sm: 640, xs: 0 };
const COLS = { xl: 8, lg: 6, sm: 4, xs: 2 };
const MARGIN: [number, number] = [16, 16];
const COLLAPSED_H = 1; // rows consumed by a collapsed widget (title bar only)

interface Props {
  config: DashboardConfig;
  isEditMode: boolean;
  onLayoutChange?: (layout: Layout, allLayouts: ResponsiveLayouts) => void;
}

function WidgetWrapper({
  children,
  isEditMode,
  collapsed,
}: {
  children: React.ReactNode;
  isEditMode: boolean;
  collapsed: boolean;
}) {
  // Collapsed widgets shrink to their header height so the card doesn't paint
  // empty space below it. Edit mode always uses the full cell so drag/resize work.
  const shrink = collapsed && !isEditMode;
  return (
    <div
      className={`bg-card rounded-xl border border-border overflow-hidden relative ${
        shrink ? 'h-fit' : 'h-full'
      } ${isEditMode ? 'ring-2 ring-primary/40 ring-offset-1' : ''}`}
    >
      {isEditMode && (
        <div className="drag-handle absolute top-0 left-0 right-0 h-7 bg-primary/5 border-b border-primary/20 cursor-grab flex items-center justify-center z-10">
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-1 h-1 bg-primary/40 rounded-full" />
            ))}
          </div>
        </div>
      )}
      <div className={`${shrink ? '' : 'h-full'} ${isEditMode ? 'pt-7' : ''}`}>{children}</div>
    </div>
  );
}

function renderWidget(id: WidgetId, excludedAccountIds: string[]) {
  switch (id) {
    case 'net-worth':
      return <NetWorthWidget excludedAccountIds={excludedAccountIds} />;
    case 'account-balances':
      return <AccountBalancesWidget excludedAccountIds={excludedAccountIds} />;
    case 'budget-snapshot':
      return <BudgetSnapshotWidget />;
    case 'upcoming-expenses':
      return <UpcomingExpensesWidget />;
    case 'monthly-chart':
      return <MonthlyChartWidget />;
    case 'savings-goals':
      return <SavingsGoalsWidget />;
    case 'recent-transactions':
      return <RecentTransactionsWidget />;
    case 'hints':
      return <HintsWidget />;
    case 'spending-by-category':
      return <SpendingByCategoryWidget />;
    case 'debt-payoff':
      return <DebtPayoffWidget />;
    case 'tag-summary':
      return <TagSummaryWidget />;
    default:
      return null;
  }
}

function toLayoutItem(item: GridLayoutItem): LayoutItem {
  return {
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    ...(item.minW !== undefined && { minW: item.minW }),
    ...(item.minH !== undefined && { minH: item.minH }),
    ...(item.maxW !== undefined && { maxW: item.maxW }),
    ...(item.maxH !== undefined && { maxH: item.maxH }),
    ...(item.static !== undefined && { static: item.static }),
    ...(item.isDraggable !== undefined && { isDraggable: item.isDraggable }),
    ...(item.isResizable !== undefined && { isResizable: item.isResizable }),
  };
}

export function DashboardGrid({ config, isEditMode, onLayoutChange }: Props) {
  const { widgetVisibility, excludedAccountIds, layouts } = config;
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });
  const collapseState = useWidgetCollapseState();
  const { collapsed } = collapseState;

  const anyCollapsed = useMemo(() => Object.values(collapsed).some(Boolean), [collapsed]);

  const rglLayouts: ResponsiveLayouts = useMemo(() => {
    // Collapse is a view-only state — edit mode always works on real heights.
    const applyCollapse = (item: GridLayoutItem): LayoutItem => {
      const base = toLayoutItem(item);
      if (isEditMode || collapsed[item.i] !== true) return base;
      return { ...base, h: COLLAPSED_H, minH: COLLAPSED_H, maxH: COLLAPSED_H, isResizable: false };
    };
    return {
      xs: layouts.xs.filter((item) => widgetVisibility[item.i]).map(applyCollapse),
      sm: layouts.sm.filter((item) => widgetVisibility[item.i]).map(applyCollapse),
      lg: layouts.lg.filter((item) => widgetVisibility[item.i]).map(applyCollapse),
      xl: layouts.xl.filter((item) => widgetVisibility[item.i]).map(applyCollapse),
    };
  }, [layouts, widgetVisibility, collapsed, isEditMode]);

  // Strip our collapse override before the layout reaches the persistence layer,
  // so the saved config always holds the true expanded height for each widget.
  const handleLayoutChange = useCallback(
    (current: Layout, all: ResponsiveLayouts) => {
      if (!onLayoutChange) return;
      if (!anyCollapsed) {
        onLayoutChange(current, all);
        return;
      }
      const originalH = new Map<string, number>();
      for (const bp of ['xl', 'lg', 'sm', 'xs'] as const) {
        for (const l of layouts[bp]) {
          if (!originalH.has(l.i)) originalH.set(l.i, l.h);
        }
      }
      const restoreItem = (item: LayoutItem): LayoutItem => {
        if (collapsed[item.i as WidgetId] !== true) return item;
        const h = originalH.get(item.i);
        return h !== undefined ? { ...item, h } : item;
      };
      const restored: ResponsiveLayouts = {
        xs: (all['xs'] ?? []).map(restoreItem),
        sm: (all['sm'] ?? []).map(restoreItem),
        lg: (all['lg'] ?? []).map(restoreItem),
        xl: (all['xl'] ?? []).map(restoreItem),
      };
      onLayoutChange(current.map(restoreItem), restored);
    },
    [onLayoutChange, collapsed, layouts, anyCollapsed],
  );

  // Filter to known widget IDs so stale config entries (e.g. removed 'warnings') don't
  // render empty shells in the grid.
  const knownIds = new Set(WIDGET_META.map((m) => m.id));
  const visibleIds = (Object.entries(widgetVisibility) as [WidgetId, boolean][])
    .filter(([id, v]) => v && knownIds.has(id))
    .map(([id]) => id);

  // Cast needed: useContainerWidth returns RefObject<HTMLDivElement | null> (React 19 style),
  // but JSX ref expects RefObject<HTMLDivElement> (React 18 style).
  const divRef = containerRef as React.RefObject<HTMLDivElement>;

  // On mobile (< sm breakpoint), bypass the grid engine entirely and render a
  // simple vertical stack. The grid's fixed row-height positioning creates large
  // gaps when widgets auto-size to their content.
  const isMobile = mounted && width < BREAKPOINTS.sm;

  return (
    <WidgetCollapseProvider value={collapseState}>
      <div ref={divRef}>
        {mounted && isMobile ? (
          <div className="flex flex-col gap-4">
            {visibleIds.map((id) => (
              <div key={id} style={{ maxHeight: '70vh' }}>
                <WidgetWrapper isEditMode={isEditMode} collapsed={collapsed[id] === true}>
                  {renderWidget(id, excludedAccountIds)}
                </WidgetWrapper>
              </div>
            ))}
          </div>
        ) : mounted ? (
          <ResponsiveGridLayout
            width={width}
            layouts={rglLayouts}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            margin={MARGIN}
            containerPadding={[0, 0]}
            dragConfig={{ enabled: isEditMode, handle: '.drag-handle', bounded: false, threshold: 3 }}
            resizeConfig={{ enabled: isEditMode, handles: ['se'] }}
            onLayoutChange={handleLayoutChange}
          >
            {visibleIds.map((id) => (
              <div key={id}>
                <WidgetWrapper isEditMode={isEditMode} collapsed={collapsed[id] === true}>
                  {renderWidget(id, excludedAccountIds)}
                </WidgetWrapper>
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : null}
      </div>
    </WidgetCollapseProvider>
  );
}
