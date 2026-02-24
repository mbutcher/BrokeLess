import { Pencil, Archive, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@lib/utils';
import { useAuthStore } from '@features/auth/stores/authStore';
import { useFormatters } from '@lib/i18n/useFormatters';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { ACCOUNT_TYPE_LABELS } from '../constants';
import type { Account } from '../types';

interface AccountCardProps {
  account: Account;
  onEdit?: () => void;
  onArchive?: () => void;
  className?: string;
}

export function AccountCard({ account, onEdit, onArchive, className }: AccountCardProps) {
  const defaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'CAD');
  const { currency: formatCurrency } = useFormatters();
  const showConversion = account.currency.toUpperCase() !== defaultCurrency.toUpperCase();
  const { data: rateData } = useExchangeRate(account.currency, defaultCurrency);
  const convertedBalance =
    showConversion && rateData ? Math.abs(account.currentBalance) * rateData.rate : null;

  return (
    <div
      className={cn(
        'group bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4',
        onEdit && 'cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all',
        className
      )}
      onClick={onEdit}
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
            {account.annualRate != null && (
              <p className="text-xs text-gray-400 mt-0.5">
                {(account.annualRate * 100).toFixed(2)}% APR
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Action buttons — visible on hover for active accounts */}
            {account.isActive && (onEdit || onArchive) && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Edit account"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onArchive && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onArchive(); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Archive account"
                  >
                    <Archive size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="text-right">
              <p className={cn(
                'font-semibold tabular-nums',
                account.currentBalance < 0 ? 'text-red-600' : 'text-gray-900'
              )}>
                {formatCurrency(account.currentBalance, account.currency)}
              </p>
              {convertedBalance != null && (
                <p className="text-xs text-gray-400 tabular-nums">
                  {rateData?.isStale && <span title="Exchange rate may be outdated">⚠ </span>}
                  ~{formatCurrency(convertedBalance)}
                </p>
              )}
              {!account.isActive && (
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    Archived
                  </span>
                  {onArchive && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onArchive(); }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <RotateCcw size={10} />
                      Restore
                    </button>
                  )}
                </div>
              )}
              {['loan', 'mortgage', 'credit_card', 'line_of_credit'].includes(account.type) && account.isActive && (
                <Link
                  to={`/accounts/${account.id}/debt`}
                  className="text-xs text-blue-600 hover:underline mt-0.5 block"
                  onClick={(e) => e.stopPropagation()}
                >
                  Debt detail
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
