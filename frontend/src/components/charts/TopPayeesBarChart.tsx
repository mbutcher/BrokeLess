import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { TopPayeeItem } from '@features/core/types';

interface TopPayeesBarChartProps {
  payees: TopPayeeItem[];
  total: number;
}

const BAR_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
];

export function TopPayeesBarChart({ payees }: TopPayeesBarChartProps) {
  const fmt = useFormatters();

  if (payees.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No payee data for this period.
      </div>
    );
  }

  // Recharts expects data in ascending order for horizontal bar — reverse so largest is on top
  const chartData = [...payees].reverse();

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => fmt.currency(v)}
          tick={{ fontSize: 11 }}
          width={80}
        />
        <YAxis
          type="category"
          dataKey="payee"
          tick={{ fontSize: 12 }}
          width={120}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [fmt.currency(value), 'Total']}
          labelFormatter={(label: string) => label}
        />
        <Bar dataKey="totalAmount" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={BAR_COLORS[index % BAR_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
