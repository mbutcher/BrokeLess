import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BudgetLineRow } from './BudgetLineRow';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { BudgetViewLine, Category } from '../types';

interface BudgetLineGroupProps {
  category: Category;
  viewLines: BudgetViewLine[];
  allCategories: Category[];
}

export function BudgetLineGroup({ category, viewLines, allCategories }: BudgetLineGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { currency: formatCurrency } = useFormatters();

  const subcategoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const groupPlanned = viewLines.reduce((s, l) => s + l.proratedAmount, 0);
  const groupActual = viewLines.reduce((s, l) => s + l.actualAmount, 0);
  const isIncome = viewLines[0]?.budgetLine.classification === 'income';

  return (
    <div className="mb-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex-1 min-w-0">
          {category.name}
        </span>
        {/* On sm+, planned/actual sit inline. On mobile, they wrap below the title. */}
        <div className="flex items-center gap-4 text-sm shrink-0 max-sm:basis-full max-sm:pl-6 max-sm:pt-1">
          <span className="text-gray-500">
            Planned <span className="font-semibold text-gray-700">{formatCurrency(groupPlanned)}</span>
          </span>
          <span className="text-gray-500">
            Actual{' '}
            <span className={`font-semibold ${!isIncome && groupActual > groupPlanned ? 'text-red-600' : 'text-gray-700'}`}>
              {formatCurrency(groupActual)}
            </span>
          </span>
        </div>
      </button>

      {/* Lines */}
      {!collapsed && (
        <div>
          {viewLines.map((viewLine) => (
            <BudgetLineRow
              key={viewLine.budgetLine.id}
              viewLine={viewLine}
              subcategoryName={
                viewLine.budgetLine.subcategoryId
                  ? subcategoryMap.get(viewLine.budgetLine.subcategoryId)?.name
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
