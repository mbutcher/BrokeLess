import { useTranslation } from 'react-i18next';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useDebtSchedule, useAmortizationSchedule } from '@features/core/hooks/useDebt';
import { useFormatters } from '@lib/i18n/useFormatters';
import { WidgetShell } from '../components/WidgetShell';
import type { Account } from '@features/core/types';

function DebtCard({ account }: { account: Account }) {
  const { t } = useTranslation();
  const { currency: fmt } = useFormatters();
  const { data: schedule } = useDebtSchedule(account.id);
  const { data: amort } = useAmortizationSchedule(account.id, !!schedule);

  const balance = account.currentBalance;
  const payoffDate = amort?.payoffDate;
  const totalInterest = amort?.totalInterest;

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
          {account.type.replace('_', ' ')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground mb-0.5">{t('dashboard.principalBalance')}</p>
          <p className="font-semibold text-foreground tabular-nums">{fmt(balance)}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">{t('dashboard.totalInterest')}</p>
          <p className="font-semibold text-foreground tabular-nums">
            {totalInterest !== undefined ? fmt(totalInterest) : t('dashboard.debtPayoffUnknown')}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">{t('dashboard.projectedPayoff')}</p>
          <p className="font-semibold text-foreground tabular-nums">
            {payoffDate
              ? new Date(payoffDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
              : t('dashboard.debtPayoffUnknown')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DebtPayoffWidget() {
  const { t } = useTranslation();
  const { data: accounts = [], isLoading } = useAccounts();

  const debtAccounts = accounts.filter(
    (a) => a.isActive && !a.isAsset,
  );

  return (
    <WidgetShell id="debt-payoff" title={t('dashboard.debtPayoff')} scrollable>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : debtAccounts.length === 0 ? (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          {t('dashboard.noDebtAccounts')}
        </div>
      ) : (
        <div className="space-y-3">
          {debtAccounts.map((account) => (
            <DebtCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
