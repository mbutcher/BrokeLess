import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
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

  // Sparkline data: last 6 snapshots
  const sparkData = snapshots.slice(-6).map((s) => ({ value: s.netWorth }));

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
      <div className="h-full flex flex-col justify-center gap-2">
        {sparkData.length >= 2 && (
          <div className="h-12 w-full flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={1.5}
                  fill="url(#nwGrad)"
                  dot={false}
                />
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Net Worth']}
                  contentStyle={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className={`text-3xl font-bold tabular-nums ${netWorth >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          {fmt(netWorth)}
        </p>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>
              {trend >= 0 ? '+' : ''}
              {fmt(trend)} {t('dashboard.vsPrevPeriod')}
            </span>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
