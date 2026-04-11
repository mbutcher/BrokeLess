import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark, CreditCard, TrendingDown } from 'lucide-react';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useFormatters } from '@lib/i18n/useFormatters';
import { WidgetShell } from '../components/WidgetShell';
import type { Account } from '@features/core/types';

interface Props {
  excludedAccountIds: string[];
}

function typeIcon(type: Account['type']) {
  if (type === 'credit_card') return <CreditCard className="h-3.5 w-3.5" />;
  if (type === 'loan' || type === 'mortgage' || type === 'line_of_credit') {
    return <TrendingDown className="h-3.5 w-3.5" />;
  }
  return <Landmark className="h-3.5 w-3.5" />;
}

function AccountMiniCard({ account }: { account: Account }) {
  const { currency: fmt } = useFormatters();
  const balance = account.isAsset ? account.currentBalance : -account.currentBalance;
  const isNegative = balance < 0;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground flex-shrink-0">{typeIcon(account.type)}</span>
        <p className="text-sm text-foreground truncate">{account.name}</p>
      </div>
      <p
        className={`ml-3 text-sm font-semibold tabular-nums flex-shrink-0 ${
          isNegative ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {fmt(balance)}
      </p>
    </div>
  );
}

export function AccountBalancesWidget({ excludedAccountIds }: Props) {
  const { t } = useTranslation();
  const { data: accounts = [], isLoading } = useAccounts();

  const visible = accounts.filter((a) => a.isActive && !excludedAccountIds.includes(a.id));
  const assets = visible.filter((a) => a.isAsset && a.type !== 'credit_card');
  const creditCards = visible.filter((a) => a.type === 'credit_card');
  const liabilities = visible.filter((a) => !a.isAsset && a.type !== 'credit_card');

  return (
    <WidgetShell
      id="account-balances"
      title={t('dashboard.accounts')}
      scrollable
      actions={
        <Link to="/accounts" className="text-sm text-primary hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noAccounts')}</p>
      ) : (
        <>
          {assets.length > 0 && (
            <div className="mb-3">
              {assets.map((a) => (
                <AccountMiniCard key={a.id} account={a} />
              ))}
            </div>
          )}
          {creditCards.length > 0 && (
            <div className="mb-3">
              {creditCards.map((a) => (
                <AccountMiniCard key={a.id} account={a} />
              ))}
            </div>
          )}
          {liabilities.length > 0 && (
            <div>
              {liabilities.map((a) => (
                <AccountMiniCard key={a.id} account={a} />
              ))}
            </div>
          )}
        </>
      )}
    </WidgetShell>
  );
}
