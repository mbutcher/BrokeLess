import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  monthWindow,
  weekWindow,
  toISODate,
} from '@lib/budget/budgetViewUtils';
import type { PayPeriod } from '../types';

export type ViewMode = 'monthly' | 'weekly' | 'pay-period' | 'custom';

interface PeriodSelectorProps {
  start: string;
  end: string;
  viewMode: ViewMode;
  payPeriod: PayPeriod | null | undefined;
  onPeriodChange: (start: string, end: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

function formatPeriodLabel(start: string, end: string, mode: ViewMode): string {
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');

  if (mode === 'monthly') {
    return s.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  if (mode === 'weekly') {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  }
  return `${start} – ${end}`;
}

function navigateMonth(currentStart: string, direction: 1 | -1) {
  const d = new Date(currentStart + 'T00:00:00Z');
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1 + direction;
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  return monthWindow(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1);
}

function navigateWeek(currentStart: string, direction: 1 | -1) {
  const d = new Date(currentStart + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + direction * 7);
  return weekWindow(d);
}

export function PeriodSelector({
  start,
  end,
  viewMode,
  payPeriod,
  onPeriodChange,
  onViewModeChange,
}: PeriodSelectorProps) {
  const navigate = (direction: 1 | -1) => {
    if (viewMode === 'monthly') {
      const { start: s, end: e } = navigateMonth(start, direction);
      onPeriodChange(toISODate(s), toISODate(e));
    } else if (viewMode === 'weekly') {
      const { start: s, end: e } = navigateWeek(start, direction);
      onPeriodChange(toISODate(s), toISODate(e));
    }
    // pay-period and custom don't support navigation arrows
  };

  const handleViewMode = (mode: ViewMode) => {
    onViewModeChange(mode);
    const today = new Date();
    if (mode === 'monthly') {
      const { start: s, end: e } = monthWindow(today.getFullYear(), today.getMonth() + 1);
      onPeriodChange(toISODate(s), toISODate(e));
    } else if (mode === 'weekly') {
      const { start: s, end: e } = weekWindow(today);
      onPeriodChange(toISODate(s), toISODate(e));
    } else if (mode === 'pay-period' && payPeriod) {
      onPeriodChange(payPeriod.start, payPeriod.end);
    }
  };

  const canNavigate = viewMode === 'monthly' || viewMode === 'weekly';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Period nav */}
      <div className="flex items-center gap-2">
        {canNavigate && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-semibold text-gray-800 min-w-[150px] text-center">
          {formatPeriodLabel(start, end, viewMode)}
        </span>
        {canNavigate && (
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* View mode selector */}
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
        {(['monthly', 'weekly', 'pay-period'] as ViewMode[]).map((mode) => {
          const labels: Record<ViewMode, string> = {
            monthly: 'Monthly',
            weekly: 'Weekly',
            'pay-period': 'Pay Period',
            custom: 'Custom',
          };
          const disabled = mode === 'pay-period' && !payPeriod;
          return (
            <button
              key={mode}
              onClick={() => !disabled && handleViewMode(mode)}
              disabled={disabled}
              className={[
                'px-2.5 py-1 rounded-md transition-colors',
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {labels[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

