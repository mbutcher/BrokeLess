import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useTransactions } from '@features/core/hooks/useTransactions';
import { useMonthlySummary, useForecast } from '@features/core/hooks/useReports';
import { useSavingsGoals, useSavingsGoalProgress } from '@features/core/hooks/useSavingsGoals';
import { useBudgetView } from '@features/core/hooks/useBudgetView';
import { isOfflineError } from '@lib/db/offlineHelpers';
import { AccountCard } from '@features/core/components/AccountCard';
import { MonthlyChart } from '@components/charts/MonthlyChart';
import { UpcomingExpenses } from '../components/UpcomingExpenses';
import { monthWindow, toISODate } from '@lib/budget/budgetViewUtils';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { Transaction, SavingsGoal } from '@features/core/types';
import type { MonthlySummaryEntry } from '@features/core/api/reportApi';

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  valueColor?: string;
  isLoading?: boolean;
}

function SummaryCard({ label, value, valueColor = 'text-gray-900', isLoading }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      {isLoading ? (
        <div className="mt-1 h-7 w-28 bg-gray-100 animate-pulse rounded" />
      ) : (
        <p className={`mt-1 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      )}
    </div>
  );
}

// ─── Recent transaction row ────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount > 0;
  const { currency: fmt } = useFormatters();
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {tx.payee ?? tx.description ?? '—'}
        </p>
        <p className="text-xs text-gray-400">{tx.date}</p>
      </div>
      <p
        className={`ml-4 text-sm font-semibold tabular-nums flex-shrink-0 ${isPositive ? 'text-green-600' : 'text-gray-900'}`}
      >
        {isPositive ? '+' : ''}{fmt(Math.abs(tx.amount))}
      </p>
    </div>
  );
}

// ─── Budget snapshot widget ────────────────────────────────────────────────────

function BudgetSnapshot() {
  const { t } = useTranslation();
  const today = new Date();
  const { start, end } = monthWindow(today.getFullYear(), today.getMonth() + 1);
  const startStr = toISODate(start);
  const endStr = toISODate(end);
  const { currency: fmt } = useFormatters();

  const { data: view, isLoading, isError, error } = useBudgetView(startStr, endStr);

  if (isLoading) {
    return <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />;
  }

  if (isError) {
    const msg = isOfflineError(error) ? t('dashboard.budgetNotOffline') : t('dashboard.budgetError');
    return <p className="text-sm text-gray-400 py-6 text-center">{msg}</p>;
  }

  if (!view || view.lines.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        {t('dashboard.noBudgetLines')}{' '}
        <Link to="/budget" className="text-blue-600 hover:underline">
          {t('dashboard.setupBudget')}
        </Link>
      </p>
    );
  }

  const pct =
    view.totalProratedExpenses > 0
      ? Math.min(100, (view.totalActualExpenses / view.totalProratedExpenses) * 100)
      : 0;
  const overBudget = view.totalActualExpenses > view.totalProratedExpenses;
  const remaining = view.totalProratedExpenses - view.totalActualExpenses;

  // Top 3 most over-budget lines (by variance ascending — most negative = most overspent)
  const overBudgetLines = view.lines
    .filter((l) => l.budgetLine.classification === 'expense' && l.variance < 0)
    .sort((a, b) => a.variance - b.variance)
    .slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Planned vs actual bar */}
      <div>
        <div className="flex items-center justify-between mb-1 text-sm">
          <span className="text-gray-600">{t('dashboard.budgetExpenses')}</span>
          <span className={overBudget ? 'font-semibold text-red-600' : 'text-gray-600'}>
            {fmt(view.totalActualExpenses)} / {fmt(view.totalProratedExpenses)}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`text-xs mt-1 ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {remaining >= 0
            ? `${fmt(remaining)} ${t('dashboard.budgetRemaining')}`
            : `${fmt(Math.abs(remaining))} ${t('dashboard.budgetOverBudget')}`}
        </p>
      </div>

      {/* Over-budget lines */}
      {overBudgetLines.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('dashboard.overBudgetHeader')}</p>
          {overBudgetLines.map((l) => (
            <div key={l.budgetLine.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate">{l.budgetLine.name}</span>
              <span className="text-red-600 font-medium ml-2 shrink-0">
                {fmt(Math.abs(l.variance))} {t('dashboard.overSuffix')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Savings goal mini-card ────────────────────────────────────────────────────

function GoalMiniCard({ goal }: { goal: SavingsGoal }) {
  const { data: progress } = useSavingsGoalProgress(goal.id);
  const { currency: fmt } = useFormatters();
  const pct = progress?.percentComplete ?? 0;
  const current = progress?.currentAmount ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-gray-900 truncate">{goal.name}</p>
        <p className="ml-2 text-xs text-gray-500 flex-shrink-0">
          {fmt(current)} / {fmt(goal.targetAmount)}
        </p>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t } = useTranslation();
  const [showForecast, setShowForecast] = useState(false);

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: txData, isLoading: txLoading } = useTransactions({ limit: 5, page: 1 });
  const { data: monthlySummary = [], isLoading: summaryLoading } = useMonthlySummary(6);
  const { data: forecastData = [] } = useForecast(3);
  const { data: savingsGoals = [] } = useSavingsGoals();

  const activeAccounts = accounts.filter((a) => a.isActive);

  const netWorth = activeAccounts.reduce(
    (sum, a) => sum + (a.isAsset ? a.currentBalance : -a.currentBalance),
    0
  );

  // Current month totals: last entry in the summary array (ordered asc by month)
  const currentMonth = monthlySummary.length > 0 ? monthlySummary[monthlySummary.length - 1] : null;

  const recentTransactions = txData?.data ?? [];

  const chartData: MonthlySummaryEntry[] = showForecast
    ? [...monthlySummary, ...forecastData]
    : monthlySummary;

  const topGoals = savingsGoals.slice(0, 3);
  const { currency: fmt } = useFormatters();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label={t('dashboard.netWorth')}
          value={fmt(netWorth)}
          valueColor={netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}
          isLoading={accountsLoading}
        />
        <SummaryCard
          label={t('dashboard.incomeThisMonth')}
          value={currentMonth ? fmt(currentMonth.income) : fmt(0)}
          valueColor="text-green-600"
          isLoading={summaryLoading}
        />
        <SummaryCard
          label={t('dashboard.expensesThisMonth')}
          value={currentMonth ? fmt(currentMonth.expenses) : fmt(0)}
          isLoading={summaryLoading}
        />
      </div>

      {/* Accounts row */}
      {activeAccounts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.accounts')}</h2>
            <Link to="/accounts" className="text-sm text-blue-600 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {activeAccounts.map((account) => (
              <div key={account.id} className="min-w-[220px]">
                <AccountCard account={account} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Monthly chart */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{t('dashboard.incomeVsExpenses')}</h2>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showForecast}
              onChange={(e) => setShowForecast(e.target.checked)}
              className="rounded"
            />
            {t('dashboard.showForecast')}
          </label>
        </div>
        {summaryLoading ? (
          <div className="h-60 bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <MonthlyChart data={chartData} />
        )}
        {showForecast && (
          <p className="mt-2 text-xs text-gray-400">{t('dashboard.forecastNote')}</p>
        )}
      </section>

      {/* Upcoming expenses */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <UpcomingExpenses />
      </section>

      {/* Recent transactions + Budget snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.recentTransactions')}</h2>
            <Link to="/transactions" className="text-sm text-blue-600 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {txLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t('dashboard.noTransactions')}</p>
          ) : (
            <div>
              {recentTransactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </section>

        {/* Budget snapshot */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.budgetThisMonth')}</h2>
            <Link to="/budget" className="text-sm text-blue-600 hover:underline">
              {t('dashboard.viewBudget')}
            </Link>
          </div>
          <BudgetSnapshot />
        </section>
      </div>

      {/* Savings goals widget */}
      {topGoals.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.savingsGoals')}</h2>
            <Link to="/savings-goals" className="text-sm text-blue-600 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          <div className="space-y-4">
            {topGoals.map((goal) => (
              <GoalMiniCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
