import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save } from 'lucide-react';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import { useDashboardConfig, useSaveDashboardConfig } from '../hooks/useDashboardConfig';
import { DashboardGrid } from '../components/DashboardGrid';
import { WidgetTray } from '../components/WidgetTray';
import { WidgetSettingsModal } from '../components/WidgetSettingsModal';
import { buildDefaultConfig, DEFAULT_WIDGET_VISIBILITY, DEFAULT_LAYOUTS } from '../widgetRegistry';
import { useAuthStore } from '@features/auth/stores/authStore';
import type { DashboardConfig, WidgetId, GridLayoutItem } from '../types/dashboard';

/** Migrate a saved config: add new widget keys, remove stale/unknown widget IDs. */
function migrateConfig(saved: DashboardConfig): DashboardConfig {
  const knownIds = new Set(Object.keys(DEFAULT_WIDGET_VISIBILITY) as WidgetId[]);

  // Rebuild visibility: drop unknown IDs, add missing known IDs
  const visibility: Record<string, boolean> = {};
  let visibilityDirty = false;
  for (const [key, val] of Object.entries(saved.widgetVisibility)) {
    if (knownIds.has(key as WidgetId)) {
      visibility[key] = val;
    } else {
      visibilityDirty = true; // stale key removed
    }
  }
  for (const key of knownIds) {
    if (!(key in visibility)) {
      visibility[key] = DEFAULT_WIDGET_VISIBILITY[key];
      visibilityDirty = true;
    }
  }

  // Rebuild each layout: drop unknown IDs, add missing known ones from defaults
  const buildBp = (bp: keyof typeof saved.layouts) => {
    const filtered = saved.layouts[bp].filter((item) => knownIds.has(item.i as WidgetId));
    const filteredIds = new Set(filtered.map((i) => i.i));
    const defaults = DEFAULT_LAYOUTS[bp];
    const missing = defaults.filter((d) => !filteredIds.has(d.i));
    const result = missing.length > 0 ? [...filtered, ...missing] : filtered;
    return result.length !== saved.layouts[bp].length || missing.length > 0 ? result : saved.layouts[bp];
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
  return {
    ...saved,
    widgetVisibility: visibility as DashboardConfig['widgetVisibility'],
    layouts: { xs, sm, lg, xl },
  };
}

export function DashboardPage() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { data: savedConfig, isLoading } = useDashboardConfig();
  const { mutate: saveConfig, isPending: isSaving } = useSaveDashboardConfig();

  const [isEditMode, setIsEditMode] = useState(false);
  const [showTray, setShowTray] = useState(false);
  const [draftConfig, setDraftConfig] = useState<DashboardConfig | null>(null);
  const [settingsWidgetId, setSettingsWidgetId] = useState<WidgetId | null>(null);

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

      let layouts = prev.layouts;
      if (enabled) {
        // Ensure a layout entry exists at every breakpoint; place new entries at bottom
        const bps = ['xs', 'sm', 'lg', 'xl'] as const;
        let changed = false;
        const newLayouts = { ...layouts };
        for (const bp of bps) {
          if (!newLayouts[bp].some((item) => item.i === id)) {
            const defaultEntry = DEFAULT_LAYOUTS[bp].find((d) => d.i === id);
            if (defaultEntry) {
              const maxY = newLayouts[bp].reduce((m, item) => Math.max(m, item.y + item.h), 0);
              newLayouts[bp] = [...newLayouts[bp], { ...defaultEntry, y: maxY }];
              changed = true;
            }
          }
        }
        if (changed) layouts = newLayouts;
      }

      return {
        ...prev,
        widgetVisibility: { ...prev.widgetVisibility, [id]: enabled },
        layouts,
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
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
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
          onOpenWidgetSettings={setSettingsWidgetId}
        />
      </div>

      {/* Widget tray overlay */}
      {showTray && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowTray(false)}
          />
          <WidgetTray config={draftConfig ?? activeConfig} onToggleWidget={handleToggleWidget} onClose={() => setShowTray(false)} />
        </>
      )}

      {/* Per-widget settings modal */}
      <WidgetSettingsModal
        widgetId={settingsWidgetId}
        config={draftConfig ?? activeConfig}
        onToggleAccount={handleToggleAccount}
        onClose={() => setSettingsWidgetId(null)}
      />
    </div>
  );
}
