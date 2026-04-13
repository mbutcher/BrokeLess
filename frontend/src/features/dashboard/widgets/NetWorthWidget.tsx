import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useNetWorthHistory } from '@features/core/hooks/useReports';
import { useFormatters } from '@lib/i18n/useFormatters';
import { WidgetShell } from '../components/WidgetShell';

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
    return (
      <WidgetShell id="net-worth" title={t('dashboard.netWorth')}>
        <div className="h-full flex items-center">
          <div className="h-8 w-36 bg-muted animate-pulse rounded" />
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell id="net-worth" title={t('dashboard.netWorth')}>
      <div className="flex items-center gap-3">
        <p className={`text-2xl font-bold tabular-nums ${netWorth >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          {fmt(netWorth)}
        </p>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>
              {trend >= 0 ? '+' : ''}
              {fmt(trend)}
            </span>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
