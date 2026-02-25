import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  Target,
  TrendingDown,
  BarChart2,
  Download,
  Plug,
  Settings,
  SlidersHorizontal,
  LogOut,
  Menu,
  X,
  WifiOff,
} from 'lucide-react';
import { authApi } from '@features/auth/api/authApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { Button } from '@components/ui/button';
import { useSimplefinStatus, usePendingReviewCount, useUnmappedAccounts } from '@features/integrations/hooks/useSimplefin';
import { useNetworkStore } from '@stores/networkStore';
import { OfflineBanner } from './OfflineBanner';
import { SyncNotification } from './SyncNotification';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/accounts', icon: Wallet, key: 'nav.accounts' },
  { to: '/transactions', icon: ArrowLeftRight, key: 'nav.transactions' },
  { to: '/budget', icon: PiggyBank, key: 'nav.budget' },
  { to: '/savings-goals', icon: Target, key: 'nav.savingsGoals' },
  { to: '/liabilities', icon: TrendingDown, key: 'nav.liabilities' },
  { to: '/reports', icon: BarChart2, key: 'nav.reports' },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const { data: sfConnection } = useSimplefinStatus();
  const { data: reviewCount = 0 } = usePendingReviewCount();
  const { data: unmapped = [] } = useUnmappedAccounts();
  const importsBadge = reviewCount + unmapped.length;
  const { isOnline, pendingCount } = useNetworkStore();

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-lg font-bold tracking-tight text-gray-900">BudgetApp</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNav}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(key)}
          </NavLink>
        ))}

        {/* Imports — only shown when SimpleFIN is connected */}
        {sfConnection && (
          <NavLink
            to="/imports"
            onClick={onNav}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')
            }
          >
            <Download className="h-4 w-4 shrink-0" />
            {t('nav.imports')}
            {importsBadge > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {importsBadge > 99 ? '99+' : importsBadge}
              </span>
            )}
          </NavLink>
        )}
      </nav>

      {/* Bottom: settings + user + logout */}
      <div className="px-3 pb-4 space-y-1 border-t border-gray-100 pt-3">
        <NavLink
          to="/settings/integrations/simplefin"
          onClick={onNav}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')
          }
        >
          <Plug className="h-4 w-4 shrink-0" />
          {t('nav.integrations')}
        </NavLink>
        <NavLink
          to="/settings/security"
          onClick={onNav}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          {t('nav.settings')}
        </NavLink>
        <NavLink
          to="/settings/preferences"
          onClick={onNav}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')
          }
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" />
          {t('nav.preferences')}
        </NavLink>

        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        </div>

        {/* Offline / pending status */}
        {(!isOnline || pendingCount > 0) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-xs">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            {!isOnline ? (
              <span>Offline</span>
            ) : (
              <span>{pendingCount} pending sync</span>
            )}
            {pendingCount > 0 && isOnline && (
              <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-3 text-gray-600"
          isLoading={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('nav.signOut')}
        </Button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:shrink-0 bg-white border-r border-gray-100">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <SidebarContent onNav={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-auto">
        {/* Mobile top bar */}
        <header className="flex items-center h-14 px-4 border-b border-gray-100 bg-white md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-bold text-gray-900">BudgetApp</span>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-1 rounded-md text-gray-600 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        <OfflineBanner />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <SyncNotification />
    </div>
  );
}
