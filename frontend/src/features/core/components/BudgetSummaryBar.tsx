import { useFormatters } from '@lib/i18n/useFormatters';

interface BudgetSummaryBarProps {
  totalProratedIncome: number;
  totalProratedExpenses: number;
  totalActualIncome: number;
  totalActualExpenses: number;
}

export function BudgetSummaryBar({
  totalProratedIncome,
  totalProratedExpenses,
  totalActualIncome,
  totalActualExpenses,
}: BudgetSummaryBarProps) {
  const { currency: formatCurrency } = useFormatters();
  const plannedNet = totalProratedIncome - totalProratedExpenses;
  const actualNet = totalActualIncome - totalActualExpenses;
  const remaining = totalProratedExpenses - totalActualExpenses;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-gray-200">
      <SummaryCell
        label="Planned Income"
        value={totalProratedIncome}
        color="text-green-700"
        formatCurrency={formatCurrency}
      />
      <SummaryCell
        label="Planned Expenses"
        value={totalProratedExpenses}
        color="text-gray-700"
        formatCurrency={formatCurrency}
      />
      <SummaryCell
        label="Actual Expenses"
        value={totalActualExpenses}
        color={totalActualExpenses > totalProratedExpenses ? 'text-red-600' : 'text-gray-700'}
        formatCurrency={formatCurrency}
      />
      <SummaryCell
        label="Remaining Budget"
        value={remaining}
        color={remaining < 0 ? 'text-red-600' : 'text-emerald-600'}
        showSign
        formatCurrency={formatCurrency}
      />

      {/* Divider + net row */}
      <div className="col-span-2 md:col-span-4 pt-2 mt-1 border-t border-gray-100 flex items-center gap-6 text-sm">
        <span className="text-gray-500">
          Planned net:{' '}
          <span className={plannedNet >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
            {plannedNet >= 0 ? '+' : ''}{formatCurrency(plannedNet)}
          </span>
        </span>
        <span className="text-gray-500">
          Actual net:{' '}
          <span className={actualNet >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
            {actualNet >= 0 ? '+' : ''}{formatCurrency(actualNet)}
          </span>
        </span>
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  color,
  showSign = false,
  formatCurrency,
}: {
  label: string;
  value: number;
  color: string;
  showSign?: boolean;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-semibold ${color}`}>
        {showSign && value > 0 ? '+' : ''}
        {formatCurrency(value)}
      </span>
    </div>
  );
}
