import { useState } from 'react';
import { Plus, WifiOff } from 'lucide-react';
import { Button } from '@components/ui/button';
import { PeriodSelector, type ViewMode } from '../components/PeriodSelector';
import { getDefaultPeriod } from '@lib/budget/budgetViewUtils';
import { BudgetSummaryBar } from '../components/BudgetSummaryBar';
import { BudgetLineGroup } from '../components/BudgetLineGroup';
import { AddBudgetLineDialog } from '../components/AddBudgetLineDialog';
import { useBudgetView, usePayPeriod } from '../hooks/useBudgetView';
import { useCategories } from '../hooks/useCategories';
import { isOfflineError } from '@lib/db/offlineHelpers';
import type { BudgetViewLine, Category } from '../types';

export function BudgetPage() {
  const defaultPeriod = getDefaultPeriod();
  const [start, setStart] = useState(defaultPeriod.start);
  const [end, setEnd] = useState(defaultPeriod.end);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: view, isLoading, isError, error } = useBudgetView(start, end);
  const { data: payPeriod } = usePayPeriod();
  const { data: allCategories = [] } = useCategories();

  const handlePeriodChange = (s: string, e: string) => {
    setStart(s);
    setEnd(e);
  };

  // Group view lines by category
  const grouped = groupByCategory(view?.lines ?? [], allCategories);
  const expenseGroups = grouped.filter((g) => g.classification === 'expense');
  const incomeGroups = grouped.filter((g) => g.classification === 'income');

  // True when the request errored but we've never loaded data (first run / backend not ready)
  const isFirstRun = isError && !isOfflineError(error) && view === undefined;

  const isEmpty = !isLoading && !isError && (view?.lines ?? []).length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Budget</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plan your income and expenses across any time window.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Budget Line
        </Button>
      </div>

      {/* Period selector */}
      <PeriodSelector
        start={start}
        end={end}
        viewMode={viewMode}
        payPeriod={payPeriod}
        onPeriodChange={handlePeriodChange}
        onViewModeChange={setViewMode}
      />

      {/* Summary bar */}
      {view && (
        <BudgetSummaryBar
          totalProratedIncome={view.totalProratedIncome}
          totalProratedExpenses={view.totalProratedExpenses}
          totalActualIncome={view.totalActualIncome}
          totalActualExpenses={view.totalActualExpenses}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500" />
        </div>
      )}

      {/* Offline */}
      {isError && isOfflineError(error) && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <WifiOff className="h-8 w-8" />
          <p className="text-sm">Budget View is not available offline.</p>
          <p className="text-xs text-gray-400">Your budget lines are still available below when connection returns.</p>
        </div>
      )}

      {/* Server error while stale data is still visible */}
      {isError && !isOfflineError(error) && view !== undefined && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Could not refresh the budget view. Showing last loaded data.
        </div>
      )}

      {/* Empty state — also shown on first-run server errors (no cached data yet) */}
      {(isEmpty || isFirstRun) && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="rounded-full bg-blue-50 p-4">
            <Plus className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">No budget lines yet</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add your first budget line to start planning your income and expenses.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            Add your first Budget Line
          </Button>
        </div>
      )}

      {/* Budget line groups */}
      {view && !isLoading && (
        <div className="space-y-6">
          {/* Expenses */}
          {expenseGroups.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                Expenses
              </h2>
              {expenseGroups.map((group) => (
                <BudgetLineGroup
                  key={group.category.id}
                  category={group.category}
                  viewLines={group.lines}
                  allCategories={allCategories}
                />
              ))}
            </section>
          )}

          {/* Income */}
          {incomeGroups.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                Income
              </h2>
              {incomeGroups.map((group) => (
                <BudgetLineGroup
                  key={group.category.id}
                  category={group.category}
                  viewLines={group.lines}
                  allCategories={allCategories}
                />
              ))}
            </section>
          )}
        </div>
      )}

      {/* Add dialog */}
      <AddBudgetLineDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface GroupedLines {
  category: Category;
  lines: BudgetViewLine[];
  classification: 'income' | 'expense';
}

function groupByCategory(lines: BudgetViewLine[], allCategories: Category[]): GroupedLines[] {
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
  const groups = new Map<string, GroupedLines>();

  for (const viewLine of lines) {
    const { budgetLine } = viewLine;
    const catId = budgetLine.categoryId;
    if (!groups.has(catId)) {
      const category = categoryMap.get(catId);
      if (!category) continue;
      groups.set(catId, {
        category,
        lines: [],
        classification: budgetLine.classification,
      });
    }
    groups.get(catId)!.lines.push(viewLine);
  }

  return Array.from(groups.values());
}

