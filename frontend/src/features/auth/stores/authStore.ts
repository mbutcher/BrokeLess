import { create } from 'zustand';
import type { User, TwoFactorState } from '../types';

interface AuthStore {
  user: User | null;
  accessToken: string | null; // In-memory ONLY — never persisted (XSS risk)
  twoFactorState: TwoFactorState | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // true once initial auth check completes

  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setTwoFactorRequired: (twoFactorToken: string, methods: Array<'totp' | 'webauthn'>) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  twoFactorState: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, twoFactorState: null }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setTwoFactorRequired: (twoFactorToken, methods) =>
    set({ twoFactorState: { twoFactorToken, methods }, isAuthenticated: false }),

  clearAuth: () =>
    set({ user: null, accessToken: null, twoFactorState: null, isAuthenticated: false }),

  updateUser: (user) => set({ user }),

  setInitialized: () => set({ isInitialized: true }),
}));
