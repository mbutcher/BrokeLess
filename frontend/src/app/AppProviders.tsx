import { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ThemeProvider } from './ThemeProvider';
import { Toaster } from '@components/ui/sonner';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { configureApiClient } from '@lib/api/client';
import { getApiErrorMessage } from '@lib/api/errors';
import { useAuthStore } from '@features/auth/stores/authStore';
import { useNetworkStore } from '@stores/networkStore';
import { sync, pull } from '@lib/db/syncEngine';
import { getPendingMutationCount, OfflineWriteNotAvailableError } from '@lib/db/offlineHelpers';

// Wire Zustand auth store into the Axios interceptors.
// Must run before any API call is made. Uses getState() to avoid React hook rules.
configureApiClient(
  () => useAuthStore.getState().accessToken,
  (token) => useAuthStore.getState().setAccessToken(token),
  () => useAuthStore.getState().clearAuth()
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min
      gcTime: 5 * 60 * 1000, // 5 min
      retry: (failureCount, error) => {
        // Don't retry client errors that won't succeed on a second attempt:
        //   400/422 — validation failures; request won't change between retries
        //   401/403 — the Axios interceptor handles token refresh
        //   404     — missing resources won't appear after retry
        //   429     — retrying a rate-limited request multiplies the damage
        if (error && typeof error === 'object' && 'response' in error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 400 || status === 401 || status === 403 || status === 404 || status === 422 || status === 429) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => {
        // Show a targeted "add a passkey" prompt whenever an offline write is
        // attempted without a PRF-derived key (password-only users).
        if (error instanceof OfflineWriteNotAvailableError) {
          useNetworkStore.getState().showPasskeyPrompt();
          return;
        }
        toast.error(getApiErrorMessage(error));
      },
    },
  },
});

/** No-UI component: manages online/offline events and sync lifecycle. */
function SyncController() {
  const qc = useQueryClient();
  const { setOnline, setSyncing, setPendingCount, addConflicts, hidePasskeyPrompt } = useNetworkStore();

  useEffect(() => {
    const isAuth = () => useAuthStore.getState().isAuthenticated;

    // Shared sync helper — guards against concurrent in-flight syncs.
    const runSync = async (mode: 'full' | 'reconnect') => {
      if (useNetworkStore.getState().isSyncing) return;
      setSyncing(true);
      try {
        if (mode === 'reconnect') {
          const result = await sync();
          if (result.conflicts.length > 0) addConflicts(result.conflicts);
        } else {
          await pull();
        }
        const count = await getPendingMutationCount();
        setPendingCount(count);
        void qc.invalidateQueries();
      } finally {
        setSyncing(false);
      }
    };

    const handleOnline = () => {
      setOnline(true);
      hidePasskeyPrompt(); // Passkey prompt is only relevant while offline
      if (!isAuth()) return;
      void runSync('reconnect');
    };

    const handleOffline = () => setOnline(false);

    // Background sync — relay from service worker
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FLUSH_MUTATIONS' && isAuth()) {
        void runSync('reconnect');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);

    // Register background sync tag whenever we come online
    const registerBgSync = async () => {
      if ('sync' in ServiceWorkerRegistration.prototype) {
        try {
          const reg = await navigator.serviceWorker.ready;
          // Background Sync API is not yet in TypeScript's DOM lib — cast needed
          type WithSync = ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } };
          await (reg as WithSync).sync.register('flush-mutations');
        } catch {
          // Background sync not available — handleOnline handles it directly
        }
      }
    };
    window.addEventListener('online', registerBgSync);

    // Initial cache warm-up — fire immediately if already authenticated,
    // otherwise wait for the auth state to become true.
    // subscribe() only fires on *future* changes, so we must check the
    // current state at mount time explicitly.
    let initialPullDone = false;
    const doInitialPull = () => {
      if (initialPullDone) return;
      initialPullDone = true;
      if (navigator.onLine) void runSync('full');
    };

    if (useAuthStore.getState().isAuthenticated) {
      doInitialPull();
    }

    const unsubAuth = useAuthStore.subscribe((state) => {
      if (state.isAuthenticated) {
        doInitialPull();
        unsubAuth();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', registerBgSync);
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
      unsubAuth();
    };
  }, [qc, setOnline, setSyncing, setPendingCount, addConflicts, hidePasskeyPrompt]);

  return null;
}

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SyncController />
          {children}
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
