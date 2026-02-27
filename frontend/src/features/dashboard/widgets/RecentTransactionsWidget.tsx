import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTransactions } from '@features/core/hooks/useTransactions';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { Transaction } from '@features/core/types';

function TransactionRow({ tx }: { tx: Transaction }) {
  const { currency: fmt } = useFormatters();
  const isPositive = tx.amount > 0;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {tx.payee ?? tx.description ?? '—'}
        </p>
        <p className="text-xs text-gray-400">{tx.date}</p>
      </div>
      <p
        className={`ml-4 text-sm font-semibold tabular-nums flex-shrink-0 ${isPositive ? 'text-green-600' : 'text-gray-900'}`}
      >
        {isPositive ? '+' : ''}{fmt(Math.abs(tx.amount))}
      </p>
    </div>
  );
}

export function RecentTransactionsWidget() {
  const { t } = useTranslation();
  const { data: txData, isLoading } = useTransactions({ limit: 10, page: 1 });
  const transactions = txData?.data ?? [];

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{t('dashboard.recentTransactions')}</h2>
        <Link to="/transactions" className="text-sm text-blue-600 hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{t('dashboard.noTransactions')}</p>
      ) : (
        <div className="flex-1 overflow-auto">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  );
}
