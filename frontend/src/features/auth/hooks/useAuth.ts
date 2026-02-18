import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';

/**
 * Initializes auth state on app mount by calling GET /auth/me.
 * The Axios interceptor handles silent token refresh on 401.
 * On success, the user is stored in Zustand; on failure, auth is cleared.
 */
export function useAuth() {
  const { setAuth, setInitialized, isInitialized, isAuthenticated, user } = useAuthStore();

  const { isLoading, data } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await authApi.me();
      return response.data.data.user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !isInitialized,
  });

  useEffect(() => {
    if (data) {
      // The Axios interceptor stored the access token via setAccessToken during
      // the silent refresh that preceded this successful /me response.
      // Read it synchronously from the store (not from React state) to avoid
      // a race where `data` arrives before the React re-render with the new token.
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        setAuth(data, accessToken);
      }
    }
  }, [data, setAuth]);

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      setInitialized();
    }
  }, [isInitialized, isLoading, setInitialized]);

  return { isLoading: !isInitialized, isAuthenticated, user };
}
