import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { authApi } from '@features/auth/api/authApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { Button } from '@components/ui/button';

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/settings/security')}
            >
              <Settings className="h-4 w-4" />
              Security
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              isLoading={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-dashed bg-background p-12 text-center">
          <h2 className="text-lg font-semibold">Phase 3 Coming Soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Accounts, transactions, and budgets will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
