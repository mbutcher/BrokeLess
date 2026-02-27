import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardHints } from '../api/dashboardApi';
import { useNetworkStore } from '@stores/networkStore';

export function HintsWidget() {
  const { t } = useTranslation();
  const isOnline = useNetworkStore((s) => s.isOnline);

  const { data: hints = [] } = useQuery({
    queryKey: ['dashboard', 'hints'],
    queryFn: fetchDashboardHints,
    staleTime: 15 * 60 * 1000,
    enabled: isOnline,
  });

  if (hints.length === 0) {
    return (
      <div className="h-full flex flex-col p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-blue-500" />
          <h2 className="text-base font-semibold text-gray-900">{t('dashboard.hints')}</h2>
        </div>
        <p className="text-sm text-gray-400">{t('dashboard.noHints')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Lightbulb className="h-4 w-4 text-blue-500" />
        <h2 className="text-base font-semibold text-gray-900">{t('dashboard.hints')}</h2>
      </div>
      <div className="space-y-2 flex-1 overflow-auto">
        {hints.map((hint) => (
          <div key={hint.id} className="text-sm text-gray-700">
            {hint.linkTo ? (
              <Link to={hint.linkTo} className="hover:text-blue-600 hover:underline">
                {hint.message}
              </Link>
            ) : (
              <span>{hint.message}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
