import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@lib/i18n/useFormatters';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { usePayPeriod, useUpcomingExpenses } from '@features/core/hooks/useBudgetView';
import { toLocalISO } from '@lib/budget/budgetViewUtils';
import type { PayPeriod } from '@features/core/types';

function periodLabel(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

type PeriodKey = 'pay_period' | 'this_month' | 'next_30' | 'next_month' | 'next_3_months';

function getPeriodDates(key: PeriodKey, payPeriod: PayPeriod | null | undefined): { start: string; end: string } {
  const today = new Date();
  switch (key) {
    case 'pay_period':
      if (payPeriod) return { start: payPeriod.start, end: payPeriod.end };
      return {
        start: toLocalISO(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: toLocalISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
    case 'this_month':
      return {
        start: toLocalISO(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: toLocalISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
    case 'next_30':
      return {
        start: toLocalISO(today),
        end: toLocalISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)),
      };
    case 'next_month': {
      const nm = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return {
        start: toLocalISO(nm),
        end: toLocalISO(new Date(nm.getFullYear(), nm.getMonth() + 1, 0)),
      };
    }
    case 'next_3_months':
      return {
        start: toLocalISO(today),
        end: toLocalISO(new Date(today.getFullYear(), today.getMonth() + 4, 0)),
      };
  }
}

export function UpcomingExpenses() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('pay_period');
  const [showFlexible, setShowFlexible] = useState(false);
  const { t } = useTranslation();
  const fmt = useFormatters();
  const { data: payPeriod } = usePayPeriod();
  const { data: accounts = [] } = useAccounts();

  const { start, end } = useMemo(
    () => getPeriodDates(selectedPeriod, payPeriod),
    [selectedPeriod, payPeriod],
  );

  const { data: upcoming, isLoading } = useUpcomingExpenses(start, end, showFlexible);

  const overdraftAccountIds = useMemo(() => {
    if (!upcoming?.fixedItems.length) return new Set<string>();
    const sumsByAccount = new Map<string, number>();
    for (const item of upcoming.fixedItems) {
      if (item.accountId) {
        sumsByAccount.set(item.accountId, (sumsByAccount.get(item.accountId) ?? 0) + item.amount);
      }
    }
    const overdraft = new Set<string>();
    for (const [accountId, total] of sumsByAccount) {
      const account = accounts.find((a) => a.id === accountId);
      if (account && account.currentBalance < total) {
        overdraft.add(accountId);
      }
    }
    return overdraft;
  }, [upcoming, accounts]);

  const hasItems = (upcoming?.fixedItems.length ?? 0) > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as PeriodKey)}
            className="border border-border rounded-lg px-2.5 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="pay_period">
              {payPeriod ? t('dashboard.upcomingPeriodPayPeriod') : t('dashboard.upcomingPeriodPayPeriodUnset')}
            </option>
            <option value="this_month">{t('dashboard.upcomingPeriodThisMonth')}</option>
            <option value="next_30">{t('dashboard.upcomingPeriodNext30')}</option>
            <option value="next_month">{t('dashboard.upcomingPeriodNextMonth')}</option>
            <option value="next_3_months">{t('dashboard.upcomingPeriodNext3Months')}</option>
          </select>
          <span className="text-xs text-muted-foreground">{periodLabel(start, end)}</span>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showFlexible}
            onChange={(e) => setShowFlexible(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          {t('dashboard.upcomingShowFlexible')}
        </label>
      </div>

      {/* Overdraft warning */}
      {overdraftAccountIds.size > 0 && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">{t('dashboard.upcomingOverdraft')}</p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !hasItems && !showFlexible ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.upcomingEmpty')}</p>
      ) : (
        <div className="space-y-1.5">
          {/* Fixed items */}
          {upcoming?.fixedItems.map((item, i) => (
            <div
              key={`${item.budgetLineId}-${item.date}-${i}`}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">{item.name}</span>
                {item.accountName && (
                  <span
                    className={[
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
                      overdraftAccountIds.has(item.accountId!)
                        ? 'bg-warning/15 text-warning'
                        : 'bg-primary/10 text-primary',
                    ].join(' ')}
                  >
                    {overdraftAccountIds.has(item.accountId!) && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {item.accountName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className="text-destructive font-medium tabular-nums">
                  {fmt.currency(item.amount)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                  {new Date(item.date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}

          {/* Flexible items (est.) */}
          {showFlexible &&
            upcoming?.flexibleItems.map((item) => (
              <div
                key={item.budgetLineId}
                className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground truncate">{item.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-muted-foreground tabular-nums">{fmt.currency(item.proratedAmount)}</span>
                  <span className="text-xs text-muted-foreground">est.</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
