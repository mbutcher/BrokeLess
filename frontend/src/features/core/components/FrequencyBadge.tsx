import type { BudgetLineFrequency } from '../types';
import { frequencyLabel } from '@lib/budget/budgetViewUtils';

interface FrequencyBadgeProps {
  frequency: BudgetLineFrequency;
  interval?: number | null;
}

export function FrequencyBadge({ frequency, interval }: FrequencyBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {frequencyLabel(frequency, interval ?? undefined)}
    </span>
  );
}
