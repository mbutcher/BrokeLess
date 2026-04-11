import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSavingsGoals, useSavingsGoalProgress } from '@features/core/hooks/useSavingsGoals';
import { useFormatters } from '@lib/i18n/useFormatters';
import { WidgetShell } from '../components/WidgetShell';
import type { SavingsGoal } from '@features/core/types';

function GoalMiniCard({ goal }: { goal: SavingsGoal }) {
  const { data: progress } = useSavingsGoalProgress(goal.id);
  const { currency: fmt, date: fmtDate } = useFormatters();
  const { t } = useTranslation();
  const pct = progress?.percentComplete ?? 0;
  const current = progress?.currentAmount ?? 0;

  // Projected completion: if we have a target date, check if behind pace
  const targetDate = goal.targetDate ? new Date(goal.targetDate + 'T00:00:00') : null;
  const isBehindPace =
    targetDate !== null && progress !== undefined && progress.percentComplete < 100 &&
    (() => {
      const today = new Date();
      const totalDays = (targetDate.getTime() - new Date(goal.createdAt).getTime()) / 86400000;
      const elapsedDays = (today.getTime() - new Date(goal.createdAt).getTime()) / 86400000;
      const expectedPct = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
      return progress.percentComplete < expectedPct;
    })();

  return (
    <div className={`pb-3 border-b border-border last:border-0 last:pb-0 ${isBehindPace ? 'rounded-lg bg-warning/5 px-2 py-2 -mx-2' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-foreground truncate">{goal.name}</p>
        <p className="ml-2 text-xs text-muted-foreground flex-shrink-0">
          {fmt(current)} / {fmt(goal.targetAmount)}
        </p>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full ${isBehindPace ? 'bg-warning' : 'bg-success'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        {isBehindPace ? (
          <span className="text-warning font-medium">{t('dashboard.behindPace')}</span>
        ) : (
          <span className="text-muted-foreground">{Math.round(pct)}%</span>
        )}
        {targetDate && (
          <span className="text-muted-foreground">{t('dashboard.projectedCompletion', { date: fmtDate(goal.targetDate!) })}</span>
        )}
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
    <WidgetShell
      id="savings-goals"
      title={t('dashboard.savingsGoals')}
      scrollable
      actions={
        <Link to="/savings-goals" className="text-sm text-primary hover:underline">
          {t('dashboard.viewAll')}
        </Link>
      }
    >
      <div className="space-y-3">
        {topGoals.map((goal) => (
          <GoalMiniCard key={goal.id} goal={goal} />
        ))}
      </div>
    </WidgetShell>
  );
}
