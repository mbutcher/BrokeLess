import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '../hooks/useAccounts';
import { AccountCard } from '../components/AccountCard';
import { AccountForm } from '../components/AccountForm';
import { useExchangeRates } from '../hooks/useExchangeRate';
import { useAuthStore } from '@features/auth/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { ManageSharesDialog } from '@features/household/components/ManageSharesDialog';
import { DebtDetailModal } from './DebtDetailPage';
import type { Account } from '../types';

type SortKey = 'name' | 'type' | 'institution';

const selectClass =
  'border border-border rounded-lg px-2 py-1.5 text-xs text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring';

export function AccountsPage() {
  const { t } = useTranslation();
  const [showArchived, setShowArchived] = useState(false);
  const { data: accounts = [], isLoading } = useAccounts(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [sharingAccount, setSharingAccount] = useState<Account | null>(null);
  const [debtModalAccountId, setDebtModalAccountId] = useState<string | null>(null);

  // Sort state
  const [sortBy, setSortBy] = useState<SortKey>('name');

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

  const sortAccounts = useCallback(
    (list: Account[]): Account[] => {
      const sorted = [...list];
      switch (sortBy) {
        case 'name':
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'type':
          sorted.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
          break;
        case 'institution':
          sorted.sort((a, b) => {
            const instA = a.institution ?? '';
            const instB = b.institution ?? '';
            return instA.localeCompare(instB) || a.name.localeCompare(b.name);
          });
          break;
      }
      return sorted;
    },
    [sortBy]
  );

  const sortedActive = useMemo(() => sortAccounts(activeAccounts), [activeAccounts, sortAccounts]);
  const sortedArchived = useMemo(
    () => sortAccounts(archivedAccounts),
    [archivedAccounts, sortAccounts]
  );

  const myAccounts = sortedActive.filter((a) => a.userId === currentUserId);
  const sharedAccounts = sortedActive.filter((a) => a.userId !== currentUserId);
  const hasSharedAccounts = sharedAccounts.length > 0;

  function openEdit(account: Account) {
    setEditing(account);
    setShowForm(false);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
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
            onShare={editing ? () => { setSharingAccount(editing); } : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Sort bar + archived toggle */}
      {!isLoading && activeAccounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className={selectClass}
          >
            <option value="name">{t('accounts.sortName')}</option>
            <option value="type">{t('accounts.sortType')}</option>
            <option value="institution">{t('accounts.sortInstitution')}</option>
          </select>

          {archivedAccounts.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">
                {t('accounts.showArchived', { count: archivedAccounts.length })}
              </span>
            </label>
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
                onClick={() => openEdit(account)}
                onDebtDetailClick={setDebtModalAccountId}
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
                  <AccountCard
                    key={account.id}
                    account={account}
                    onClick={() => openEdit(account)}
                    onDebtDetailClick={setDebtModalAccountId}
                  />
                ))}
              </div>
            </div>
          )}

          {showArchived && sortedArchived.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {t('accounts.archived')}
              </h2>
              <div className="space-y-3">
                {sortedArchived.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onClick={() => openEdit(account)}
                    onDebtDetailClick={setDebtModalAccountId}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <DebtDetailModal
        accountId={debtModalAccountId}
        open={debtModalAccountId !== null}
        onClose={() => setDebtModalAccountId(null)}
      />
    </div>
  );
}
