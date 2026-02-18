import { cn } from '@lib/utils';
import type { Account } from '../types';

const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  loan: 'Loan',
  mortgage: 'Mortgage',
  investment: 'Investment',
  other: 'Other',
};

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
  className?: string;
}

export function AccountCard({ account, onClick, className }: AccountCardProps) {
  const isNegative = account.currentBalance < 0;

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4',
        onClick && 'cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all',
        className
      )}
      onClick={onClick}
    >
      {/* Color indicator */}
      <div
        className="w-3 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: account.color ?? '#6b7280' }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{account.name}</p>
            <p className="text-sm text-gray-500">
              {ACCOUNT_TYPE_LABELS[account.type]}
              {account.institution && ` · ${account.institution}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={cn('font-semibold tabular-nums', isNegative ? 'text-red-600' : 'text-gray-900')}>
              {isNegative ? '-' : ''}
              {account.currency} {Math.abs(account.currentBalance).toFixed(2)}
            </p>
            {!account.isActive && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Archived</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
