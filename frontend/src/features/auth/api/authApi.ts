import { apiClient } from '@lib/api/client';
import type {
  User,
  Passkey,
  SessionInfo,
  TotpSetupData,
  UpdateProfileInput,
  ApiKey,
  CreateApiKeyResult,
} from '../types';
import type { LoginFormData, RegisterFormData } from '../schemas';

interface ApiResponse<T> {
  status: string;
  data: T;
}

interface LoginResponseData {
  accessToken?: string;
  user?: User;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
  methods?: Array<'totp' | 'webauthn'>;
}

interface AuthResponseData {
  accessToken: string;
  user: User;
}

export const authApi = {
  register: (data: Omit<RegisterFormData, 'confirmPassword'>) =>
    apiClient.post<ApiResponse<{ user: User }>>('/auth/register', data),

  login: (data: LoginFormData) =>
    apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', data),

  logout: () => apiClient.post<ApiResponse<null>>('/auth/logout'),

  logoutAll: () => apiClient.post<ApiResponse<null>>('/auth/logout-all'),

  refresh: () => apiClient.post<ApiResponse<AuthResponseData>>('/auth/refresh'),

  me: () => apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),

  updateProfile: (data: UpdateProfileInput) =>
    apiClient.patch<ApiResponse<{ user: User }>>('/auth/me', data),

  // ─── TOTP ──────────────────────────────────────────────────────────────────

  totpSetup: () => apiClient.post<ApiResponse<TotpSetupData>>('/auth/totp/setup'),

  totpConfirm: (data: { token: string; pendingSecret: string }) =>
    apiClient.post<ApiResponse<{ backupCodes: string[] }>>('/auth/totp/confirm', data),

  totpVerify: (data: { token: string }, twoFactorToken: string) =>
    apiClient.post<ApiResponse<AuthResponseData>>('/auth/totp/verify', data, {
      headers: { Authorization: `Bearer ${twoFactorToken}` },
    }),

  totpBackupVerify: (data: { code: string }, twoFactorToken: string) =>
    apiClient.post<ApiResponse<AuthResponseData>>('/auth/totp/backup-verify', data, {
      headers: { Authorization: `Bearer ${twoFactorToken}` },
    }),

  totpDisable: () => apiClient.delete<ApiResponse<null>>('/auth/totp'),

  // ─── WebAuthn ──────────────────────────────────────────────────────────────

  webAuthnRegisterOptions: () =>
    apiClient.post<ApiResponse<Record<string, unknown>>>('/auth/webauthn/register/options'),

  webAuthnRegisterVerify: (response: unknown, deviceName?: string) =>
    apiClient.post<ApiResponse<{ passkey: Passkey }>>('/auth/webauthn/register/verify', {
      response,
      deviceName,
    }),

  webAuthnAuthenticateOptions: () =>
    apiClient.post<ApiResponse<Record<string, unknown> & { challengeToken: string }>>(
      '/auth/webauthn/authenticate/options'
    ),

  webAuthnAuthenticateVerify: (response: unknown, challengeToken: string) =>
    apiClient.post<ApiResponse<AuthResponseData>>('/auth/webauthn/authenticate/verify', {
      response,
      challengeToken,
    }),

  listPasskeys: () => apiClient.get<ApiResponse<{ passkeys: Passkey[] }>>('/auth/passkeys'),

  deletePasskey: (id: string) => apiClient.delete<ApiResponse<null>>(`/auth/passkeys/${id}`),

  // ─── Sessions ──────────────────────────────────────────────────────────────

  listSessions: () =>
    apiClient.get<ApiResponse<{ sessions: SessionInfo[] }>>('/auth/sessions'),

  revokeSession: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/auth/sessions/${id}`),

  // ─── API Keys ──────────────────────────────────────────────────────────────

  listApiKeys: () => apiClient.get<ApiResponse<{ apiKeys: ApiKey[] }>>('/auth/api-keys'),

  createApiKey: (data: { label: string; scopes: string[]; expiresAt?: string }) =>
    apiClient.post<ApiResponse<CreateApiKeyResult>>('/auth/api-keys', data),

  deleteApiKey: (id: string) => apiClient.delete<ApiResponse<null>>(`/auth/api-keys/${id}`),
};
