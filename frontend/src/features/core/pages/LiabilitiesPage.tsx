import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAccounts } from '../hooks/useAccounts';
import { useWhatIf, useDebtSchedules } from '../hooks/useDebt';
import { ACCOUNT_TYPE_LABELS } from '../constants';
import type { Account } from '../types';

const LIABILITY_TYPES: Account['type'][] = ['credit_card', 'loan', 'line_of_credit', 'mortgage'];

type SortKey = 'rate-desc' | 'rate-asc' | 'balance-desc' | 'balance-asc' | 'interest-desc';

const selectClass =
  'border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

// ─── Per-account What-If calculator ──────────────────────────────────────────

function WhatIfRow({ accountId, hasSchedule }: { accountId: string; hasSchedule?: boolean }) {
  const [extra, setExtra] = useState('');
  const extraNum = parseFloat(extra);
  const { data: whatIf, isError } = useWhatIf(accountId, isNaN(extraNum) ? null : extraNum);

  if (hasSchedule === false || isError) {
    return (
      <p className="text-xs text-gray-400 mt-1">
        <Link to={`/accounts/${accountId}/debt`} className="text-blue-600 hover:underline">
          Set up amortization schedule
        </Link>{' '}
        to use the paydown calculator.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <div className="relative">
        <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">$</span>
        <input
          type="number"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          min="0.01"
          step="0.01"
          placeholder="Extra/mo"
          className="pl-6 border border-gray-200 rounded-md px-2 py-1.5 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      {whatIf && (
        <p className="text-xs text-gray-600">
          Pay off{' '}
          <span className="font-semibold text-green-600">{whatIf.monthsSaved} months</span> sooner
          {' · '}save{' '}
          <span className="font-semibold text-green-600">
            ${whatIf.interestSaved.toFixed(2)}
          </span>{' '}
          interest. New payoff: <span className="font-medium">{whatIf.newPayoffDate}</span>
        </p>
      )}
    </div>
  );
}

// ─── Single liability row ─────────────────────────────────────────────────────

function LiabilityRow({ account, hasSchedule }: { account: Account; hasSchedule?: boolean }) {
  const absBalance = Math.abs(account.currentBalance);
  const isNegativeBalance = account.currentBalance < 0;
  const monthlyInterest =
    account.annualRate != null ? absBalance * account.annualRate / 12 : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: name + type */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-3 rounded-full flex-shrink-0 mt-1"
            style={{ height: 36, backgroundColor: account.color ?? '#6b7280' }}
          />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{account.name}</p>
            <p className="text-sm text-gray-500">
              {ACCOUNT_TYPE_LABELS[account.type]}
              {account.institution && ` · ${account.institution}`}
            </p>
            {account.annualRate != null ? (
              <p className="text-xs text-gray-400 mt-0.5">
                {(account.annualRate * 100).toFixed(2)}% APR
                {monthlyInterest !== null && (
                  <span className="ml-2 text-orange-500 font-medium">
                    ~${monthlyInterest.toFixed(2)}/mo interest
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">
                No rate set —{' '}
                <Link
                  to={`/accounts/${account.id}/debt`}
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  add via Debt Detail
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Right: balance */}
        <div className="text-right flex-shrink-0">
          <p className="font-semibold tabular-nums text-gray-900">
            {isNegativeBalance ? '-' : ''}{account.currency} {absBalance.toFixed(2)}
          </p>
          <Link
            to={`/accounts/${account.id}/debt`}
            className="text-xs text-blue-600 hover:underline mt-0.5 block"
          >
            Debt detail →
          </Link>
        </div>
      </div>

      {/* What-if row */}
      <WhatIfRow accountId={account.id} hasSchedule={hasSchedule} />
    </div>
  );
}

// ─── LiabilitiesPage ──────────────────────────────────────────────────────────

export function LiabilitiesPage() {
  const { data: accounts = [], isLoading } = useAccounts();
  const [sortBy, setSortBy] = useState<SortKey>('rate-desc');

  const liabilities = useMemo(() => {
    const list = accounts.filter(
      (a) => a.isActive && !a.isAsset && LIABILITY_TYPES.includes(a.type)
    );

    switch (sortBy) {
      case 'rate-desc':
        list.sort((a, b) => {
          if (a.annualRate == null && b.annualRate == null) return a.name.localeCompare(b.name);
          if (a.annualRate == null) return 1;
          if (b.annualRate == null) return -1;
          return b.annualRate - a.annualRate;
        });
        break;
      case 'rate-asc':
        list.sort((a, b) => {
          if (a.annualRate == null && b.annualRate == null) return a.name.localeCompare(b.name);
          if (a.annualRate == null) return 1;
          if (b.annualRate == null) return -1;
          return a.annualRate - b.annualRate;
        });
        break;
      case 'balance-desc':
        list.sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance));
        break;
      case 'balance-asc':
        list.sort((a, b) => Math.abs(a.currentBalance) - Math.abs(b.currentBalance));
        break;
      case 'interest-desc':
        list.sort((a, b) => {
          const ai = a.annualRate != null ? Math.abs(a.currentBalance) * a.annualRate / 12 : 0;
          const bi = b.annualRate != null ? Math.abs(b.currentBalance) * b.annualRate / 12 : 0;
          return bi - ai;
        });
        break;
    }

    return list;
  }, [accounts, sortBy]);

  const schedules = useDebtSchedules(liabilities.map((a) => a.id));

  const totalBalance = liabilities.reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);
  const totalMonthlyInterest = liabilities.reduce((sum, a) => {
    if (a.annualRate == null) return sum;
    return sum + Math.abs(a.currentBalance) * a.annualRate / 12;
  }, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Liabilities</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ranked by highest interest rate first (avalanche method).
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : liabilities.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No active liability accounts found.</p>
          <p className="text-xs mt-1">
            <Link to="/accounts" className="text-blue-600 hover:underline">
              Add an account
            </Link>{' '}
            of type Credit Card, Loan, Line of Credit, or Mortgage.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Outstanding</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Est. Monthly Interest</p>
              <p className="text-xl font-bold text-orange-500 tabular-nums">
                ~${totalMonthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {liabilities.some((a) => a.annualRate == null) && (
                <p className="text-xs text-gray-400 mt-0.5">Some accounts have no rate set</p>
              )}
            </div>
          </div>

          {/* Sort control */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{liabilities.length} account{liabilities.length !== 1 ? 's' : ''}</p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className={selectClass}
            >
              <option value="rate-desc">Rate ↓ (Avalanche)</option>
              <option value="rate-asc">Rate ↑</option>
              <option value="balance-desc">Balance ↓</option>
              <option value="balance-asc">Balance ↑</option>
              <option value="interest-desc">Monthly Interest ↓</option>
            </select>
          </div>

          {/* Liability cards */}
          <div className="space-y-3">
            {liabilities.map((account) => (
              <LiabilityRow key={account.id} account={account} hasSchedule={schedules.get(account.id)} />
            ))}
          </div>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Paying off highest-rate debt first minimizes total interest paid (debt avalanche method).
          </p>
        </>
      )}
    </div>
  );
}
