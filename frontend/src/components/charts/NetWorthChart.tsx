import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { NetWorthSnapshot } from '@features/core/types';

interface NetWorthChartProps {
  snapshots: NetWorthSnapshot[];
  showLiabilities?: boolean;
}

function formatMonthLabel(isoDate: string): string {
  const [year, month] = isoDate.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('default', { month: 'short', year: '2-digit' });
}

export function NetWorthChart({ snapshots, showLiabilities = false }: NetWorthChartProps) {
  const fmt = useFormatters();

  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No net worth snapshots yet. Click "Take Snapshot Now" to record your current net worth.
      </div>
    );
  }

  const chartData = snapshots.map((s) => ({
    date: formatMonthLabel(s.snapshotDate),
    assets: s.totalAssets,
    liabilities: s.totalLiabilities,
    netWorth: s.netWorth,
  }));

  const formatDollar = (value: number) =>
    fmt.currency(value, undefined);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatDollar} tick={{ fontSize: 12 }} width={80} />
        <Tooltip formatter={(value: number) => formatDollar(value)} />
        <Legend />
        <Line
          type="monotone"
          dataKey="assets"
          name="Assets"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
        {showLiabilities && (
          <Line
            type="monotone"
            dataKey="liabilities"
            name="Liabilities"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={false}
          />
        )}
        <Line
          type="monotone"
          dataKey="netWorth"
          name="Net Worth"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
