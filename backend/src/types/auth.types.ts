// ─── Database row shapes ──────────────────────────────────────────────────────

export interface User {
  id: string;
  emailEncrypted: string;
  emailHash: string;
  passwordHash: string;
  isActive: boolean;
  emailVerified: boolean;
  totpEnabled: boolean;
  totpSecretEncrypted: string | null;
  webauthnEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceFingerprint: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
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
  totpEnabled: boolean;
  webauthnEnabled: boolean;
  emailVerified: boolean;
  createdAt: Date;
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
