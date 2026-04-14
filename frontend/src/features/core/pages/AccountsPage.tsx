import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts, useArchiveAccount, useUpdateAccount } from '../hooks/useAccounts';
import { AccountCard } from '../components/AccountCard';
import { AccountForm } from '../components/AccountForm';
import { useExchangeRates } from '../hooks/useExchangeRate';
import { useAuthStore } from '@features/auth/stores/authStore';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { ManageSharesDialog } from '@features/household/components/ManageSharesDialog';
import type { Account, AccountType } from '../types';
import { ACCOUNT_TYPES } from '../constants';

type SortKey = 'name-asc' | 'name-desc' | 'balance-desc' | 'balance-asc' | 'type' | 'rate-desc' | 'rate-asc';
type GroupBy = 'all' | 'assets' | 'liabilities';

const selectClass =
  'border border-border rounded-lg px-2 py-1.5 text-xs text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring';

export function AccountsPage() {
  const { t } = useTranslation();
  const { data: accounts = [], isLoading } = useAccounts();
  const archiveAccount = useArchiveAccount();
  const updateAccount = useUpdateAccount();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [sharingAccount, setSharingAccount] = useState<Account | null>(null);
  const [archivingAccount, setArchivingAccount] = useState<Account | null>(null);

  // Filter / sort state
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name-asc');

  const activeAccounts = accounts.filter((a) => a.isActive);
  const archivedAccounts = accounts.filter((a) => !a.isActive);

  const currentUserId = useAuthStore((s) => s.user?.id);
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

  const myAccounts = filteredAccounts.filter((a) => a.userId === currentUserId);
  const sharedAccounts = filteredAccounts.filter((a) => a.userId !== currentUserId);
  const hasSharedAccounts = sharedAccounts.length > 0;

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
    setArchivingAccount(account);
  }

  function confirmArchive() {
    archiveAccount.mutate(archivingAccount!.id, { onSuccess: () => setArchivingAccount(null) });
  }

  function handleRestore(account: Account) {
    updateAccount.mutate({ id: account.id, data: { isActive: true } });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('accounts.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('accounts.netWorth')}{' '}
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
                  ? t('accounts.converting')
                  : ratesAreStale
                  ? `⚠ ${t('accounts.convertedStale')}`
                  : t('accounts.converted')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t('accounts.addAccount')}
        </button>
      </div>

      {/* Share management dialog */}
      {sharingAccount && (
        <ManageSharesDialog
          account={sharingAccount}
          open
          onClose={() => setSharingAccount(null)}
        />
      )}

      {/* Edit / Create modal */}
      <Dialog open={showForm || editing !== null} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('accounts.editAccountTitle') : t('accounts.newAccount')}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editing ?? undefined}
            onSuccess={closeForm}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <Dialog open={archivingAccount !== null} onOpenChange={(open) => { if (!open) setArchivingAccount(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('accounts.archiveConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('accounts.archiveConfirmBody', { name: archivingAccount?.name ?? '' })}
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setArchivingAccount(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmArchive} isLoading={archiveAccount.isPending}>
              {t('accounts.archiveConfirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter / Sort bar */}
      {!isLoading && activeAccounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AccountType | 'all')}
            className={selectClass}
          >
            <option value="all">{t('accounts.allTypes')}</option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`accounts.types.${type}`)}
              </option>
            ))}
          </select>

          {institutions.length > 0 && (
            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">{t('accounts.allInstitutions')}</option>
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
            <option value="all">{t('accounts.assetsAndLiabilities')}</option>
            <option value="assets">{t('accounts.assetsOnly')}</option>
            <option value="liabilities">{t('accounts.liabilitiesOnly')}</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className={selectClass}
          >
            <option value="name-asc">{t('accounts.nameAZ')}</option>
            <option value="name-desc">{t('accounts.nameZA')}</option>
            <option value="balance-desc">{t('accounts.balanceDesc')}</option>
            <option value="balance-asc">{t('accounts.balanceAsc')}</option>
            <option value="type">{t('common.type')}</option>
            <option value="rate-desc">{t('accounts.rateDesc')}</option>
            <option value="rate-asc">{t('accounts.rateAsc')}</option>
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
              {t('accounts.reset')}
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
              <p className="text-sm">{t('accounts.empty')}</p>
            </div>
          )}

          {myAccounts.length === 0 && sharedAccounts.length === 0 && activeAccounts.length > 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">{t('accounts.noMatch')}</p>
            </div>
          )}

          {hasSharedAccounts && myAccounts.length > 0 && (
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              {t('household.share.myAccounts')}
            </h2>
          )}
          <div className="space-y-3">
            {myAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={() => openEdit(account)}
                onArchive={() => handleArchive(account)}
                onShare={() => setSharingAccount(account)}
              />
            ))}
          </div>

          {hasSharedAccounts && (
            <div className={myAccounts.length > 0 ? 'mt-6' : undefined}>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {t('household.share.sharedWithMe')}
              </h2>
              <div className="space-y-3">
                {sharedAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </div>
          )}

          {archivedAccounts.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                {archivedAccounts.length} {t('accounts.archived').toLowerCase()}
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
