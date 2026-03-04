import { Pencil, Archive, RotateCcw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@lib/utils';
import { useAuthStore } from '@features/auth/stores/authStore';
import { useFormatters } from '@lib/i18n/useFormatters';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { LIABILITY_TYPES } from '../constants';
import type { Account } from '../types';

interface AccountCardProps {
  account: Account;
  onEdit?: () => void;
  onArchive?: () => void;
  onShare?: () => void;
  className?: string;
}

export function AccountCard({ account, onEdit, onArchive, onShare, className }: AccountCardProps) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const defaultCurrency = useAuthStore((s) => s.user?.defaultCurrency ?? 'CAD');
  const { currency: formatCurrency } = useFormatters();
  const showConversion = account.currency.toUpperCase() !== defaultCurrency.toUpperCase();
  const { data: rateData } = useExchangeRate(account.currency, defaultCurrency);
  const convertedBalance =
    showConversion && rateData ? Math.abs(account.currentBalance) * rateData.rate : null;
  const isShared = account.userId !== currentUserId;

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
        {/* Row 1: name + actions + balance */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-medium text-gray-900 truncate">{account.name}</p>
            {isShared && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary shrink-0">
                {t('household.share.sharedBadge')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Action buttons — visible on hover for active accounts */}
            {account.isActive && (onEdit || onArchive || onShare) && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onShare && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    title={t('household.share.manageTitle')}
                  >
                    <Users size={14} />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title={t('accounts.editAccount')}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onArchive && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onArchive(); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title={t('accounts.archiveAccount')}
                  >
                    <Archive size={14} />
                  </button>
                )}
              </div>
            )}
            <p className={cn(
              'font-semibold tabular-nums text-right',
              account.currentBalance < 0 ? 'text-red-600' : 'text-gray-900'
            )}>
              {formatCurrency(account.currentBalance, account.currency)}
            </p>
          </div>
        </div>

        {/* Row 2: meta info + secondary balance */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="text-sm text-gray-500 overflow-hidden flex items-center gap-1 min-w-0">
            <span className="truncate">{t(`accounts.types.${account.type}`)}</span>
            {account.institution && <span className="shrink-0">· {account.institution}</span>}
            {account.annualRate != null && (
              <span className="text-xs text-gray-400 shrink-0">· {(account.annualRate * 100).toFixed(2)}% APR</span>
            )}
            {LIABILITY_TYPES.includes(account.type) && account.isActive && (
              <Link
                to={`/accounts/${account.id}/debt`}
                className="text-xs text-blue-600 hover:underline shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                · {t('accounts.debtDetail')}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-gray-400 tabular-nums">
            {convertedBalance != null && (
              <span>
                {rateData?.isStale && <span title="Exchange rate may be outdated">⚠ </span>}
                ~{formatCurrency(convertedBalance)}
              </span>
            )}
            {!account.isActive && (
              <>
                <span className="bg-gray-100 px-1.5 py-0.5 rounded">{t('accounts.archived')}</span>
                {onArchive && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onArchive(); }}
                    className="text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <RotateCcw size={10} />
                    {t('accounts.restore')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
