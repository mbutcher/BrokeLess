import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { User, Plug, Shield, LogOut, Users } from 'lucide-react';
import { authApi } from '@features/auth/api/authApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@components/ui/dropdown-menu';

function getInitials(displayName: string | null | undefined, email: string | undefined): string {
  if (displayName && displayName.trim().length > 0) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return displayName.trim()[0]!.toUpperCase();
  }
  if (email) return email[0]!.toUpperCase();
  return '?';
}

interface UserAvatarMenuProps {
  /** Called after navigation — use to close a parent mobile drawer */
  onNav?: () => void;
  menuAlign?: 'start' | 'end';
}

export function UserAvatarMenu({ onNav, menuAlign = 'end' }: UserAvatarMenuProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [open, setOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  const initials = getInitials(user?.displayName, user?.email);
  const path = location.pathname;

  function nav(to: string) {
    setOpen(false);
    onNav?.();
    navigate(to);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={t('nav.openMenu')}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={menuAlign} side="bottom" className="w-48">
        <DropdownMenuItem
          active={path.startsWith('/settings/account')}
          onClick={() => nav('/settings/account')}
        >
          <User className="h-4 w-4 shrink-0" />
          {t('settings.account')}
        </DropdownMenuItem>
        <DropdownMenuItem
          active={path.startsWith('/settings/security')}
          onClick={() => nav('/settings/security')}
        >
          <Shield className="h-4 w-4 shrink-0" />
          {t('settings.security')}
        </DropdownMenuItem>
        <DropdownMenuItem
          active={path.startsWith('/settings/household')}
          onClick={() => nav('/settings/household')}
        >
          <Users className="h-4 w-4 shrink-0" />
          {t('household.settings.title')}
        </DropdownMenuItem>
        <DropdownMenuItem
          active={path.startsWith('/settings/integrations')}
          onClick={() => nav('/settings/integrations')}
        >
          <Plug className="h-4 w-4 shrink-0" />
          {t('nav.integrations')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 hover:bg-red-50"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('nav.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
