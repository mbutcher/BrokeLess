import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useSavingsGoals, useSavingsGoalProgress } from '@features/core/hooks/useSavingsGoals';

interface Warning {
  id: string;
  message: string;
}

function useAccountWarnings(excludedAccountIds: string[]): Warning[] {
  const { data: accounts = [] } = useAccounts();

  const warnings: Warning[] = [];

  const negativeAssets = accounts.filter(
    (a) => a.isActive && a.isAsset && a.currentBalance < 0 && !excludedAccountIds.includes(a.id),
  );
  for (const acct of negativeAssets) {
    warnings.push({ id: `neg-${acct.id}`, message: `${acct.name} has a negative balance` });
  }

  return warnings;
}

interface GoalWarningProps {
  goalId: string;
  goalName: string;
  targetDate: string;
}

function GoalDeadlineWarning({ goalId, goalName, targetDate }: GoalWarningProps) {
  const { data: progress } = useSavingsGoalProgress(goalId);
  const daysLeft = Math.ceil(
    (new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (!progress || daysLeft > 30 || daysLeft < 0) return null;
  const pct = progress.percentComplete;
  const expectedPct = 100 - (daysLeft / 30) * (100 - pct);
  if (pct >= expectedPct) return null;

  return (
    <div className="flex items-center gap-2 text-amber-700 text-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>
        Savings goal &quot;{goalName}&quot; is due in {daysLeft} day{daysLeft === 1 ? '' : 's'} and behind pace
      </span>
    </div>
  );
}

interface Props {
  excludedAccountIds: string[];
}

export function WarningsWidget({ excludedAccountIds }: Props) {
  const { t } = useTranslation();
  const warnings = useAccountWarnings(excludedAccountIds);
  const { data: goals = [] } = useSavingsGoals();
  const goalsWithDeadlines = goals.filter((g) => g.targetDate);
  const [collapsed, setCollapsed] = useState(false);

  const hasContent = warnings.length > 0 || goalsWithDeadlines.length > 0;

  if (!hasContent) {
    return (
      <div className="h-full flex items-center px-5 py-3">
        <p className="text-sm text-gray-400">{t('dashboard.noWarnings')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between px-5 py-3 text-amber-800 font-medium text-sm flex-shrink-0 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{t('dashboard.warningsTitle')}</span>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      {!collapsed && (
        <div className="px-5 pb-3 space-y-2 overflow-auto flex-1">
          {warnings.map((w) => (
            <div key={w.id} className="flex items-center gap-2 text-amber-700 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
          {goalsWithDeadlines.map((g) => (
            <GoalDeadlineWarning
              key={g.id}
              goalId={g.id}
              goalName={g.name}
              targetDate={g.targetDate!}
            />
          ))}
        </div>
      )}
    </div>
  );
}
