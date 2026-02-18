import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudgets } from '../hooks/useBudgets';
import { BudgetCard } from '../components/BudgetCard';
import { BudgetForm } from '../components/BudgetForm';

export function BudgetListPage() {
  const { data: budgets = [], isLoading } = useBudgets();
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          + New Budget
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Budget</h2>
          <BudgetForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : budgets.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No budgets yet. Create one to start tracking spending.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onClick={() => navigate(`/budgets/${budget.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
