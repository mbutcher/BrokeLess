import { useState, useMemo } from 'react';
import { useAccounts, useArchiveAccount, useUpdateAccount } from '../hooks/useAccounts';
import { AccountCard } from '../components/AccountCard';
import { AccountForm } from '../components/AccountForm';
import { useExchangeRates } from '../hooks/useExchangeRate';
import { useAuthStore } from '@features/auth/stores/authStore';
import { ACCOUNT_TYPE_LABELS } from '../constants';
import type { Account, AccountType } from '../types';

type SortKey = 'name-asc' | 'name-desc' | 'balance-desc' | 'balance-asc' | 'type' | 'rate-desc' | 'rate-asc';
type GroupBy = 'all' | 'assets' | 'liabilities';

const selectClass =
  'border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

export function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts();
  const archiveAccount = useArchiveAccount();
  const updateAccount = useUpdateAccount();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  // Filter / sort state
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name-asc');

  const activeAccounts = accounts.filter((a) => a.isActive);
  const archivedAccounts = accounts.filter((a) => !a.isActive);

  const defaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'CAD');

  // Build unique currency pairs needed for conversion
  const currencyPairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: Array<{ from: string; to: string }> = [];
    for (const a of activeAccounts) {
      if (a.currency.toUpperCase() !== defaultCurrency.toUpperCase()) {
        const key = `${a.currency.toUpperCase()}/${defaultCurrency.toUpperCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ from: a.currency, to: defaultCurrency });
        }
      }
    }
    return pairs;
  }, [activeAccounts, defaultCurrency]);

  const { rates: exchangeRates, isLoading: ratesLoading, hasStale: ratesAreStale } = useExchangeRates(currencyPairs);

  const hasMixedCurrencies = currencyPairs.length > 0;

  const netWorth = activeAccounts.reduce((sum, a) => {
    let balance = a.currentBalance;
    const fromU = a.currency.toUpperCase();
    const toU = defaultCurrency.toUpperCase();
    if (fromU !== toU) {
      const rateData = exchangeRates.get(`${fromU}/${toU}`);
      if (rateData) balance = a.currentBalance * rateData.rate;
    }
    return sum + (a.isAsset ? balance : -balance);
  }, 0);

  // Unique institutions from all accounts
  const institutions = useMemo(() => {
    const seen = new Set<string>();
    for (const a of accounts) {
      if (a.institution) seen.add(a.institution);
    }
    return Array.from(seen).sort();
  }, [accounts]);

  // Apply filters + sort to active accounts
  const filteredAccounts = useMemo(() => {
    let list = [...activeAccounts];

    if (typeFilter !== 'all') {
      list = list.filter((a) => a.type === typeFilter);
    }
    if (institutionFilter !== 'all') {
      list = list.filter((a) => a.institution === institutionFilter);
    }
    if (groupBy === 'assets') {
      list = list.filter((a) => a.isAsset);
    } else if (groupBy === 'liabilities') {
      list = list.filter((a) => !a.isAsset);
    }

    switch (sortBy) {
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'balance-desc':
        list.sort((a, b) => b.currentBalance - a.currentBalance);
        break;
      case 'balance-asc':
        list.sort((a, b) => a.currentBalance - b.currentBalance);
        break;
      case 'type':
        list.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
        break;
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
    }

    return list;
  }, [activeAccounts, typeFilter, institutionFilter, groupBy, sortBy]);

  const hasFilters =
    typeFilter !== 'all' || institutionFilter !== 'all' || groupBy !== 'all' || sortBy !== 'name-asc';

  function openEdit(account: Account) {
    setEditing(account);
    setShowForm(false);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleArchive(account: Account) {
    archiveAccount.mutate(account.id);
  }

  function handleRestore(account: Account) {
    updateAccount.mutate({ id: account.id, data: { isActive: true } });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Net worth:{' '}
            <span
              className={
                netWorth >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
              }
            >
              {hasMixedCurrencies ? '~' : ''}{defaultCurrency} {netWorth.toFixed(2)}
            </span>
            {hasMixedCurrencies && (
              <span className="ml-1.5 text-xs text-gray-400">
                {ratesLoading
                  ? 'converting…'
                  : ratesAreStale
                  ? '⚠ converted (stale rates)'
                  : 'converted'}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          + Add Account
        </button>
      </div>

      {/* Edit / Create form */}
      {(showForm || editing) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editing ? 'Edit Account' : 'New Account'}
          </h2>
          <AccountForm
            account={editing ?? undefined}
            onSuccess={closeForm}
            onCancel={closeForm}
          />
        </div>
      )}

      {/* Filter / Sort bar */}
      {!isLoading && activeAccounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AccountType | 'all')}
            className={selectClass}
          >
            <option value="all">All Types</option>
            {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {institutions.length > 0 && (
            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All Institutions</option>
              {institutions.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          )}

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className={selectClass}
          >
            <option value="all">Assets &amp; Liabilities</option>
            <option value="assets">Assets only</option>
            <option value="liabilities">Liabilities only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className={selectClass}
          >
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="balance-desc">Balance ↓</option>
            <option value="balance-asc">Balance ↑</option>
            <option value="type">Type</option>
            <option value="rate-desc">Rate ↓</option>
            <option value="rate-asc">Rate ↑</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setInstitutionFilter('all');
                setGroupBy('all');
                setSortBy('name-asc');
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Account list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {activeAccounts.length === 0 && !showForm && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No accounts yet. Add one to get started.</p>
            </div>
          )}

          {filteredAccounts.length === 0 && activeAccounts.length > 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No accounts match the current filters.</p>
            </div>
          )}

          <div className="space-y-3">
            {filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={() => openEdit(account)}
                onArchive={() => handleArchive(account)}
              />
            ))}
          </div>

          {archivedAccounts.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                {archivedAccounts.length} archived account
                {archivedAccounts.length !== 1 ? 's' : ''}
              </summary>
              <div className="space-y-3 mt-3">
                {archivedAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onArchive={() => handleRestore(account)}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
