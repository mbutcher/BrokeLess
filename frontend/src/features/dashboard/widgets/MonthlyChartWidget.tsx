import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMonthlySummary } from '@features/core/hooks/useReports';
import { WidgetShell } from '../components/WidgetShell';

type Period = 3 | 6 | 12;

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', {
    month: 'short',
    year: '2-digit',
  });
}

function formatDollar(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function MonthlyChartWidget() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>(6);
  const { data: monthlySummary = [], isLoading } = useMonthlySummary(period);

  const chartData = monthlySummary.map((e) => ({
    month: formatMonth(e.month),
    income: e.income,
    expenses: e.expenses,
  }));

  const PERIODS: Period[] = [3, 6, 12];
  const periodLabel: Record<Period, string> = {
    3: t('dashboard.period3M'),
    6: t('dashboard.period6M'),
    12: t('dashboard.period12M'),
  };

  return (
    <WidgetShell
      id="monthly-chart"
      title={t('dashboard.incomeVsExpenses')}
      actions={
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-full min-h-0">
        {isLoading ? (
          <div className="h-full bg-muted animate-pulse rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {t('dashboard.noDataForPeriod')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatDollar}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatDollar(value),
                  name === 'income' ? 'Income' : 'Expenses',
                ]}
                contentStyle={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="var(--color-success)"
                strokeWidth={2}
                fill="url(#incomeGrad)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-destructive)"
                strokeWidth={2}
                fill="url(#expensesGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetShell>
  );
}
