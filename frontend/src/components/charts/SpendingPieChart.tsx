import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { SpendingByCategoryItem } from '@features/core/types';

interface SpendingPieChartProps {
  categories: SpendingByCategoryItem[];
  total: number;
}

// Fallback colour palette when a category has no colour set
const FALLBACK_COLORS = [
  '#3b82f6', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function categoryColor(cat: SpendingByCategoryItem, index: number): string {
  return cat.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]!;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: SpendingByCategoryItem & { pct: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const fmt = useFormatters();
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  return (
    <div className="rounded-lg bg-white shadow-lg border border-gray-200 px-3 py-2 text-sm">
      <p className="font-medium text-gray-900">{item.name}</p>
      <p className="text-gray-600">{fmt.currency(item.value)}</p>
      <p className="text-gray-400">{item.payload.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function SpendingPieChart({ categories, total }: SpendingPieChartProps) {
  const fmt = useFormatters();
  const [drillParent, setDrillParent] = useState<string | null>(null);

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No spending data for this period.
      </div>
    );
  }

  // Drill-down: if drillParent is set, show only subcategories of that parent
  const displayed = drillParent
    ? categories.filter((c) => c.parentId === drillParent)
    : categories.filter((c) => c.parentId === null);

  // If all categories are already subcategories (no top-level), show all
  const chartData = (displayed.length > 0 ? displayed : categories).map((c, i) => ({
    ...c,
    name: c.categoryName,
    value: c.totalAmount,
    fill: categoryColor(c, i),
  }));

  const drillName = drillParent
    ? categories.find((c) => c.categoryId === drillParent)?.categoryName
    : null;

  return (
    <div>
      {drillParent && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setDrillParent(null)}
            className="text-xs text-blue-600 hover:underline"
          >
            ← All categories
          </button>
          <span className="text-xs text-gray-500">{drillName}</span>
        </div>
      )}

      <div className="text-center mb-1">
        <span className="text-sm text-gray-500">Total: </span>
        <span className="text-sm font-semibold text-gray-900">{fmt.currency(total)}</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={55}
            dataKey="value"
            onClick={(entry) => {
              // Drill into a top-level category if it has subcategory children
              if (!drillParent) {
                const hasChildren = categories.some((c) => c.parentId === entry.categoryId);
                if (hasChildren) setDrillParent(entry.categoryId as string);
              }
            }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.categoryId}
                fill={entry.fill}
                opacity={drillParent === null ? 1 : 0.85}
                cursor={!drillParent && categories.some((c) => c.parentId === entry.categoryId) ? 'pointer' : 'default'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-gray-700">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {!drillParent && (
        <p className="text-center text-xs text-gray-400 mt-1">
          Click a slice to drill into subcategories
        </p>
      )}
    </div>
  );
}
