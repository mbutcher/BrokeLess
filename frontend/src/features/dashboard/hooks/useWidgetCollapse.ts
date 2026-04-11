import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { WidgetId } from '../types/dashboard';

const STORAGE_KEY = 'budgetapp_widget_collapse';

export type CollapseState = Partial<Record<WidgetId, boolean>>;

function readStorage(): CollapseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as CollapseState) : {};
  } catch {
    return {};
  }
}

interface ContextValue {
  collapsed: CollapseState;
  toggle: (id: WidgetId) => void;
}

export function useWidgetCollapseState(): ContextValue {
  const [collapsed, setCollapsed] = useState<CollapseState>(readStorage);
  const skipInitialWrite = useRef(true);

  useEffect(() => {
    if (skipInitialWrite.current) {
      skipInitialWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
    } catch {
      // quota or private mode — non-fatal, state stays in memory
    }
  }, [collapsed]);

  const toggle = useCallback((id: WidgetId) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);
}

const WidgetCollapseContext = createContext<ContextValue | null>(null);

export const WidgetCollapseProvider = WidgetCollapseContext.Provider;

export function useWidgetCollapse(): { isCollapsed: (id: WidgetId) => boolean; toggle: (id: WidgetId) => void } {
  const ctx = useContext(WidgetCollapseContext);
  if (!ctx) {
    return { isCollapsed: () => false, toggle: () => undefined };
  }
  return {
    isCollapsed: (id: WidgetId) => ctx.collapsed[id] === true,
    toggle: ctx.toggle,
  };
}
