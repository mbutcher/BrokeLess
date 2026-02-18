# Phase 2 Review — Authentication & Security

**Date:** 2026-02-13
**Status:** Complete
**Bugs fixed post-implementation:** 4

---

## Summary

Phase 2 implemented a full-stack authentication system from database migrations through React UI. All 17 planned API endpoints are live, including password auth, TOTP 2FA, backup codes, and WebAuthn/Passkeys.

---

## Files Created

### Backend

| File | Purpose |
|------|---------|
| `database/migrations/20260217001_create_users_table.ts` | Users table — UUID PK, AES-256-GCM email, HMAC email hash, Argon2id hash, TOTP, WebAuthn, lockout tracking |
| `database/migrations/20260217002_create_refresh_tokens_table.ts` | Refresh token table — SHA-256 hash, device fingerprint, revocation flag, expiry |
| `database/migrations/20260217003_create_passkeys_table.ts` | WebAuthn credentials — credential ID, COSE public key, counter, transports |
| `database/migrations/20260217004_create_totp_backup_codes_table.ts` | TOTP backup codes — SHA-256 hashes, used/unused tracking, audit trail |
| `types/auth.types.ts` | Complete type system for DB rows, JWT payloads, service I/O |
| `services/encryption/encryptionService.ts` | AES-256-GCM encrypt/decrypt, HMAC-SHA256 hash, SHA-256 token hash |
| `services/auth/passwordService.ts` | Argon2id hashing with pepper; timing-safe dummy hash |
| `services/auth/tokenService.ts` | JWT sign/verify with type guards; fingerprint computation |
| `services/auth/authService.ts` | Full auth orchestration: login, register, refresh rotation, logout |
| `services/auth/totpService.ts` | TOTP setup/confirm/verify/backup-verify/disable |
| `services/auth/webauthnService.ts` | WebAuthn registration + authentication with Redis challenge storage |
| `repositories/userRepository.ts` | User CRUD with snake_case→camelCase mapping |
| `repositories/refreshTokenRepository.ts` | Refresh token CRUD + rotation support |
| `repositories/passkeyRepository.ts` | Passkey CRUD with JSON transports parsing |
| `repositories/totpBackupCodeRepository.ts` | Backup code batch create, mark-used, count |
| `validators/authValidators.ts` | Joi schemas for all 17 endpoints |
| `middleware/authenticate.ts` | `authenticate` (type: access) + `authenticateTwoFactor` (type: 2fa_pending) |
| `middleware/rateLimiter.ts` | Auth: 5/15min; API: 100/15min |
| `middleware/validateRequest.ts` | Joi factory middleware; strips unknown fields |
| `controllers/authController.ts` | All 17 auth handlers with httpOnly cookie management |
| `routes/authRoutes.ts` | Route definitions with correct middleware chains |
| `routes/index.ts` | Route aggregator with apiRateLimiter |
| `index.ts` (updated) | Mount API router at `/api/v1` |

### Frontend

| File | Purpose |
|------|---------|
| `features/auth/types/index.ts` | Frontend type definitions |
| `features/auth/schemas/index.ts` | Zod validation schemas |
| `features/auth/stores/authStore.ts` | Zustand auth store (memory-only, never persisted) |
| `features/auth/api/authApi.ts` | Typed wrappers for all 17 auth endpoints |
| `lib/api/client.ts` | Axios instance with silent refresh interceptor |
| `lib/api/errors.ts` | Shared `getApiErrorMessage` utility |
| `lib/utils.ts` | `cn()` Tailwind merge utility |
| `components/ui/button.tsx` | Button with variants + loading state |
| `components/ui/input.tsx` | Form input |
| `components/ui/card.tsx` | Card, CardHeader, CardContent, etc. |
| `components/ui/label.tsx` | Form label |
| `components/ui/alert.tsx` | Alert with destructive variant |
| `components/ui/badge.tsx` | Badge with variants |
| `components/ui/tabs.tsx` | Controlled tabs (custom, no Radix dependency) |
| `components/ui/separator.tsx` | Horizontal/vertical separator |
| `components/ui/dialog.tsx` | Modal dialog with keyboard dismiss |
| `components/ui/form-field.tsx` | Label + input + error wrapper |
| `features/auth/hooks/useAuth.ts` | App-mount auth initialiser via `/auth/me` |
| `features/auth/hooks/useLogin.ts` | Login mutation with 2FA branching |
| `features/auth/hooks/useRegister.ts` | Register mutation with redirect |
| `features/auth/hooks/useTotpSetup.ts` | 3-step TOTP setup state machine |
| `features/auth/hooks/useTwoFactor.ts` | 2FA completion (TOTP, backup code, WebAuthn) |
| `features/auth/hooks/useWebAuthn.ts` | Passkey registration, authentication, deletion |
| `features/auth/components/ProtectedRoute.tsx` | Redirect to `/login?redirect=<path>` if unauthenticated |
| `features/auth/components/LoginForm.tsx` | Email/password + passkey button |
| `features/auth/components/RegisterForm.tsx` | Register form with password strength indicator |
| `features/auth/components/TwoFactorForm.tsx` | Tabbed TOTP / backup code / WebAuthn 2FA form |
| `features/auth/components/TotpSetup.tsx` | QR display → verify → backup codes wizard |
| `features/auth/components/PasskeySetup.tsx` | Passkey list + register new passkey |
| `features/auth/pages/LoginPage.tsx` | Login page layout |
| `features/auth/pages/RegisterPage.tsx` | Register page layout |
| `features/auth/pages/TwoFactorPage.tsx` | 2FA step page (guards against direct access) |
| `features/auth/pages/SecuritySettingsPage.tsx` | TOTP + passkey settings + session management |
| `features/dashboard/pages/DashboardPage.tsx` | Phase 3 placeholder (required for routing) |
| `app/AppProviders.tsx` | QueryClientProvider + BrowserRouter + API client wiring |
| `app/App.tsx` | Full routing with ProtectedRoute |
| `main.tsx` (updated) | Mount AppProviders |

### Documentation

| File | Purpose |
|------|---------|
| `docs/planning/architecture-decisions/adr-002-authentication.md` | Authentication strategy decisions + security checklist |
| `docs/openapi/paths/auth.yaml` | OpenAPI 3.0 schemas and paths for all 17 auth endpoints |
| `docs/planning/phase-2-review.md` | This document |

---

## Bugs Found and Fixed During Review

### 1. CRITICAL: `configureApiClient` never called
**Impact:** All API requests sent without Authorization header; access token never stored after silent refresh → infinite refresh loop potential.
**Fix:** Added `setAccessToken` parameter to `configureApiClient`; called from `AppProviders.tsx` using `useAuthStore.getState()` (avoids React hook rules and circular imports).

### 2. TIMING ATTACK: Invalid dummy Argon2id hash
**Impact:** `DUMMY_HASH` was a fake format string; `argon2.verify()` throws immediately (~0ms) instead of running the full Argon2id computation (~200–500ms). Timing difference could reveal whether an email is registered.
**Fix:** `DUMMY_HASH` is now computed as a real `argon2.hash(randomBytes(32))` at module startup — a valid hash that exercises the full verification path.

### 3. RACE CONDITION: `useAuth.ts` token dependency
**Impact:** `if (data && accessToken)` used React-subscribed `accessToken`. If `data` and the token arrived in different renders, `setAuth` might not fire (leaving `isAuthenticated: false`).
**Fix:** Read `accessToken` synchronously via `useAuthStore.getState()` inside the effect — guaranteed to reflect the current value at the time `data` is available.

### 4. CODE DUPLICATION: `getErrorMessage` in 6 components
**Impact:** Maintenance burden; inconsistent fallback messages.
**Fix:** Extracted to `lib/api/errors.ts` as `getApiErrorMessage`; replaced all 6 call sites.

---

## Security Checklist (Final)

| Control | Status |
|---------|--------|
| User enumeration prevention (dummy Argon2 verify) | ✅ |
| Refresh token reuse → kill all sessions | ✅ |
| 2FA type guards on middleware | ✅ |
| WebAuthn challenge deleted immediately after verify | ✅ |
| Backup code `timingSafeEqual` comparison | ✅ |
| Cookie: httpOnly, Strict, scoped to `/api/v1/auth` | ✅ |
| Account lockout checked before password verify | ✅ |
| TOTP secret not persisted until confirmSetup | ✅ |
| Access token in memory only (never localStorage) | ✅ |
| Refresh token: only hash stored in DB | ✅ |
| Public key bytes stripped from passkey list response | ✅ |
| configureApiClient wired (token attaches to requests) | ✅ |
| Real dummy hash (full Argon2 timing) | ✅ |

---

## Known Limitations / Phase 3+ Work

- `rate-limit-redis` not installed — rate limiter uses in-memory store. Acceptable for single-process self-hosted deployment; add before multi-process scaling.
- Email verification flow not implemented (the `emailVerified` flag is stored but no verification email is sent) — punted to a future phase.
- No WebAuthn discoverable credential (usernameless) flow — current implementation always requires a `challengeToken` from the options endpoint.
