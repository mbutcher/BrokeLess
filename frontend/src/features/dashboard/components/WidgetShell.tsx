import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useWidgetCollapse } from '../hooks/useWidgetCollapse';
import type { WidgetId } from '../types/dashboard';

interface Props {
  id: WidgetId;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** When true, body scrolls vertically only. Chart widgets should leave this false. */
  scrollable?: boolean;
}

export function WidgetShell({ id, title, actions, children, scrollable = false }: Props) {
  const { isCollapsed, toggle } = useWidgetCollapse();
  const collapsed = isCollapsed(id);

  const bodyOverflow = scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden';

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 px-5 py-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => toggle(id)}
          className="flex items-center gap-2 min-w-0 text-left flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={!collapsed}
          aria-controls={`widget-body-${id}`}
        >
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
          <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>
        </button>
        {actions && !collapsed && (
          <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>
        )}
      </div>
      <div
        id={`widget-body-${id}`}
        hidden={collapsed}
        className={`flex-1 min-w-0 px-5 pb-5 ${bodyOverflow}`}
      >
        {children}
      </div>
    </div>
  );
}
