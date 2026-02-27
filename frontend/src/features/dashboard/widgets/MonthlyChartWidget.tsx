import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MonthlyChart } from '@components/charts/MonthlyChart';
import { useMonthlySummary, useForecast } from '@features/core/hooks/useReports';
import type { MonthlySummaryEntry } from '@features/core/api/reportApi';

export function MonthlyChartWidget() {
  const { t } = useTranslation();
  const [showForecast, setShowForecast] = useState(false);
  const { data: monthlySummary = [], isLoading } = useMonthlySummary(6);
  const { data: forecastData = [] } = useForecast(3);

  const chartData: MonthlySummaryEntry[] = showForecast
    ? [...monthlySummary, ...forecastData]
    : monthlySummary;

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">{t('dashboard.incomeVsExpenses')}</h2>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showForecast}
            onChange={(e) => setShowForecast(e.target.checked)}
            className="rounded"
          />
          {t('dashboard.showForecast')}
        </label>
      </div>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <MonthlyChart data={chartData} />
        )}
      </div>
      {showForecast && (
        <p className="mt-2 text-xs text-gray-400 flex-shrink-0">{t('dashboard.forecastNote')}</p>
      )}
    </div>
  );
}
