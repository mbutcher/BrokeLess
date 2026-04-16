import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardHints } from '../api/dashboardApi';
import { useNetworkStore } from '@stores/networkStore';
import { WidgetShell } from '../components/WidgetShell';
import type { DashboardHint } from '../types/dashboard';

const TYPE_PRIORITY: Record<string, number> = { action: 0, warning: 1, info: 2 };

function sortedByPriority(hints: DashboardHint[]): DashboardHint[] {
  return [...hints].sort(
    (a, b) => (TYPE_PRIORITY[a.type] ?? 3) - (TYPE_PRIORITY[b.type] ?? 3),
  );
}

export function HintsWidget() {
  const { t } = useTranslation();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [index, setIndex] = useState(0);

  const { data: rawHints = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'hints'],
    queryFn: fetchDashboardHints,
    staleTime: 15 * 60 * 1000,
    enabled: isOnline,
  });

  const hints = sortedByPriority(rawHints);
  const total = hints.length;
  const hint = hints[index] ?? null;

  // Reset to first when hint list changes (e.g. after refetch)
  useEffect(() => setIndex(0), [total]);

  return (
    <WidgetShell
      id="hints"
      title={
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          {t('dashboard.hints')}
        </span>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.noHints')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-foreground">
            {hint && (
              hint.linkTo ? (
                <Link to={hint.linkTo} className="hover:text-primary hover:underline">
                  {hint.message}
                </Link>
              ) : (
                <span>{hint.message}</span>
              )
            )}
          </div>

          {total > 1 && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                disabled={index === 0}
                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-0 transition-colors"
                aria-label="Previous hint"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
                {index + 1} / {total}
              </span>
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                disabled={index === total - 1}
                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-0 transition-colors"
                aria-label="Next hint"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
