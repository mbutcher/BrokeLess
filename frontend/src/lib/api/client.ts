import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Always send cookies (refresh token)
  headers: { 'Content-Type': 'application/json' },
});

// Lazy import to avoid circular dependencies (authStore imports apiClient via authApi)
let getAccessToken: (() => string | null) | null = null;
let setAccessToken: ((token: string) => void) | null = null;
let clearAuth: (() => void) | null = null;

export function configureApiClient(
  accessTokenGetter: () => string | null,
  accessTokenSetter: (token: string) => void,
  authClearer: () => void
): void {
  getAccessToken = accessTokenGetter;
  setAccessToken = accessTokenSetter;
  clearAuth = authClearer;
}

// Request interceptor: attach Authorization header from in-memory store.
// Does NOT override an explicit Authorization header already set on the request
// (e.g. the 2fa_pending token passed by totpVerify).
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken?.();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Response interceptor: silent token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry refresh endpoint (infinite loop guard)
    const isRefreshEndpoint = (originalRequest?.url as string | undefined)?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{ data: { accessToken: string } }>('/auth/refresh');
        const newToken = data.data.accessToken;

        // Persist the new token in the Zustand store before unblocking queued requests
        setAccessToken?.(newToken);
        onTokenRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear auth and let the ProtectedRoute redirect to login
        clearAuth?.();
        refreshSubscribers = [];
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
