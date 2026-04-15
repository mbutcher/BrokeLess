import { useTranslation } from 'react-i18next';
import { useAccounts } from '@features/core/hooks/useAccounts';
import type { DashboardConfig } from '../types/dashboard';

interface Props {
  config: DashboardConfig;
  onToggleAccount: (accountId: string, excluded: boolean) => void;
}

export function AccountBalancesSettings({ config, onToggleAccount }: Props) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const activeAccounts = accounts.filter((a) => a.isActive);

  if (activeAccounts.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {t('dashboard.accountFilter')}
      </p>
      <p className="text-xs text-muted-foreground mb-3">{t('dashboard.accountFilterHint')}</p>
      <div className="space-y-3">
        {activeAccounts.map((acct) => {
          const excluded = config.excludedAccountIds.includes(acct.id);
          return (
            <label key={acct.id} className="flex items-center justify-between cursor-pointer">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{acct.name}</p>
                {acct.institution && (
                  <p className="text-xs text-muted-foreground truncate">{acct.institution}</p>
                )}
              </div>
              <input
                type="checkbox"
                checked={!excluded}
                onChange={(e) => onToggleAccount(acct.id, !e.target.checked)}
                className="ml-3 rounded border-border text-primary focus:ring-primary flex-shrink-0"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
