import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { WIDGET_META } from '../widgetRegistry';
import type { DashboardConfig, WidgetId } from '../types/dashboard';

interface Props {
  config: DashboardConfig;
  onToggleWidget: (id: WidgetId, enabled: boolean) => void;
  onToggleAccount: (accountId: string, excluded: boolean) => void;
  onClose: () => void;
}

export function WidgetTray({ config, onToggleWidget, onToggleAccount, onClose }: Props) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{t('dashboard.editDashboard')}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Widget toggles */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            {t('dashboard.widgets.title')}
          </p>
          <div className="space-y-3">
            {WIDGET_META.map((meta) => {
              const enabled = config.widgetVisibility[meta.id];
              return (
                <label
                  key={meta.id}
                  className={`flex items-center justify-between ${meta.alwaysOn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-sm text-gray-700">{t(meta.labelKey)}</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={meta.alwaysOn}
                    onChange={(e) => onToggleWidget(meta.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Account filter */}
        {activeAccounts.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              {t('dashboard.accountFilter')}
            </p>
            <p className="text-xs text-gray-400 mb-3">{t('dashboard.accountFilterHint')}</p>
            <div className="space-y-3">
              {activeAccounts.map((acct) => {
                const excluded = config.excludedAccountIds.includes(acct.id);
                return (
                  <label key={acct.id} className="flex items-center justify-between cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">{acct.name}</p>
                      {acct.institution && (
                        <p className="text-xs text-gray-400 truncate">{acct.institution}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={(e) => onToggleAccount(acct.id, !e.target.checked)}
                      className="ml-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
