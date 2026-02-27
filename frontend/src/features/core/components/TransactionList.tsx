import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@lib/utils';
import { useTransactions, useDeleteTransaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { CategoryBadge } from './CategoryBadge';
import type { Transaction, TransactionFilters } from '../types';

interface TransactionListProps {
  filters?: TransactionFilters;
  onEdit?: (tx: Transaction) => void;
  onPageChange?: (page: number) => void;
}

export function TransactionList({ filters, onEdit, onPageChange }: TransactionListProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useTransactions(filters);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const deleteTx = useDeleteTransaction();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-sm p-4">Failed to load transactions.</div>;
  }

  const transactions = data?.data ?? [];

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No transactions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => {
        const isExpense = tx.amount < 0;
        const category = tx.categoryId ? categoryMap[tx.categoryId] : null;
        const account = accountMap[tx.accountId];

        return (
          <div
            key={tx.id}
            className={cn(
              'bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3',
              tx.isTransfer && 'border-l-4 border-l-purple-400'
            )}
          >
            {/* Amount indicator */}
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isExpense ? 'bg-red-400' : 'bg-green-400')} />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tx.payee ?? tx.description ?? 'No description'}
                    {tx.isTransfer && (
                      <span className="ml-2 text-xs text-purple-500 font-normal">⇄ transfer</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{tx.date.split('T')[0]}</span>
                    {account && <span className="text-xs text-gray-400">· {account.name}</span>}
                    <CategoryBadge category={category} />
                    {tx.isCleared && <span className="text-xs text-green-500">✓</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn('text-sm font-semibold tabular-nums', isExpense ? 'text-gray-900' : 'text-green-600')}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </span>
                  <div className="flex gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(tx)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        Edit
                      </button>
                    )}
                    {confirmDeleteId === tx.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            await deleteTx.mutateAsync(tx.id);
                            setConfirmDeleteId(null);
                          }}
                          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-gray-400 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(tx.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {data && data.total > 0 && onPageChange && (() => {
        const totalPages = Math.ceil(data.total / data.limit);
        const currentPage = data.page;
        return (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {t('transactions.showing', { count: data.data.length, total: data.total })}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-gray-100"
                  aria-label={t('transactions.prevPage')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t('transactions.prevPage')}
                </button>
                <span className="text-xs text-gray-400">
                  {t('transactions.page', { page: currentPage, totalPages })}
                </span>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-gray-100"
                  aria-label={t('transactions.nextPage')}
                >
                  {t('transactions.nextPage')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
