import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          <label className="block text-xs text-gray-500 mb-1">{t('reports.period')}</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="this_month">{t('reports.thisMonth')}</option>
            <option value="last_month">{t('reports.lastMonth')}</option>
            <option value="last_3_months">{t('reports.last3Months')}</option>
            <option value="last_6_months">{t('reports.last6Months')}</option>
            <option value="this_year">{t('reports.thisYear')}</option>
            <option value="last_year">{t('reports.lastYear')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('reports.type')}</label>
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
              {t('reports.expenses')}
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
              {t('reports.income')}
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
              {type === 'expense' ? t('reports.expenses') : t('reports.income')}: {fmt.currency(data.total)}
            </span>
            <span className="text-xs text-gray-400">
              {data.start} – {data.end}
            </span>
          </div>
          <SpendingPieChart categories={data.categories} total={data.total} />
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm">{t('reports.noData')}</div>
      )}
    </div>
  );
}

// ─── Net Worth Tab ────────────────────────────────────────────────────────────

function NetWorthTab() {
  const { t } = useTranslation();
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
          <label className="block text-xs text-gray-500 mb-1">{t('reports.timeRange')}</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value={3}>{t('reports.months3')}</option>
            <option value={6}>{t('reports.months6')}</option>
            <option value={12}>{t('reports.months12')}</option>
            <option value={24}>{t('reports.months24')}</option>
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
            {t('reports.showLiabilities')}
          </label>
          <Button
            size="sm"
            isLoading={takeSnapshot.isPending}
            onClick={() => takeSnapshot.mutate()}
          >
            {t('reports.takeSnapshot')}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {latest && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reports.netWorth')}</p>
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
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reports.totalAssets')}</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {fmt.currency(latest.totalAssets)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reports.totalLiabilities')}</p>
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
        <p className="text-xs text-red-600">{t('reports.snapshotError')}</p>
      )}
    </div>
  );
}

// ─── Top Payees Tab ───────────────────────────────────────────────────────────

function TopPayeesTab() {
  const { t } = useTranslation();
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
          <label className="block text-xs text-gray-500 mb-1">{t('reports.period')}</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="this_month">{t('reports.thisMonth')}</option>
            <option value="last_month">{t('reports.lastMonth')}</option>
            <option value="last_3_months">{t('reports.last3Months')}</option>
            <option value="last_6_months">{t('reports.last6Months')}</option>
            <option value="this_year">{t('reports.thisYear')}</option>
            <option value="last_year">{t('reports.lastYear')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('reports.type')}</label>
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
              {t('reports.expenses')}
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
              {t('reports.income')}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('reports.showTop')}</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value={5}>{t('reports.payees5')}</option>
            <option value={10}>{t('reports.payees10')}</option>
            <option value={20}>{t('reports.payees20')}</option>
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
        <div className="text-center py-16 text-gray-400 text-sm">{t('reports.noData')}</div>
      )}
    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────

type Tab = 'spending' | 'networth' | 'payees';

export function ReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('spending');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'spending', label: t('reports.spending') },
    { id: 'networth', label: t('reports.netWorth') },
    { id: 'payees', label: t('reports.topPayees') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('reports.subtitle')}</p>
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
