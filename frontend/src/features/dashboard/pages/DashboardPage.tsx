import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save, Plus } from 'lucide-react';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import { useDashboardConfig, useSaveDashboardConfig } from '../hooks/useDashboardConfig';
import { DashboardGrid } from '../components/DashboardGrid';
import { WidgetTray } from '../components/WidgetTray';
import { buildDefaultConfig, DEFAULT_WIDGET_VISIBILITY, DEFAULT_LAYOUTS } from '../widgetRegistry';
import { useAuthStore } from '@features/auth/stores/authStore';
import type { DashboardConfig, WidgetId, GridLayoutItem } from '../types/dashboard';

/** Fill in any new widget keys missing from a saved config (backwards-compat). */
function migrateConfig(saved: DashboardConfig): DashboardConfig {
  const allKeys = Object.keys(DEFAULT_WIDGET_VISIBILITY) as WidgetId[];
  const visibility = { ...saved.widgetVisibility };
  let visibilityDirty = false;
  for (const key of allKeys) {
    if (!(key in visibility)) {
      visibility[key] = DEFAULT_WIDGET_VISIBILITY[key];
      visibilityDirty = true;
    }
  }

  // Ensure each layout breakpoint has entries for new widgets
  const buildBp = (bp: keyof typeof saved.layouts) => {
    const existing = saved.layouts[bp];
    const existingIds = new Set(existing.map((i) => i.i));
    const defaults = DEFAULT_LAYOUTS[bp];
    const missing = defaults.filter((d) => !existingIds.has(d.i));
    return missing.length > 0 ? [...existing, ...missing] : existing;
  };

  const xs = buildBp('xs');
  const sm = buildBp('sm');
  const lg = buildBp('lg');
  const xl = buildBp('xl');
  const layoutDirty =
    xs !== saved.layouts.xs ||
    sm !== saved.layouts.sm ||
    lg !== saved.layouts.lg ||
    xl !== saved.layouts.xl;

  if (!visibilityDirty && !layoutDirty) return saved;
  return { ...saved, widgetVisibility: visibility, layouts: { xs, sm, lg, xl } };
}

export function DashboardPage() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { data: savedConfig, isLoading } = useDashboardConfig();
  const { mutate: saveConfig, isPending: isSaving } = useSaveDashboardConfig();

  const [isEditMode, setIsEditMode] = useState(false);
  const [showTray, setShowTray] = useState(false);
  const [draftConfig, setDraftConfig] = useState<DashboardConfig | null>(null);

  const baseConfig: DashboardConfig = useMemo(() => {
    if (savedConfig) return migrateConfig(savedConfig);
    return buildDefaultConfig(userId);
  }, [savedConfig, userId]);

  const activeConfig: DashboardConfig = draftConfig ?? baseConfig;

  const enterEditMode = () => {
    setDraftConfig(activeConfig);
    setIsEditMode(true);
  };

  const exitEditMode = (save: boolean) => {
    if (save && draftConfig) {
      saveConfig(draftConfig);
    }
    setDraftConfig(null);
    setIsEditMode(false);
    setShowTray(false);
  };

  const handleLayoutChange = useCallback(
    (_layout: Layout, allLayouts: ResponsiveLayouts) => {
      if (!isEditMode) return;
      setDraftConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          layouts: {
            xs: (allLayouts['xs'] ?? prev.layouts.xs) as GridLayoutItem[],
            sm: (allLayouts['sm'] ?? prev.layouts.sm) as GridLayoutItem[],
            lg: (allLayouts['lg'] ?? prev.layouts.lg) as GridLayoutItem[],
            xl: (allLayouts['xl'] ?? prev.layouts.xl) as GridLayoutItem[],
          },
        };
      });
    },
    [isEditMode],
  );

  const handleToggleWidget = (id: WidgetId, enabled: boolean) => {
    setDraftConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgetVisibility: { ...prev.widgetVisibility, [id]: enabled },
      };
    });
  };

  const handleToggleAccount = (accountId: string, excluded: boolean) => {
    setDraftConfig((prev) => {
      if (!prev) return prev;
      const ids = new Set(prev.excludedAccountIds);
      if (excluded) {
        ids.add(accountId);
      } else {
        ids.delete(accountId);
      }
      return { ...prev, excludedAccountIds: Array.from(ids) };
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page header */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => setShowTray(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('dashboard.addWidgets')}
              </button>
              <button
                onClick={() => exitEditMode(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => exitEditMode(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4" />
              {t('dashboard.editDashboard')}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <DashboardGrid
          config={activeConfig}
          isEditMode={isEditMode}
          onLayoutChange={handleLayoutChange}
        />
      </div>

      {/* Widget tray overlay */}
      {showTray && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowTray(false)}
          />
          <WidgetTray
            config={draftConfig ?? activeConfig}
            onToggleWidget={handleToggleWidget}
            onToggleAccount={handleToggleAccount}
            onClose={() => setShowTray(false)}
          />
        </>
      )}
    </div>
  );
}
