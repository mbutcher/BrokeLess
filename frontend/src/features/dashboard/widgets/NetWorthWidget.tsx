import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useNetWorthHistory } from '@features/core/hooks/useReports';
import { useFormatters } from '@lib/i18n/useFormatters';

interface Props {
  excludedAccountIds: string[];
}

export function NetWorthWidget({ excludedAccountIds }: Props) {
  const { t } = useTranslation();
  const { currency: fmt } = useFormatters();
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: historyData } = useNetWorthHistory(6);

  const activeAccounts = accounts.filter(
    (a) => a.isActive && !excludedAccountIds.includes(a.id),
  );

  const netWorth = activeAccounts.reduce(
    (sum, a) => sum + (a.isAsset ? a.currentBalance : -a.currentBalance),
    0,
  );

  const snapshots = historyData?.snapshots ?? [];
  const prevSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const trend = prevSnapshot ? netWorth - prevSnapshot.netWorth : null;

  if (isLoading) {
    return <div className="h-8 w-36 bg-muted animate-pulse rounded" />;
  }

  return (
    <div className="flex items-baseline gap-3">
      <span className="text-sm font-medium text-muted-foreground">{t('dashboard.netWorth')}</span>
      <p className={`text-3xl font-bold tabular-nums ${netWorth >= 0 ? 'text-foreground' : 'text-destructive'}`}>
        {fmt(netWorth)}
      </p>
      {trend !== null && (
        <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
          {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>
            {trend >= 0 ? '+' : ''}
            {fmt(trend)}
          </span>
        </div>
      )}
    </div>
  );
}
