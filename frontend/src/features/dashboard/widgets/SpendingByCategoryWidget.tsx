import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSpendingByCategory } from '@features/core/hooks/useReports';
import { useFormatters } from '@lib/i18n/useFormatters';
import { monthWindow, toISODate } from '@lib/budget/budgetViewUtils';
import { WidgetShell } from '../components/WidgetShell';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

function formatDollar(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function SpendingByCategoryWidget() {
  const { t } = useTranslation();
  const { currency: fmt } = useFormatters();
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  const today = new Date();
  const { start, end } = monthWindow(today.getFullYear(), today.getMonth() + 1);
  const { data, isLoading } = useSpendingByCategory(toISODate(start), toISODate(end), 'expense');

  const categories = data?.categories ?? [];
  const top = categories.slice(0, 8);
  const chartData = top.map((c, i) => ({
    name: c.categoryName,
    value: c.totalAmount,
    color: c.color ?? CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <WidgetShell
      id="spending-by-category"
      title={t('dashboard.spendingByCategory')}
      actions={
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setChartType('pie')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'pie'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('dashboard.pieChart')}
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('dashboard.barChart')}
          </button>
        </div>
      }
    >
      <div className="h-full min-h-0">
        {isLoading ? (
          <div className="h-full bg-muted animate-pulse rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {t('dashboard.noSpending')}
          </div>
        ) : chartType === 'pie' ? (
          <div className="flex h-full gap-3">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="75%"
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [fmt(value)]}
                  contentStyle={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden space-y-1.5 py-1">
              {chartData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: entry.color }}
                  />
                  <span className="text-foreground truncate flex-1">{entry.name}</span>
                  <span className="text-muted-foreground tabular-nums">{fmt(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tickFormatter={formatDollar}
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 11, fill: 'var(--color-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 12) + '…' : v)}
              />
              <Tooltip
                formatter={(value: number) => [fmt(value)]}
                contentStyle={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetShell>
  );
}
