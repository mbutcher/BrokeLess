import type { BudgetLineFlexibility } from '../types';

interface FlexibilityBadgeProps {
  flexibility: BudgetLineFlexibility;
}

export function FlexibilityBadge({ flexibility }: FlexibilityBadgeProps) {
  if (flexibility === 'fixed') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        fixed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-transparent text-gray-500 border border-gray-300">
      flexible
    </span>
  );
}
