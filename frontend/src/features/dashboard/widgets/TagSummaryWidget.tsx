import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTagSummary } from '@features/core/hooks/useReports';
import { useFormatters } from '@lib/i18n/useFormatters';
import { monthWindow, toISODate } from '@lib/budget/budgetViewUtils';
import { WidgetShell } from '../components/WidgetShell';

const BAR_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
];

export function TagSummaryWidget() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const navigate = useNavigate();

  const today = new Date();
  const { start, end } = monthWindow(today.getFullYear(), today.getMonth() + 1);
  const { data, isLoading } = useTagSummary(toISODate(start), toISODate(end), 'expense');

  const tags = data?.tags ?? [];
  // Recharts vertical bar: reverse so largest is on top
  const chartData = [...tags].reverse();

  return (
    <WidgetShell id="tag-summary" title={t('dashboard.tagSummary')}>
      <div className="h-full min-h-0">
        {isLoading ? (
          <div className="h-full bg-muted animate-pulse rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground text-center px-4">
            {t('dashboard.tagSummaryEmpty')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v: number) => fmt.currency(v)}
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="tag"
                width={80}
                tick={{ fontSize: 11, fill: 'var(--color-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => `#${v.length > 9 ? v.slice(0, 9) + '\u2026' : v}`}
              />
              <Tooltip
                formatter={(value: number) => [fmt.currency(value), t('reports.total')]}
                labelFormatter={(label: string) => `#${label}`}
                contentStyle={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="totalAmount"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(d: { tag: string }) =>
                  navigate(`/transactions?tag=${encodeURIComponent(d.tag)}`)
                }
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetShell>
  );
}
