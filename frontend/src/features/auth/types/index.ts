export interface User {
  id: string;
  email: string;
  totpEnabled: boolean;
  webauthnEnabled: boolean;
  emailVerified: boolean;
  defaultCurrency: string;
  locale: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  timezone: string;
  weekStart: 'sunday' | 'monday' | 'saturday';
  createdAt: string;
}

export interface UpdateProfileInput {
  defaultCurrency?: string;
  locale?: string;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
  timezone?: string;
  weekStart?: 'sunday' | 'monday' | 'saturday';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
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

export interface TotpSetupData {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}
