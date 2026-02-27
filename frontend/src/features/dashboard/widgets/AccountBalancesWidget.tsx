import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { AccountCard } from '@features/core/components/AccountCard';

interface Props {
  excludedAccountIds: string[];
}

export function AccountBalancesWidget({ excludedAccountIds }: Props) {
  const { t } = useTranslation();
  const { data: accounts = [], isLoading } = useAccounts();

  const visible = accounts.filter((a) => a.isActive && !excludedAccountIds.includes(a.id));

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{t('dashboard.accounts')}</h2>
        <Link to="/accounts" className="text-sm text-blue-600 hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[220px] h-28 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('dashboard.noAccounts')}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 flex-1 items-start">
          {visible.map((account) => (
            <div key={account.id} className="min-w-[220px]">
              <AccountCard account={account} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
