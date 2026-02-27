import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSavingsGoals, useSavingsGoalProgress } from '@features/core/hooks/useSavingsGoals';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { SavingsGoal } from '@features/core/types';

function GoalMiniCard({ goal }: { goal: SavingsGoal }) {
  const { data: progress } = useSavingsGoalProgress(goal.id);
  const { currency: fmt } = useFormatters();
  const pct = progress?.percentComplete ?? 0;
  const current = progress?.currentAmount ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-gray-900 truncate">{goal.name}</p>
        <p className="ml-2 text-xs text-gray-500 flex-shrink-0">
          {fmt(current)} / {fmt(goal.targetAmount)}
        </p>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function SavingsGoalsWidget() {
  const { t } = useTranslation();
  const { data: goals = [] } = useSavingsGoals();
  const topGoals = goals.slice(0, 3);

  if (topGoals.length === 0) return null;

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{t('dashboard.savingsGoals')}</h2>
        <Link to="/savings-goals" className="text-sm text-blue-600 hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      </div>
      <div className="space-y-4 flex-1 overflow-hidden">
        {topGoals.map((goal) => (
          <GoalMiniCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
