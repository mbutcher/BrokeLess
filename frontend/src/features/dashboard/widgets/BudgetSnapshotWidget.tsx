import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBudgetView } from '@features/core/hooks/useBudgetView';
import { isOfflineError } from '@lib/db/offlineHelpers';
import { monthWindow, toISODate } from '@lib/budget/budgetViewUtils';
import { useFormatters } from '@lib/i18n/useFormatters';
import { WidgetShell } from '../components/WidgetShell';

export function BudgetSnapshotWidget() {
  const { t } = useTranslation();
  const { currency: fmt } = useFormatters();
  const today = new Date();
  const { start, end } = monthWindow(today.getFullYear(), today.getMonth() + 1);
  const { data: view, isLoading, isError, error } = useBudgetView(toISODate(start), toISODate(end));

  return (
    <WidgetShell
      id="budget-snapshot"
      title={t('dashboard.budgetThisMonth')}
      scrollable
      actions={
        <Link to="/budget" className="text-sm text-primary hover:underline">
          {t('dashboard.viewBudget')}
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isOfflineError(error) ? t('dashboard.budgetNotOffline') : t('dashboard.budgetError')}
        </p>
      ) : !view || view.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {t('dashboard.noBudgetLines')}{' '}
          <Link to="/budget" className="text-primary hover:underline">
            {t('dashboard.setupBudget')}
          </Link>
        </p>
      ) : (
        <div className="space-y-2">
          {view.lines
            .filter((l) => l.budgetLine.classification === 'expense' && l.proratedAmount > 0)
            .sort((a, b) => b.proratedAmount - a.proratedAmount)
            .slice(0, 8)
            .map((l) => {
              const budget = l.proratedAmount;
              const actual = l.actualAmount;
              const overBudget = actual > budget;
              const spentPct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
              const remainingPct = Math.max(0, 100 - spentPct);

              return (
                <div key={l.budgetLine.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`truncate max-w-[60%] ${overBudget ? 'text-destructive font-medium' : 'text-foreground'}`}>
                      {l.budgetLine.name}
                    </span>
                    <span className={`tabular-nums flex-shrink-0 ml-2 ${overBudget ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {fmt(actual)} / {fmt(budget)}
                    </span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                    <div
                      className={`h-full transition-all ${overBudget ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${spentPct}%` }}
                    />
                    <div
                      className="h-full bg-muted"
                      style={{ width: `${remainingPct}%` }}
                    />
                  </div>
                </div>
              );
            })}

          {/* Summary row */}
          {(() => {
            const overBudget = view.totalActualExpenses > view.totalProratedExpenses;
            const remaining = view.totalProratedExpenses - view.totalActualExpenses;
            return (
              <div className="pt-2 mt-2 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard.budgetExpenses')}</span>
                <span className={overBudget ? 'text-destructive font-semibold' : 'text-success font-medium'}>
                  {remaining >= 0
                    ? `${fmt(remaining)} ${t('dashboard.budgetRemaining')}`
                    : `${fmt(Math.abs(remaining))} ${t('dashboard.budgetOverBudget')}`}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </WidgetShell>
  );
}
