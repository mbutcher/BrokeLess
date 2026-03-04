import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useSavingsGoals, useSavingsGoalProgress } from '@features/core/hooks/useSavingsGoals';
import { useDashboardHints } from '../hooks/useDashboardConfig';
import { RolloverReviewDialog } from '@features/core/components/RolloverReviewDialog';
import { AnnualBudgetReviewDialog } from '@features/core/components/AnnualBudgetReviewDialog';

interface Warning {
  id: string;
  message: string;
}

function useAccountWarnings(excludedAccountIds: string[]): Warning[] {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();

  const warnings: Warning[] = [];

  const negativeAssets = accounts.filter(
    (a) => a.isActive && a.isAsset && a.currentBalance < 0 && !excludedAccountIds.includes(a.id),
  );
  for (const acct of negativeAssets) {
    warnings.push({
      id: `neg-${acct.id}`,
      message: t('dashboard.warningNegativeBalance', { name: acct.name }),
    });
  }

  return warnings;
}

interface GoalWarningProps {
  goalId: string;
  goalName: string;
  targetDate: string;
  onActiveChange: (id: string, active: boolean) => void;
}

function GoalDeadlineWarning({ goalId, goalName, targetDate, onActiveChange }: GoalWarningProps) {
  const { t } = useTranslation();
  const { data: progress } = useSavingsGoalProgress(goalId);
  const daysLeft = Math.ceil(
    (new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const pct = progress?.percentComplete ?? -1;
  const expectedPct = daysLeft <= 30 ? ((30 - daysLeft) / 30) * 100 : Infinity;
  const isActive = Boolean(progress && daysLeft <= 30 && daysLeft >= 0 && pct < expectedPct);

  useEffect(() => {
    onActiveChange(goalId, isActive);
    return () => onActiveChange(goalId, false);
  }, [goalId, isActive, onActiveChange]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 text-warning text-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{t('dashboard.warningGoalBehindPace', { name: goalName, count: daysLeft })}</span>
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
  const { data: hints = [] } = useDashboardHints();
  const goalsWithDeadlines = goals.filter((g) => g.targetDate);
  const [collapsed, setCollapsed] = useState(false);
  const [activeGoalWarnings, setActiveGoalWarnings] = useState<Set<string>>(new Set());
  const [rolloverPeriod, setRolloverPeriod] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [annualReviewOpen, setAnnualReviewOpen] = useState(false);

  const rolloverHint = hints.find((h) => h.id === 'unreviewed-rollover');
  const annualReviewHint = hints.find((h) => h.id === 'annual-budget-review');

  const handleGoalActiveChange = useCallback((id: string, active: boolean) => {
    setActiveGoalWarnings((prev) => {
      if (prev.has(id) === active) return prev;
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const hasContent =
    warnings.length > 0 ||
    activeGoalWarnings.size > 0 ||
    !!rolloverHint ||
    !!annualReviewHint;

  return (
    <>
      {hasContent && (
        <div className="mb-4 bg-warning/10 border border-warning/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-between px-5 py-3 text-warning font-medium text-sm hover:bg-warning/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{t('dashboard.warningsTitle')}</span>
            </div>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {!collapsed && (
            <div className="px-5 pb-3 space-y-2">
              {warnings.map((w) => (
                <div key={w.id} className="flex items-center gap-2 text-warning text-sm">
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
                  onActiveChange={handleGoalActiveChange}
                />
              ))}
              {rolloverHint && (
                <div className="flex items-center justify-between gap-2 text-warning text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{t('dashboard.warningRolloverPending')}</span>
                  </div>
                  <button
                    onClick={() =>
                      setRolloverPeriod({
                        start: rolloverHint.meta?.['previousStart'] ?? '',
                        end: rolloverHint.meta?.['previousEnd'] ?? '',
                      })
                    }
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    {t('dashboard.reviewRollover')}
                  </button>
                </div>
              )}
              {annualReviewHint && (
                <div className="flex items-center justify-between gap-2 text-warning text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{t('dashboard.warningAnnualReviewDue')}</span>
                  </div>
                  <button
                    onClick={() => setAnnualReviewOpen(true)}
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    {t('dashboard.reviewBudget')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {rolloverPeriod && (
        <RolloverReviewDialog
          open
          previousStart={rolloverPeriod.start}
          previousEnd={rolloverPeriod.end}
          onClose={() => setRolloverPeriod(null)}
        />
      )}
      <AnnualBudgetReviewDialog open={annualReviewOpen} onClose={() => setAnnualReviewOpen(false)} />
    </>
  );
}
