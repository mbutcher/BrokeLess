import * as React from 'react';
import { cn } from '@lib/utils';

// ─── Context ──────────────────────────────────────────────────────────────────

interface DropdownMenuContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error('DropdownMenu subcomponent used outside <DropdownMenu>');
  return ctx;
}

// ─── DropdownMenu ─────────────────────────────────────────────────────────────

export interface DropdownMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function DropdownMenu({ open, onOpenChange, children }: DropdownMenuProps) {
  return (
    <DropdownMenuContext.Provider value={{ open, onOpenChange }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

// ─── DropdownMenuTrigger ──────────────────────────────────────────────────────

export function DropdownMenuTrigger({ children }: { children: React.ReactElement }) {
  const { onOpenChange, open } = useDropdownMenuContext();
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenChange(!open);
    },
  });
}

// ─── DropdownMenuContent ──────────────────────────────────────────────────────

export function DropdownMenuContent({
  className,
  align = 'end',
  side = 'bottom',
  children,
}: {
  className?: string;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  children: React.ReactNode;
}) {
  const { open, onOpenChange } = useDropdownMenuContext();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 min-w-[10rem] overflow-hidden rounded-md border bg-white shadow-lg',
        side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
    >
      <div className="py-1">{children}</div>
    </div>
  );
}

// ─── DropdownMenuItem ─────────────────────────────────────────────────────────

export function DropdownMenuItem({
  className,
  children,
  onClick,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  const { onOpenChange } = useDropdownMenuContext();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onOpenChange(false);
    onClick?.(e);
  }

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
        active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── DropdownMenuSeparator ────────────────────────────────────────────────────

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 border-t border-gray-100', className)} />;
}

// ─── DropdownMenuLabel ────────────────────────────────────────────────────────

export function DropdownMenuLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide', className)}>
      {children}
    </div>
  );
}
