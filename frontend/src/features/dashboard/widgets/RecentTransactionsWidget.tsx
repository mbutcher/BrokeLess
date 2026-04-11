import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useTransactions } from '@features/core/hooks/useTransactions';
import { useFormatters } from '@lib/i18n/useFormatters';
import { WidgetShell } from '../components/WidgetShell';
import type { Transaction } from '@features/core/types';

function TransactionRow({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const { currency: fmt, date: fmtDate } = useFormatters();
  const isCredit = tx.amount > 0;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {tx.payee ?? tx.description ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground">{fmtDate(tx.date)}</p>
        </div>
      </div>
      <p
        className={`ml-3 text-sm font-semibold tabular-nums flex-shrink-0 ${
          isCredit ? 'text-success' : 'text-destructive'
        }`}
      >
        {isCredit ? '+' : ''}
        {fmt(Math.abs(tx.amount))}
      </p>
      <Link
        to={`/transactions?highlight=${tx.id}`}
        className="ml-1 flex-shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={t('dashboard.viewAll')}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function RecentTransactionsWidget() {
  const { t } = useTranslation();
  const { data: txData, isLoading } = useTransactions({ limit: 10, page: 1 });
  const transactions = txData?.data ?? [];

  return (
    <WidgetShell
      id="recent-transactions"
      title={t('dashboard.recentTransactions')}
      scrollable
      actions={
        <Link to="/transactions" className="text-sm text-primary hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t('dashboard.noTransactions')}</p>
      ) : (
        <>
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </>
      )}
    </WidgetShell>
  );
}
