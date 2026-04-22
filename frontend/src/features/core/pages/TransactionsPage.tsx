import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';

function DateFilterInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="date"
        className="w-full border border-border rounded-lg pl-8 pr-2 py-1.5 text-sm bg-background text-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
import { useAccounts } from '../hooks/useAccounts';
import { useAllTags } from '../hooks/useTransactions';
import { TransactionList } from '../components/TransactionList';
import { TransactionForm } from '../components/TransactionForm';
import { TransferLinkingDialog } from '../components/TransferLinkingDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { useNetworkStore } from '@stores/networkStore';
import type { Transaction, TransactionFilters, TransferCandidate } from '../types';

export function TransactionsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { data: accounts = [] } = useAccounts();
  const { data: allTags = [] } = useAllTags();
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingLink, setPendingLink] = useState<{ txId: string; candidates: TransferCandidate[] } | null>(null);

  const initialQ = searchParams.get('q') ?? '';
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 50,
    q: initialQ || undefined,
    tag: searchParams.get('tag') || undefined,
    accountId: searchParams.get('accountId') || undefined,
    budgetLineId: searchParams.get('budgetLineId') || undefined,
  });
  const [searchInput, setSearchInput] = useState(initialQ);

  // Sync URL-driven filters when navigation changes params while component is already mounted
  // (e.g. navigating from budget page "View Transactions" while already on /transactions)
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      tag: searchParams.get('tag') || undefined,
      accountId: searchParams.get('accountId') || undefined,
      budgetLineId: searchParams.get('budgetLineId') || undefined,
      page: 1,
    }));
  }, [searchParams]);

  // Debounce search input → update filters.q after 300 ms idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q: searchInput.trim() || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('transactions.title')}</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          {t('transactions.addTransaction')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('transactions.filterAccount')}</label>
            <select
              className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground"
              value={filters.accountId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value || undefined, page: 1 }))}
            >
              <option value="">{t('transactions.allAccounts')}</option>
              {accounts.filter((a) => a.isActive).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs text-muted-foreground mb-1">{t('transactions.filterFrom')}</label>
            <DateFilterInput
              value={filters.startDate ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, startDate: v || undefined, page: 1 }))}
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs text-muted-foreground mb-1">{t('transactions.filterTo')}</label>
            <DateFilterInput
              value={filters.endDate ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, endDate: v || undefined, page: 1 }))}
            />
          </div>
        </div>

        {/* Search + tag row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('transactions.searchPlaceholder')}</label>
            <div className="relative">
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm pr-8 bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={isOnline ? t('transactions.searchPlaceholderShort') : t('transactions.searchOffline')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={!isOnline}
                title={!isOnline ? t('transactions.searchOffline') : undefined}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('transactions.filterTag')}</label>
            <select
              className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground"
              value={filters.tag ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value || undefined, page: 1 }))}
            >
              <option value="">{t('transactions.allTags')}</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Dialog
        open={showForm || editing !== null}
        onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('transactions.editTransaction') : t('transactions.newTransaction')}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            transaction={editing ?? undefined}
            onSuccess={() => { setShowForm(false); setEditing(null); }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      <TransactionList
        filters={filters}
        onEdit={(tx) => { setEditing(tx); setShowForm(false); }}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      {pendingLink && (
        <TransferLinkingDialog
          transactionId={pendingLink.txId}
          candidates={pendingLink.candidates}
          onDismiss={() => setPendingLink(null)}
        />
      )}
    </div>
  );
}
