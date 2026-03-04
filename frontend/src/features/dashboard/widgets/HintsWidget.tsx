import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardHints } from '../api/dashboardApi';
import { useNetworkStore } from '@stores/networkStore';

export function HintsWidget() {
  const { t } = useTranslation();
  const isOnline = useNetworkStore((s) => s.isOnline);

  const { data: hints = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'hints'],
    queryFn: fetchDashboardHints,
    staleTime: 15 * 60 * 1000,
    enabled: isOnline,
  });

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">{t('dashboard.hints')}</h2>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
      ) : hints.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.noHints')}</p>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {hints.map((hint) => (
            <div key={hint.id} className="text-sm text-foreground">
              {hint.linkTo ? (
                <Link to={hint.linkTo} className="hover:text-primary hover:underline">
                  {hint.message}
                </Link>
              ) : (
                <span>{hint.message}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
