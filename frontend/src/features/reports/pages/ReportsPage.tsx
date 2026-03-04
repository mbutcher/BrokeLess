import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  useTagSummary,
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
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.period')}</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground"
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
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.type')}</label>
          <div className="flex border border-border rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setType('expense')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'expense'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {t('reports.expenses')}
            </button>
            <button
              onClick={() => setType('income')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'income'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {t('reports.income')}
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      ) : data ? (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              {type === 'expense' ? t('reports.expenses') : t('reports.income')}: {fmt.currency(data.total)}
            </span>
            <span className="text-xs text-muted-foreground">
              {data.start} – {data.end}
            </span>
          </div>
          <SpendingPieChart categories={data.categories} total={data.total} />
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">{t('reports.noData')}</div>
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
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.timeRange')}</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground"
          >
            <option value={3}>{t('reports.months3')}</option>
            <option value={6}>{t('reports.months6')}</option>
            <option value={12}>{t('reports.months12')}</option>
            <option value={24}>{t('reports.months24')}</option>
          </select>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showLiabilities}
              onChange={(e) => setShowLiabilities(e.target.checked)}
              className="rounded border-border"
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
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('reports.netWorth')}</p>
            <p
              className={[
                'text-2xl font-bold mt-1',
                latest.netWorth >= 0 ? 'text-primary' : 'text-destructive',
              ].join(' ')}
            >
              {fmt.currency(latest.netWorth)}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('reports.totalAssets')}</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {fmt.currency(latest.totalAssets)}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('reports.totalLiabilities')}</p>
            <p className="text-2xl font-bold mt-1 text-rose-500">
              {fmt.currency(latest.totalLiabilities)}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      ) : (
        <div className="bg-card rounded-xl border border-border p-4">
          <NetWorthChart snapshots={snapshots} showLiabilities={showLiabilities} />
        </div>
      )}

      {takeSnapshot.isError && (
        <p className="text-xs text-destructive">{t('reports.snapshotError')}</p>
      )}
    </div>
  );
}

// ─── Top Payees Tab ───────────────────────────────────────────────────────────

function TopPayeesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('this_month');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [limit, setLimit] = useState(10);
  const { start, end } = useMemo(() => getPeriodDates(period), [period]);
  const { data, isLoading } = useTopPayees(start, end, limit, type);
  const fmt = useFormatters();

  function handlePayeeClick(payee: string): void {
    navigate(`/transactions?q=${encodeURIComponent(payee)}`);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.period')}</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground"
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
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.type')}</label>
          <div className="flex border border-border rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setType('expense')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'expense'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {t('reports.expenses')}
            </button>
            <button
              onClick={() => setType('income')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'income'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {t('reports.income')}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.showTop')}</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground"
          >
            <option value={5}>{t('reports.payees5')}</option>
            <option value={10}>{t('reports.payees10')}</option>
            <option value={20}>{t('reports.payees20')}</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      ) : data ? (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              {t('reports.total')}: {fmt.currency(data.total)}
            </span>
            <span className="text-xs text-muted-foreground">
              {data.start} – {data.end}
            </span>
          </div>
          <TopPayeesBarChart payees={data.payees} total={data.total} onPayeeClick={handlePayeeClick} />
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">{t('reports.noData')}</div>
      )}
    </div>
  );
}

// ─── Tags Tab ─────────────────────────────────────────────────────────────────

function TagsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('this_month');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const { start, end } = useMemo(() => getPeriodDates(period), [period]);
  const { data, isLoading } = useTagSummary(start, end, type);
  const fmt = useFormatters();

  const tags = data?.tags ?? [];
  const chartData = [...tags].reverse();

  function handleTagClick(tag: string): void {
    navigate(`/transactions?tag=${encodeURIComponent(tag)}`);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.period')}</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground"
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
          <label className="block text-xs text-muted-foreground mb-1">{t('reports.type')}</label>
          <div className="flex border border-border rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setType('expense')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'expense'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {t('reports.expenses')}
            </button>
            <button
              onClick={() => setType('income')}
              className={[
                'px-3 py-1.5 transition-colors',
                type === 'income'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {t('reports.income')}
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      ) : data && chartData.length > 0 ? (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              {t('reports.tagSummaryTitle')}: {fmt.currency(data.total)}
            </span>
            <span className="text-xs text-muted-foreground">
              {data.start} – {data.end}
            </span>
          </div>
          <TopPayeesBarChart
            payees={chartData.map((item) => ({ payee: item.tag, totalAmount: item.totalAmount, percentage: item.percentage }))}
            total={data.total}
            onPayeeClick={handleTagClick}
          />
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">{t('reports.noTagData')}</div>
      )}
    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────

type Tab = 'spending' | 'networth' | 'payees' | 'tags';

export function ReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('spending');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'spending', label: t('reports.spending') },
    { id: 'networth', label: t('reports.netWorth') },
    { id: 'payees', label: t('reports.topPayees') },
    { id: 'tags', label: t('reports.tags') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('reports.subtitle')}</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
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
      {tab === 'tags' && <TagsTab />}
    </div>
  );
}
