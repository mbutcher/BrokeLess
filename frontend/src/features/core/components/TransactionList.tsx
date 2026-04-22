import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { TransactionListItem } from './TransactionListItem';
import type { Transaction, TransactionFilters } from '../types';

interface TransactionListProps {
  filters?: TransactionFilters;
  onEdit?: (tx: Transaction) => void;
  onPageChange?: (page: number) => void;
}

export function TransactionList({ filters, onEdit, onPageChange }: TransactionListProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useTransactions(filters);
  const { data: accounts = [] } = useAccounts();

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-sm p-4">Failed to load transactions.</div>;
  }

  const transactions = data?.data ?? [];

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No transactions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => (
        <TransactionListItem
          key={tx.id}
          transaction={tx}
          account={accountMap[tx.accountId]}
          onEdit={onEdit}
        />
      ))}

      {data && data.total > 0 && onPageChange && (() => {
        const totalPages = Math.ceil(data.total / data.limit);
        const currentPage = data.page;
        return (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {t('transactions.showing', { count: data.data.length, total: data.total })}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-muted"
                  aria-label={t('transactions.prevPage')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t('transactions.prevPage')}
                </button>
                <span className="text-xs text-muted-foreground">
                  {t('transactions.page', { page: currentPage, totalPages })}
                </span>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-muted"
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
