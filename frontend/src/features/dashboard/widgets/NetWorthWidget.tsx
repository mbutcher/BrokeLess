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
  const { data: historyData } = useNetWorthHistory(2);

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
      <div className="h-full flex flex-col justify-center p-5">
        <div className="h-4 w-24 bg-gray-100 animate-pulse rounded mb-2" />
        <div className="h-8 w-36 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-center p-5">
      <p className="text-sm text-gray-500 mb-1">{t('dashboard.netWorth')}</p>
      <p className={`text-3xl font-bold tabular-nums ${netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
        {fmt(netWorth)}
      </p>
      {trend !== null && (
        <div className={`mt-2 flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{trend >= 0 ? '+' : ''}{fmt(trend)} {t('dashboard.vsPrevPeriod')}</span>
        </div>
      )}
    </div>
  );
}
