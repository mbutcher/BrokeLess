import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  Target,
  TrendingDown,
  BarChart2,
  RefreshCw,
  Download,
  MoreHorizontal,
  X,
  WifiOff,
} from 'lucide-react';
import { useSimplefinStatus, usePendingReviewCount, useUnmappedAccounts } from '@features/integrations/hooks/useSimplefin';
import { useNetworkStore } from '@stores/networkStore';
import { OfflineBanner } from './OfflineBanner';
import { SyncNotification } from './SyncNotification';
import { UserAvatarMenu } from './UserAvatarMenu';
import { WarningsIndicator } from './WarningsIndicator';

// Desktop sidebar nav order: Dashboard first, Accounts last
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/budget', icon: PiggyBank, key: 'nav.budget' },
  { to: '/transactions', icon: ArrowLeftRight, key: 'nav.transactions' },
  { to: '/savings-goals', icon: Target, key: 'nav.savingsGoals' },
  { to: '/liabilities', icon: TrendingDown, key: 'nav.liabilities' },
  { to: '/reports', icon: BarChart2, key: 'nav.reports' },
  { to: '/accounts', icon: Wallet, key: 'nav.accounts' },
];

// Mobile bottom bar primary tabs
const mobileTabItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/budget', icon: PiggyBank, key: 'nav.budget' },
  // center slot is the "more" button — handled inline
  { to: '/transactions', icon: ArrowLeftRight, key: 'nav.transactions' },
  { to: '/savings-goals', icon: Target, key: 'nav.savingsGoals' },
];

// Secondary items shown in the "more" slide-up sheet
const moreItems = [
  { to: '/accounts', icon: Wallet, key: 'nav.accounts' },
  { to: '/liabilities', icon: TrendingDown, key: 'nav.liabilities' },
  { to: '/reports', icon: BarChart2, key: 'nav.reports' },
  { to: '/recurring-transactions', icon: RefreshCw, key: 'nav.recurringTransactions' },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { t } = useTranslation();
  const { data: sfConnection } = useSimplefinStatus();
  const { data: reviewCount = 0 } = usePendingReviewCount();
  const { data: unmapped = [] } = useUnmappedAccounts();
  const importsBadge = reviewCount + unmapped.length;
  const { isOnline, pendingCount } = useNetworkStore();

  return (
    <div className="flex flex-col h-full">
      {/* Logo + avatar */}
      <div className="px-4 py-5 border-b border-border space-y-3">
        <span className="block text-lg font-bold tracking-tight text-foreground px-2">BudgetApp</span>
        <div className="flex items-center gap-2 px-2">
          <UserAvatarMenu onNav={onNav} />
          <span className="text-sm text-muted-foreground">{t('nav.settings')}</span>
          <div className="ml-auto">
            <WarningsIndicator />
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNav}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')
            }
          >
            <Download className="h-4 w-4 shrink-0" />
            {t('nav.imports')}
            {importsBadge > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {importsBadge > 99 ? '99+' : importsBadge}
              </span>
            )}
          </NavLink>
        )}
      </nav>

      {/* Offline / pending status */}
      {(!isOnline || pendingCount > 0) && (
        <div className="px-3 pb-4 border-t border-border pt-3">
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
        </div>
      )}
    </div>
  );
}

function MobileBottomNav({
  onMoreOpen,
  moreOpen,
}: {
  onMoreOpen: () => void;
  moreOpen: boolean;
}) {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex items-stretch h-16 bg-background border-t border-border md:hidden">
      {/* Left two tabs */}
      {mobileTabItems.slice(0, 2).map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5" />
              <span className={isActive ? 'text-primary' : ''}>{t(key)}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Center "more" button */}
      <button
        type="button"
        onClick={onMoreOpen}
        className={[
          'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
          moreOpen ? 'text-primary' : 'text-muted-foreground',
        ].join(' ')}
        aria-label={t('nav.more')}
      >
        <MoreHorizontal className="h-5 w-5" />
        <span>{t('nav.more')}</span>
      </button>

      {/* Right two tabs */}
      {mobileTabItems.slice(2).map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5" />
              <span className={isActive ? 'text-primary' : ''}>{t(key)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function MobileMoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: sfConnection } = useSimplefinStatus();
  const { data: reviewCount = 0 } = usePendingReviewCount();
  const { data: unmapped = [] } = useUnmappedAccounts();
  const importsBadge = reviewCount + unmapped.length;

  if (!open) return null;

  function goTo(to: string) {
    onClose();
    navigate(to);
  }

  const isActive = (to: string) => location.pathname.startsWith(to);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-16 inset-x-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-xl md:hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-sm font-semibold text-foreground">{t('nav.more')}</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted"
            aria-label={t('nav.closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          {moreItems.map(({ to, icon: Icon, key }) => (
            <button
              key={to}
              type="button"
              onClick={() => goTo(to)}
              className={[
                'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left',
                isActive(to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {t(key)}
            </button>
          ))}

          {/* Imports — conditional on SimpleFIN */}
          {sfConnection && (
            <button
              type="button"
              onClick={() => goTo('/imports')}
              className={[
                'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left',
                isActive('/imports')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              <Download className="h-5 w-5 shrink-0" />
              {t('nav.imports')}
              {importsBadge > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {importsBadge > 99 ? '99+' : importsBadge}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:shrink-0 bg-background border-r border-border">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-auto">
        {/* Mobile top bar — minimal: app name + avatar */}
        <header className="flex items-center h-16 px-4 border-b border-border bg-background md:hidden">
          <span className="text-sm font-bold text-foreground">BudgetApp</span>
          <div className="ml-auto flex items-center gap-2">
            <WarningsIndicator />
            <UserAvatarMenu />
          </div>
        </header>

        <OfflineBanner />

        {/* Page content — add bottom padding on mobile to clear the nav bar */}
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav onMoreOpen={() => setMoreOpen(true)} moreOpen={moreOpen} />

      {/* Mobile "more" slide-up sheet */}
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      <SyncNotification />
    </div>
  );
}
