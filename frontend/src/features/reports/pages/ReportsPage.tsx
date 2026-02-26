import { useState, useMemo } from 'react';
import { useFormatters } from '@lib/i18n/useFormatters';
import { Button } from '@components/ui/button';
import { SpendingPieChart } from '@components/charts/SpendingPieChart';
import { NetWorthChart } from '@components/charts/NetWorthChart';
import { TopPayeesBarChart } from '@components/charts/TopPayeesBarChart';
import {
  useSpendingByCategory,
  useNetWorthHistory,
  useTakeNetWorthSnapshot,
  useTopPayees,
} from '@features/core/hooks/useReports';
import { toLocalISO } from '@lib/budget/budgetViewUtils';

function getPeriodDates(period: string): { start: string; end: string } {
  const today = new Date();
  switch (period) {
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toLocalISO(start), end: toLocalISO(end) };
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toLocalISO(start), end: toLocalISO(end) };
    }
    case 'last_3_months': {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      return { start: toLocalISO(start), end: toLocalISO(today) };
    }
    case 'last_6_months': {
      const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      return { start: toLocalISO(start), end: toLocalISO(today) };
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { start: toLocalISO(start), end: toLocalISO(end) };
    }
    case 'last_year': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { start: toLocalISO(start), end: toLocalISO(end) };
    }
    default:
      return { start: toLocalISO(today), end: toLocalISO(today) };
  }
}

// ─── Spending Tab ─────────────────────────────────────────────────────────────

function SpendingTab() {
  const [period, setPeriod] = useState('this_month');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const { start, end } = useMemo(() => getPeriodDates(period), [period]);
  const { data, isLoading } = useSpendingByCategory(start, end, type);
  const fmt = useFormatters();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="last_3_months">Last 3 months</option>
            <option value="last_6_months">Last 6 months</option>
            <option value="this_year">This year</option>
            <option value="last_year">Last year</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setType('expense')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'expense'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              Expenses
            </button>
            <button
              onClick={() => setType('income')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'income'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              Income
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 bg-gray-100 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              {type === 'expense' ? 'Expenses' : 'Income'}: {fmt.currency(data.total)}
            </span>
            <span className="text-xs text-gray-400">
              {data.start} – {data.end}
            </span>
          </div>
          <SpendingPieChart categories={data.categories} total={data.total} />
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm">No data for this period.</div>
      )}
    </div>
  );
}

// ─── Net Worth Tab ────────────────────────────────────────────────────────────

function NetWorthTab() {
  const [months, setMonths] = useState(12);
  const [showLiabilities, setShowLiabilities] = useState(false);
  const { data, isLoading } = useNetWorthHistory(months);
  const takeSnapshot = useTakeNetWorthSnapshot();
  const fmt = useFormatters();

  const latest = data?.latest;
  const snapshots = data?.snapshots ?? [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Time range</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
          </select>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showLiabilities}
              onChange={(e) => setShowLiabilities(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show liabilities
          </label>
          <Button
            size="sm"
            isLoading={takeSnapshot.isPending}
            onClick={() => takeSnapshot.mutate()}
          >
            Take Snapshot Now
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {latest && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Net Worth</p>
            <p
              className={[
                'text-2xl font-bold mt-1',
                latest.netWorth >= 0 ? 'text-blue-600' : 'text-red-500',
              ].join(' ')}
            >
              {fmt.currency(latest.netWorth)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Assets</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {fmt.currency(latest.totalAssets)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Liabilities</p>
            <p className="text-2xl font-bold mt-1 text-rose-500">
              {fmt.currency(latest.totalLiabilities)}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 bg-gray-100 animate-pulse rounded-xl" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <NetWorthChart snapshots={snapshots} showLiabilities={showLiabilities} />
        </div>
      )}

      {takeSnapshot.isError && (
        <p className="text-xs text-red-600">Failed to take snapshot. Please try again.</p>
      )}
    </div>
  );
}

// ─── Top Payees Tab ───────────────────────────────────────────────────────────

function TopPayeesTab() {
  const [period, setPeriod] = useState('this_month');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [limit, setLimit] = useState(10);
  const { start, end } = useMemo(() => getPeriodDates(period), [period]);
  const { data, isLoading } = useTopPayees(start, end, limit, type);
  const fmt = useFormatters();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="last_3_months">Last 3 months</option>
            <option value="last_6_months">Last 6 months</option>
            <option value="this_year">This year</option>
            <option value="last_year">Last year</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setType('expense')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'expense'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              Expenses
            </button>
            <button
              onClick={() => setType('income')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'income'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              Income
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Show top</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value={5}>5 payees</option>
            <option value={10}>10 payees</option>
            <option value={20}>20 payees</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 bg-gray-100 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Total: {fmt.currency(data.total)}
            </span>
            <span className="text-xs text-gray-400">
              {data.start} – {data.end}
            </span>
          </div>
          <TopPayeesBarChart payees={data.payees} total={data.total} />
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm">No data for this period.</div>
      )}
    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────

type Tab = 'spending' | 'networth' | 'payees';

const TABS: { id: Tab; label: string }[] = [
  { id: 'spending', label: 'Spending' },
  { id: 'networth', label: 'Net Worth' },
  { id: 'payees', label: 'Top Payees' },
];

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('spending');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analyse your spending and net worth over time.</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'spending' && <SpendingTab />}
      {tab === 'networth' && <NetWorthTab />}
      {tab === 'payees' && <TopPayeesTab />}
    </div>
  );
}
