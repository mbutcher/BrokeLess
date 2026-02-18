import { cn } from '@lib/utils';
import type { Budget, BudgetProgress } from '../types';

interface BudgetCardProps {
  budget: Budget;
  progress?: BudgetProgress;
  onClick?: () => void;
}

export function BudgetCard({ budget, progress, onClick }: BudgetCardProps) {
  const pct = progress && progress.totalAllocated > 0
    ? Math.min((progress.totalSpent / progress.totalAllocated) * 100, 100)
    : 0;

  const isOverBudget = progress ? progress.totalSpent > progress.totalAllocated : false;

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-4',
        onClick && 'cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{budget.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {budget.startDate.split('T')[0]} → {budget.endDate.split('T')[0]}
          </p>
        </div>
        {!budget.isActive && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactive</span>
        )}
      </div>

      {progress ? (
        <>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={cn('h-full rounded-full transition-all', isOverBudget ? 'bg-red-500' : 'bg-blue-500')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span className={isOverBudget ? 'text-red-600 font-medium' : undefined}>
              ${progress.totalSpent.toFixed(2)} spent
            </span>
            <span>${progress.totalAllocated.toFixed(2)} budgeted</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400">No spending data</p>
      )}
    </div>
  );
}
