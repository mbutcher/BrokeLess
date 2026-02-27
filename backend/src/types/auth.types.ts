// ─── Database row shapes ──────────────────────────────────────────────────────

export interface User {
  id: string;
  emailEncrypted: string;
  emailHash: string;
  displayName: string | null;
  passwordHash: string;
  isActive: boolean;
  emailVerified: boolean;
  totpEnabled: boolean;
  totpSecretEncrypted: string | null;
  webauthnEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  defaultCurrency: string;
  locale: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  timezone: string;
  weekStart: 'sunday' | 'monday' | 'saturday';
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceFingerprint: string | null;
  userAgent: string | null;
  /** Human-readable device name derived from user agent, e.g. "Chrome on macOS" */
  deviceName: string | null;
  /** Timestamp of the most recent use (refresh) of this token */
  lastUsedAt: Date | null;
  ipAddress: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Safe public representation of a session for the sessions list endpoint. */
export interface SessionInfo {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  isCurrent: boolean;
}

export interface Passkey {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  aaguid: string | null;
  deviceName: string | null;
  transports: string[] | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TotpBackupCode {
  id: string;
  userId: string;
  codeHash: string;
  isUsed: boolean;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── JWT token payload shapes ─────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string; // user ID
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface TwoFactorTokenPayload {
  sub: string;
  type: '2fa_pending'; // password OK, 2FA not yet complete
  iat: number;
  exp: number;
}

// ─── Service input / output shapes ───────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RequestMeta {
  ip: string;
  userAgent: string;
}

/** User shape safe to return in API responses (no hashes, no encrypted values) */
export interface PublicUser {
  id: string;
  email: string; // decrypted
  displayName: string | null;
  totpEnabled: boolean;
  webauthnEnabled: boolean;
  emailVerified: boolean;
  defaultCurrency: string;
  locale: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  timezone: string;
  weekStart: 'sunday' | 'monday' | 'saturday';
  createdAt: Date;
}

export interface UpdateProfileData {
  displayName?: string | null;
  defaultCurrency?: string;
  locale?: string;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
  timezone?: string;
  weekStart?: 'sunday' | 'monday' | 'saturday';
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string; // raw JWT; caller must set httpOnly cookie
}

export interface AuthResult {
  tokens?: AuthTokens;
  user?: PublicUser;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string; // short-lived (5 min) for the 2FA completion step
  methods?: Array<'totp' | 'webauthn'>; // available 2FA methods
}

export interface TotpSetupResult {
  otpauthUrl: string; // for QR code generation
  qrCodeDataUrl: string; // data:image/png;base64,...
  secret: string; // base32 secret shown once for manual entry
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  userId: string;
  label: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Safe public representation of an API key (no hash) */
export interface PublicApiKey {
  id: string;
  label: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface CreateApiKeyData {
  userId: string;
  label: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
}

// ─── Repository input shapes ──────────────────────────────────────────────────

export interface CreateUserData {
  emailEncrypted: string;
  emailHash: string;
  passwordHash: string;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  deviceFingerprint: string | null;
  userAgent: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}

export interface CreatePasskeyData {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  aaguid: string | null;
  deviceName: string | null;
  transports: string[] | null;
}
