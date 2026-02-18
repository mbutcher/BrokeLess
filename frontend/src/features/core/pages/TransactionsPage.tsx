import { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useCreateTransaction } from '../hooks/useTransactions';
import { TransactionList } from '../components/TransactionList';
import { TransactionForm } from '../components/TransactionForm';
import { TransferLinkingDialog } from '../components/TransferLinkingDialog';
import type { Transaction, TransactionFilters, TransferCandidate } from '../types';

export function TransactionsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingLink, setPendingLink] = useState<{ txId: string; candidates: TransferCandidate[] } | null>(null);

  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 50 });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          + Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Account</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            value={filters.accountId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All accounts</option>
            {accounts.filter((a) => a.isActive).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All categories</option>
            {categories.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            value={filters.startDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value || undefined, page: 1 }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            value={filters.endDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value || undefined, page: 1 }))}
          />
        </div>
      </div>

      {/* Form panel */}
      {(showForm || editing) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editing ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <TransactionForm
            transaction={editing ?? undefined}
            onSuccess={() => { setShowForm(false); setEditing(null); }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      <TransactionList
        filters={filters}
        onEdit={(tx) => { setEditing(tx); setShowForm(false); }}
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
