import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useSavingsGoals, useSavingsGoalProgress } from '@features/core/hooks/useSavingsGoals';
import { useDashboardHints } from '@features/dashboard/hooks/useDashboardConfig';
import { RolloverReviewDialog } from '@features/core/components/RolloverReviewDialog';
import { AnnualBudgetReviewDialog } from '@features/core/components/AnnualBudgetReviewDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@components/ui/dropdown-menu';

// ─── Warning types ───────────────────────────────────────────────────────────

interface Warning {
  id: string;
  message: string;
}

// ─── Account warnings (negative asset balances) ─────────────────────────────

function useAccountWarnings(): Warning[] {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();

  const warnings: Warning[] = [];
  for (const acct of accounts) {
    if (acct.isActive && acct.isAsset && acct.currentBalance < 0) {
      warnings.push({
        id: `neg-${acct.id}`,
        message: t('dashboard.warningNegativeBalance', { name: acct.name }),
      });
    }
  }
  return warnings;
}

// ─── Individual goal warning (needs progress per-goal) ──────────────────────

function GoalWarningRow({
  goalId,
  goalName,
  targetDate,
  onActiveChange,
}: {
  goalId: string;
  goalName: string;
  targetDate: string;
  onActiveChange: (id: string, active: boolean) => void;
}): React.ReactElement | null {
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

// ─── WarningsIndicator ──────────────────────────────────────────────────────

export function WarningsIndicator(): React.ReactElement | null {
  const { t } = useTranslation();
  const accountWarnings = useAccountWarnings();
  const { data: goals = [] } = useSavingsGoals();
  const { data: hints = [] } = useDashboardHints();
  const goalsWithDeadlines = goals.filter((g) => g.targetDate);

  const [open, setOpen] = useState(false);
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

  const hintCount = (rolloverHint ? 1 : 0) + (annualReviewHint ? 1 : 0);
  const totalCount = accountWarnings.length + activeGoalWarnings.size + hintCount;

  if (totalCount === 0) return null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger>
          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-warning hover:bg-warning/10 transition-colors focus:outline-none focus:ring-2 focus:ring-warning/50 focus:ring-offset-2"
            aria-label={t('dashboard.warningsTitle')}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground px-1">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="w-80 p-3 space-y-2">
          <div className="flex items-center gap-2 text-warning font-medium text-sm pb-1 border-b border-border mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span>{t('dashboard.warningsTitle')}</span>
          </div>

          {accountWarnings.map((w) => (
            <div key={w.id} className="flex items-center gap-2 text-warning text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}

          {goalsWithDeadlines.map((g) => (
            <GoalWarningRow
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
                onClick={() => {
                  setOpen(false);
                  setRolloverPeriod({
                    start: rolloverHint.meta?.['previousStart'] ?? '',
                    end: rolloverHint.meta?.['previousEnd'] ?? '',
                  });
                }}
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
                onClick={() => {
                  setOpen(false);
                  setAnnualReviewOpen(true);
                }}
                className="text-xs text-primary hover:underline whitespace-nowrap"
              >
                {t('dashboard.reviewBudget')}
              </button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
