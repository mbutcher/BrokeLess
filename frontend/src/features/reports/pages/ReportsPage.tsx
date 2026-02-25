import { useState, useMemo } from 'react';
import { useFormatters } from '@lib/i18n/useFormatters';
import { frequencyLabel } from '@lib/utils/frequencyLabel';
import { Button } from '@components/ui/button';
import { SpendingPieChart } from '@components/charts/SpendingPieChart';
import { NetWorthChart } from '@components/charts/NetWorthChart';
import { RecurringTransactionDialog } from '@features/core/components/RecurringTransactionDialog';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useCategories } from '@features/core/hooks/useCategories';
import {
  useSpendingByCategory,
  useNetWorthHistory,
  useTakeNetWorthSnapshot,
} from '@features/core/hooks/useReports';
import {
  useRecurringTransactions,
  useUpdateRecurringTransaction,
  useDeleteRecurringTransaction,
} from '@features/core/hooks/useRecurringTransactions';
import type { RecurringTransaction } from '@features/core/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

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

// ─── Recurring Tab ────────────────────────────────────────────────────────────

function RecurringTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const { data: recurring = [], isLoading } = useRecurringTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const updateRecurring = useUpdateRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();
  const fmt = useFormatters();

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';
  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? '—') : '—';

  const today = new Date();
  const todayStr = toLocalISO(today);
  const in30DaysStr = toLocalISO(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30),
  );

  const upcoming = useMemo(
    () =>
      recurring
        .filter((r) => r.isActive && r.nextDueDate >= todayStr && r.nextDueDate <= in30DaysStr)
        .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [recurring, todayStr, in30DaysStr],
  );

  const activeCount = recurring.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activeCount} active recurring transaction{activeCount !== 1 ? 's' : ''}
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          + Add Recurring
        </Button>
      </div>

      {/* Main table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : recurring.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No recurring transactions yet. Add one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Payee / Description
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Frequency
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Next Due
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Account
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Category
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recurring.map((r) => (
                  <tr
                    key={r.id}
                    className={[
                      'border-b border-gray-50 last:border-0',
                      !r.isActive && 'opacity-50',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {r.payee ?? r.description ?? '—'}
                    </td>
                    <td
                      className={[
                        'px-4 py-3 text-right font-medium tabular-nums',
                        r.amount < 0 ? 'text-red-600' : 'text-green-600',
                      ].join(' ')}
                    >
                      {r.amount < 0 ? '−' : '+'}
                      {fmt.currency(Math.abs(r.amount))}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {frequencyLabel(r.frequency, r.frequencyInterval)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">{r.nextDueDate}</td>
                    <td className="px-4 py-3 text-gray-700">{accountName(r.accountId)}</td>
                    <td className="px-4 py-3 text-gray-500">{categoryName(r.categoryId)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          r.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500',
                        ].join(' ')}
                      >
                        {r.isActive ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            updateRecurring.mutate({
                              id: r.id,
                              data: { isActive: !r.isActive },
                            })
                          }
                          className="text-xs text-gray-500 hover:underline"
                        >
                          {r.isActive ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => deleteRecurring.mutate(r.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming section */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Upcoming — next 30 days</h3>
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-2.5"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {r.payee ?? r.description ?? '—'}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">{accountName(r.accountId)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={[
                      'text-sm font-medium tabular-nums',
                      r.amount < 0 ? 'text-red-600' : 'text-green-600',
                    ].join(' ')}
                  >
                    {r.amount < 0 ? '−' : '+'}
                    {fmt.currency(Math.abs(r.amount))}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums">{r.nextDueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RecurringTransactionDialog
        open={dialogOpen}
        recurring={editing ?? undefined}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────

type Tab = 'spending' | 'networth' | 'recurring';

const TABS: { id: Tab; label: string }[] = [
  { id: 'spending', label: 'Spending' },
  { id: 'networth', label: 'Net Worth' },
  { id: 'recurring', label: 'Recurring' },
];

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('spending');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analyse your spending, net worth, and recurring transactions.</p>
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
      {tab === 'recurring' && <RecurringTab />}
    </div>
  );
}
