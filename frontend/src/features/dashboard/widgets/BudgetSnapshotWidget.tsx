import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBudgetView } from '@features/core/hooks/useBudgetView';
import { isOfflineError } from '@lib/db/offlineHelpers';
import { monthWindow, toISODate } from '@lib/budget/budgetViewUtils';
import { useFormatters } from '@lib/i18n/useFormatters';

export function BudgetSnapshotWidget() {
  const { t } = useTranslation();
  const { currency: fmt } = useFormatters();
  const today = new Date();
  const { start, end } = monthWindow(today.getFullYear(), today.getMonth() + 1);
  const { data: view, isLoading, isError, error } = useBudgetView(toISODate(start), toISODate(end));

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{t('dashboard.budgetThisMonth')}</h2>
        <Link to="/budget" className="text-sm text-blue-600 hover:underline">
          {t('dashboard.viewBudget')}
        </Link>
      </div>

      {isLoading ? (
        <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
      ) : isError ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          {isOfflineError(error) ? t('dashboard.budgetNotOffline') : t('dashboard.budgetError')}
        </p>
      ) : !view || view.lines.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          {t('dashboard.noBudgetLines')}{' '}
          <Link to="/budget" className="text-blue-600 hover:underline">
            {t('dashboard.setupBudget')}
          </Link>
        </p>
      ) : (
        <div className="space-y-3 flex-1 overflow-hidden">
          {(() => {
            const pct =
              view.totalProratedExpenses > 0
                ? Math.min(100, (view.totalActualExpenses / view.totalProratedExpenses) * 100)
                : 0;
            const overBudget = view.totalActualExpenses > view.totalProratedExpenses;
            const remaining = view.totalProratedExpenses - view.totalActualExpenses;
            const overBudgetLines = view.lines
              .filter((l) => l.budgetLine.classification === 'expense' && l.variance < 0)
              .sort((a, b) => a.variance - b.variance)
              .slice(0, 3);

            return (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-gray-600">{t('dashboard.budgetExpenses')}</span>
                    <span className={overBudget ? 'font-semibold text-red-600' : 'text-gray-600'}>
                      {fmt(view.totalActualExpenses)} / {fmt(view.totalProratedExpenses)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {remaining >= 0
                      ? `${fmt(remaining)} ${t('dashboard.budgetRemaining')}`
                      : `${fmt(Math.abs(remaining))} ${t('dashboard.budgetOverBudget')}`}
                  </p>
                </div>
                {overBudgetLines.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {t('dashboard.overBudgetHeader')}
                    </p>
                    {overBudgetLines.map((l) => (
                      <div key={l.budgetLine.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{l.budgetLine.name}</span>
                        <span className="text-red-600 font-medium ml-2 shrink-0">
                          {fmt(Math.abs(l.variance))} {t('dashboard.overSuffix')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
