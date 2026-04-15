import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WIDGET_META } from '../widgetRegistry';
import type { DashboardConfig, WidgetCategory, WidgetId } from '../types/dashboard';

interface Props {
  config: DashboardConfig;
  onToggleWidget: (id: WidgetId, enabled: boolean) => void;
  onClose: () => void;
}

const CATEGORY_ORDER: WidgetCategory[] = ['overview', 'budgeting', 'savings', 'spending', 'debt'];

export function WidgetTray({ config, onToggleWidget, onClose }: Props) {
  const { t } = useTranslation();

  // Group widgets by category, skipping feature-flagged ones
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: t(`dashboard.widgetCategories.${cat}`),
    items: WIDGET_META.filter((m) => m.category === cat && !m.featureFlag),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-card border-l border-border shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-base font-semibold text-foreground">{t('dashboard.editDashboard')}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Widget toggles — grouped by category */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {t('dashboard.widgets.title')}
          </p>
          <div className="space-y-5">
            {grouped.map(({ cat, label, items }) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
                <div className="space-y-2.5">
                  {items.map((meta) => {
                    const enabled = config.widgetVisibility[meta.id] ?? false;
                    return (
                      <label
                        key={meta.id}
                        className={`flex items-center justify-between ${meta.alwaysOn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className="text-sm text-foreground">{t(meta.labelKey)}</span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={meta.alwaysOn}
                          onChange={(e) => onToggleWidget(meta.id, e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
