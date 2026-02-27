import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save, RotateCcw } from 'lucide-react';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import { useDashboardConfig, useSaveDashboardConfig } from '../hooks/useDashboardConfig';
import { DashboardGrid } from '../components/DashboardGrid';
import { WidgetTray } from '../components/WidgetTray';
import { buildDefaultConfig } from '../widgetRegistry';
import { useAuthStore } from '@features/auth/stores/authStore';
import type { DashboardConfig, WidgetId, GridLayoutItem } from '../types/dashboard';

export function DashboardPage() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { data: savedConfig, isLoading } = useDashboardConfig();
  const { mutate: saveConfig, isPending: isSaving } = useSaveDashboardConfig();

  const [isEditMode, setIsEditMode] = useState(false);
  const [showTray, setShowTray] = useState(false);
  const [draftConfig, setDraftConfig] = useState<DashboardConfig | null>(null);

  const activeConfig: DashboardConfig =
    draftConfig ?? savedConfig ?? buildDefaultConfig(userId);

  const enterEditMode = () => {
    setDraftConfig(activeConfig);
    setIsEditMode(true);
    setShowTray(true);
  };

  const exitEditMode = (save: boolean) => {
    if (save && draftConfig) {
      saveConfig(draftConfig);
    }
    setDraftConfig(null);
    setIsEditMode(false);
    setShowTray(false);
  };

  const resetToDefaults = () => {
    setDraftConfig(buildDefaultConfig(userId));
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
        <div className="h-8 w-48 bg-gray-100 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page header */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                {t('dashboard.resetDefaults')}
              </button>
              <button
                onClick={() => exitEditMode(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => exitEditMode(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
