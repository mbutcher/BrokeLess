import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBudgetProgress, useDeleteBudget, useUpsertBudgetCategories } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { BudgetForm } from '../components/BudgetForm';
import { cn } from '@lib/utils';
import type { Budget } from '../types';

export function BudgetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: progress, isLoading } = useBudgetProgress(id!);
  const { data: allCategories = [] } = useCategories();
  const deleteBudget = useDeleteBudget();
  const upsertCategories = useUpsertBudgetCategories();

  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-gray-100 animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Budget not found.</p>
      </div>
    );
  }

  const { budget, categories } = progress;

  // Find categories not yet in this budget
  const allocatedCategoryIds = new Set(categories.map((c) => c.category.id));
  const availableCategories = allCategories.filter(
    (c) => c.isActive && !c.isIncome && !allocatedCategoryIds.has(c.id)
  );

  async function handleDelete() {
    await deleteBudget.mutateAsync(id!);
    navigate('/budgets');
  }

  async function handleAddCategory(categoryId: string) {
    const existing = categories.map((c) => ({ categoryId: c.category.id, allocatedAmount: c.allocated }));
    await upsertCategories.mutateAsync({
      id: id!,
      categories: [...existing, { categoryId, allocatedAmount: 0 }],
    });
  }

  async function handleUpdateAllocation(categoryId: string, amount: number) {
    const updated = categories.map((c) => ({
      categoryId: c.category.id,
      allocatedAmount: c.category.id === categoryId ? amount : c.allocated,
    }));
    await upsertCategories.mutateAsync({ id: id!, categories: updated });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('/budgets')} className="text-sm text-gray-400 hover:text-gray-600 mb-2">
            ← Budgets
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{budget.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {budget.startDate.split('T')[0]} → {budget.endDate.split('T')[0]}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            Edit
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={handleDelete}
                className="text-sm bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700"
              >
                Confirm delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <BudgetForm
            budget={budget}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Budgeted', value: progress.totalAllocated, color: 'text-blue-600' },
          { label: 'Spent', value: progress.totalSpent, color: progress.totalSpent > progress.totalAllocated ? 'text-red-600' : 'text-gray-900' },
          { label: 'Remaining', value: progress.totalRemaining, color: progress.totalRemaining < 0 ? 'text-red-600' : 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={cn('text-lg font-semibold tabular-nums', color)}>${Math.abs(value).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="space-y-3 mb-6">
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No categories added yet.</p>
        ) : (
          categories.map(({ category, allocated, spent, remaining }) => {
            const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
            const isOver = spent > allocated;
            return (
              <div key={category.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: category.color ? `${category.color}20` : '#f3f4f6',
                      color: category.color ?? '#374151',
                    }}
                  >
                    {category.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs tabular-nums', isOver ? 'text-red-500' : 'text-gray-500')}>
                      ${spent.toFixed(2)} /
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={allocated.toFixed(2)}
                      className="w-20 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-right"
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val !== allocated) {
                          handleUpdateAllocation(category.id, val);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : 'bg-blue-500')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={cn('text-xs mt-1', remaining < 0 ? 'text-red-500' : 'text-gray-400')}>
                  {remaining < 0 ? `$${Math.abs(remaining).toFixed(2)} over budget` : `$${remaining.toFixed(2)} remaining`}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Add category */}
      {availableCategories.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Add a category</p>
          <div className="flex gap-2">
            <select
              id="add-category-select"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>Select category...</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const select = document.getElementById('add-category-select') as HTMLSelectElement;
                if (select.value) handleAddCategory(select.value);
              }}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
