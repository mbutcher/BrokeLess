export interface PushPreferences {
  upcomingBills: boolean;
  simplefinErrors: boolean;
  goalDeadlines: boolean;
}

export interface User {
  id: string;
  username: string | null;
  email: string;
  displayName?: string | null;
  totpEnabled: boolean;
  webauthnEnabled: boolean;
  emailVerified: boolean;
  defaultCurrency: string;
  locale: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  timezone: string;
  weekStart: 'sunday' | 'monday' | 'saturday';
  theme: 'default' | 'slate' | 'forest' | 'warm' | 'midnight';
  pushEnabled: boolean;
  pushPreferences: PushPreferences | null;
  /** True when the user has no household yet and must complete /setup before using the app. */
  householdSetupRequired?: boolean;
  createdAt: string;
}

export interface UpdateProfileInput {
  displayName?: string | null;
  defaultCurrency?: string;
  locale?: string;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
  timezone?: string;
  weekStart?: 'sunday' | 'monday' | 'saturday';
  theme?: 'default' | 'slate' | 'forest' | 'warm' | 'midnight';
  pushEnabled?: boolean;
  pushPreferences?: PushPreferences;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface TwoFactorState {
  twoFactorToken: string;
  methods: Array<'totp' | 'webauthn'>;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  twoFactorState: TwoFactorState | null;
  isAuthenticated: boolean;
}

export interface Passkey {
  id: string;
  deviceName: string | null;
  transports: string[] | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export interface TotpSetupData {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}

export interface ApiKey {
  id: string;
  label: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  rawKey: string;
}

export interface PushSubscriptionRecord {
  id: string;
  deviceName: string | null;
  createdAt: string;
}
