import { useTranslation } from 'react-i18next';
import { UpcomingExpenses } from '../components/UpcomingExpenses';
import { WidgetShell } from '../components/WidgetShell';

export function UpcomingExpensesWidget() {
  const { t } = useTranslation();
  return (
    <WidgetShell id="upcoming-expenses" title={t('dashboard.upcomingTitle')} scrollable>
      <UpcomingExpenses />
    </WidgetShell>
  );
}
