import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
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
  dismissed,
  onActiveChange,
  onDismiss,
}: {
  goalId: string;
  goalName: string;
  targetDate: string;
  dismissed: boolean;
  onActiveChange: (id: string, active: boolean) => void;
  onDismiss: (id: string) => void;
}): React.ReactElement | null {
  const { t } = useTranslation();
  const { data: progress } = useSavingsGoalProgress(goalId);
  const daysLeft = Math.ceil(
    (new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const pct = progress?.percentComplete ?? -1;
  const expectedPct = daysLeft <= 30 ? ((30 - daysLeft) / 30) * 100 : Infinity;
  const isActive = Boolean(progress && daysLeft <= 30 && daysLeft >= 0 && pct < expectedPct);

  const warningId = `goal-${goalId}`;

  useEffect(() => {
    onActiveChange(warningId, isActive && !dismissed);
    return () => onActiveChange(warningId, false);
  }, [warningId, isActive, dismissed, onActiveChange]);

  if (!isActive || dismissed) return null;

  return (
    <div className="flex items-center gap-2 text-warning text-sm group">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{t('dashboard.warningGoalBehindPace', { name: goalName, count: daysLeft })}</span>
      <button
        onClick={() => onDismiss(warningId)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-warning/20 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
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
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
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

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  const dismissAll = useCallback(() => {
    const all = new Set<string>();
    for (const w of accountWarnings) all.add(w.id);
    for (const id of activeGoalWarnings) all.add(id);
    if (rolloverHint) all.add('rollover');
    if (annualReviewHint) all.add('annual-review');
    setDismissed(all);
    setOpen(false);
  }, [accountWarnings, activeGoalWarnings, rolloverHint, annualReviewHint]);

  // Filter account warnings by dismissed state
  const visibleAccountWarnings = accountWarnings.filter((w) => !dismissed.has(w.id));

  const showRollover = !!rolloverHint && !dismissed.has('rollover');
  const showAnnualReview = !!annualReviewHint && !dismissed.has('annual-review');

  const hintCount = (showRollover ? 1 : 0) + (showAnnualReview ? 1 : 0);
  const totalCount = visibleAccountWarnings.length + activeGoalWarnings.size + hintCount;

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
            <span className="flex-1">{t('dashboard.warningsTitle')}</span>
            {totalCount > 1 && (
              <button
                onClick={dismissAll}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss all
              </button>
            )}
          </div>

          {visibleAccountWarnings.map((w) => (
            <div key={w.id} className="flex items-center gap-2 text-warning text-sm group">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{w.message}</span>
              <button
                onClick={() => dismiss(w.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-warning/20 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {goalsWithDeadlines.map((g) => (
            <GoalWarningRow
              key={g.id}
              goalId={g.id}
              goalName={g.name}
              targetDate={g.targetDate!}
              dismissed={dismissed.has(`goal-${g.id}`)}
              onActiveChange={handleGoalActiveChange}
              onDismiss={dismiss}
            />
          ))}

          {showRollover && (
            <div className="flex items-center justify-between gap-2 text-warning text-sm group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t('dashboard.warningRolloverPending')}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setOpen(false);
                    setRolloverPeriod({
                      start: rolloverHint!.meta?.['previousStart'] ?? '',
                      end: rolloverHint!.meta?.['previousEnd'] ?? '',
                    });
                  }}
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                >
                  {t('dashboard.reviewRollover')}
                </button>
                <button
                  onClick={() => dismiss('rollover')}
                  className="p-0.5 rounded hover:bg-warning/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {showAnnualReview && (
            <div className="flex items-center justify-between gap-2 text-warning text-sm group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t('dashboard.warningAnnualReviewDue')}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setOpen(false);
                    setAnnualReviewOpen(true);
                  }}
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                >
                  {t('dashboard.reviewBudget')}
                </button>
                <button
                  onClick={() => dismiss('annual-review')}
                  className="p-0.5 rounded hover:bg-warning/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
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
