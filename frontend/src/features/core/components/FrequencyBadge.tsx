import { useTranslation } from 'react-i18next';
import type { BudgetLineFrequency } from '../types';

interface FrequencyBadgeProps {
  frequency: BudgetLineFrequency;
  interval?: number | null;
  dayOfMonth1?: number | null;
  dayOfMonth2?: number | null;
}

export function FrequencyBadge({ frequency, interval, dayOfMonth1, dayOfMonth2 }: FrequencyBadgeProps) {
  const { t } = useTranslation();

  function label(): string {
    switch (frequency) {
      case 'weekly':        return t('budgetLine.weekly');
      case 'biweekly':      return t('budgetLine.biweekly');
      case 'semi_monthly':  return t('budgetLine.semiMonthly');
      case 'twice_monthly': {
        const d1 = dayOfMonth1 === 31 ? 'last' : String(dayOfMonth1 ?? '?');
        const d2 = dayOfMonth2 === 31 ? 'last' : String(dayOfMonth2 ?? '?');
        return t('budgetLine.twiceMonthlyFull', { d1, d2 });
      }
      case 'monthly':       return t('budgetLine.monthly');
      case 'annually':      return t('budgetLine.annually');
      case 'every_n_days':  return interval
        ? t('budgetLine.everyNDaysFull', { count: interval })
        : t('budgetLine.everyNDays');
      case 'one_time':      return t('budgetLine.oneTime');
    }
  }

  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {label()}
    </span>
  );
}
