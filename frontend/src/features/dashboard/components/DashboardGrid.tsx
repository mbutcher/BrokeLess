import { useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { DashboardConfig, WidgetId, GridLayoutItem } from '../types/dashboard';
import { WarningsWidget } from '../widgets/WarningsWidget';
import { NetWorthWidget } from '../widgets/NetWorthWidget';
import { AccountBalancesWidget } from '../widgets/AccountBalancesWidget';
import { BudgetSnapshotWidget } from '../widgets/BudgetSnapshotWidget';
import { UpcomingExpensesWidget } from '../widgets/UpcomingExpensesWidget';
import { MonthlyChartWidget } from '../widgets/MonthlyChartWidget';
import { SavingsGoalsWidget } from '../widgets/SavingsGoalsWidget';
import { RecentTransactionsWidget } from '../widgets/RecentTransactionsWidget';
import { HintsWidget } from '../widgets/HintsWidget';

const ROW_HEIGHT = 80; // px per row unit
const BREAKPOINTS = { xl: 1440, lg: 1024, sm: 640, xs: 0 };
const COLS = { xl: 8, lg: 6, sm: 4, xs: 2 };
const MARGIN: [number, number] = [16, 16];

interface Props {
  config: DashboardConfig;
  isEditMode: boolean;
  onLayoutChange?: (layout: Layout, allLayouts: ResponsiveLayouts) => void;
}

function WidgetWrapper({
  children,
  isEditMode,
}: {
  children: React.ReactNode;
  isEditMode: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden h-full relative ${
        isEditMode ? 'ring-2 ring-blue-300 ring-offset-1' : ''
      }`}
    >
      {isEditMode && (
        <div className="drag-handle absolute top-0 left-0 right-0 h-7 bg-blue-50 border-b border-blue-100 cursor-grab flex items-center justify-center z-10">
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-1 h-1 bg-blue-300 rounded-full" />
            ))}
          </div>
        </div>
      )}
      <div className={`h-full ${isEditMode ? 'pt-7' : ''}`}>{children}</div>
    </div>
  );
}

function renderWidget(id: WidgetId, excludedAccountIds: string[]) {
  switch (id) {
    case 'warnings':
      return <WarningsWidget excludedAccountIds={excludedAccountIds} />;
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

  const rglLayouts: ResponsiveLayouts = useMemo(
    () => ({
      xs: layouts.xs.filter((item) => widgetVisibility[item.i]).map(toLayoutItem),
      sm: layouts.sm.filter((item) => widgetVisibility[item.i]).map(toLayoutItem),
      lg: layouts.lg.filter((item) => widgetVisibility[item.i]).map(toLayoutItem),
      xl: layouts.xl.filter((item) => widgetVisibility[item.i]).map(toLayoutItem),
    }),
    [layouts, widgetVisibility],
  );

  const visibleIds = (Object.entries(widgetVisibility) as [WidgetId, boolean][])
    .filter(([, v]) => v)
    .map(([id]) => id);

  // Cast needed: useContainerWidth returns RefObject<HTMLDivElement | null> (React 19 style),
  // but JSX ref expects RefObject<HTMLDivElement> (React 18 style).
  const divRef = containerRef as React.RefObject<HTMLDivElement>;

  return (
    <div ref={divRef}>
      {mounted && (
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
          onLayoutChange={onLayoutChange}
        >
          {visibleIds.map((id) => (
            <div key={id}>
              <WidgetWrapper isEditMode={isEditMode}>
                {renderWidget(id, excludedAccountIds)}
              </WidgetWrapper>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
