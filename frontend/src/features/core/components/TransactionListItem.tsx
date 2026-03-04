import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@lib/utils';
import { CategoryBadge } from './CategoryBadge';
import { useDeleteTransaction } from '../hooks/useTransactions';
import type { Transaction } from '../types';
import type { Category } from '../types';
import type { Account } from '../types';

export interface TransactionListItemProps {
  transaction: Transaction;
  category: Category | null;
  account: Account | undefined;
  onEdit?: (tx: Transaction) => void;
}

export function TransactionListItem({ transaction: tx, category, account, onEdit }: TransactionListItemProps) {
  const { t } = useTranslation();
  const deleteTx = useDeleteTransaction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isExpense = tx.amount < 0;

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3',
        tx.isTransfer && 'border-l-4 border-l-purple-400'
      )}
    >
      {/* Amount indicator dot */}
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isExpense ? 'bg-destructive/70' : 'bg-green-400')} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {tx.payee ?? tx.description ?? t('transactions.noDescription')}
              {tx.isTransfer && (
                <span className="ml-2 text-xs text-purple-500 font-normal">⇄ {t('transactions.transfer')}</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{tx.date.split('T')[0]}</span>
              {account && <span className="text-xs text-muted-foreground">· {account.name}</span>}
              <CategoryBadge category={category} />
              {tx.isCleared && <span className="text-xs text-green-500">✓</span>}
              {tx.tags?.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                  #{tag}
                </span>
              ))}
              {(tx.tags?.length ?? 0) > 3 && (
                <span className="text-xs text-muted-foreground">+{tx.tags!.length - 3}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn('text-sm font-semibold tabular-nums', isExpense ? 'text-destructive' : 'text-green-600')}>
              {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
            </span>
            <div className="flex gap-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(tx)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
                >
                  {t('common.edit')}
                </button>
              )}
              {confirmDelete ? (
                <div className="flex gap-1">
                  <button
                    onClick={async () => {
                      await deleteTx.mutateAsync(tx.id);
                      setConfirmDelete(false);
                    }}
                    className="text-xs text-destructive hover:text-destructive/80 px-2 py-1 rounded hover:bg-destructive/10"
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-muted-foreground px-2 py-1 rounded hover:bg-muted"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted"
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
