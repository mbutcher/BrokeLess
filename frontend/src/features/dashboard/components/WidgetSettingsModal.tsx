import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { WIDGET_META } from '../widgetRegistry';
import { AccountBalancesSettings } from './AccountBalancesSettings';
import type { DashboardConfig, WidgetId } from '../types/dashboard';

interface Props {
  widgetId: WidgetId | null;
  config: DashboardConfig;
  onToggleAccount: (accountId: string, excluded: boolean) => void;
  onClose: () => void;
}

export function WidgetSettingsModal({ widgetId, config, onToggleAccount, onClose }: Props) {
  const { t } = useTranslation();

  const meta = widgetId ? WIDGET_META.find((m) => m.id === widgetId) : undefined;
  const title = meta ? t(meta.labelKey) : '';

  return (
    <Dialog open={widgetId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dashboard.widgetSettings', { widget: title })}</DialogTitle>
        </DialogHeader>
        {widgetId === 'account-balances' && (
          <AccountBalancesSettings config={config} onToggleAccount={onToggleAccount} />
        )}
      </DialogContent>
    </Dialog>
  );
}
