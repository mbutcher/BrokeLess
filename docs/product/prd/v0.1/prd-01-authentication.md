# PRD: Authentication & Account Security

**Version:** 1.0
**Status:** Shipped — Phase 2
**Last updated:** 2026-02-24

---

## Problem Statement

A self-hosted personal finance application handling sensitive financial data requires robust, layered authentication. Users need to be protected against credential theft, session hijacking, and unauthorized account access — without sacrificing usability for legitimate everyday access from personal devices.

---

## Goals

- Secure user registration and login with strong password hashing
- Short-lived JWT access tokens that minimize the impact of token theft
- Long-lived refresh tokens with rotation and reuse detection to balance security and convenience
- Optional TOTP 2FA for users who want an additional authentication factor
- WebAuthn/Passkey support for phishing-resistant, password-optional authentication
- Full session management: users can see and revoke all active sessions
- All sensitive auth data encrypted at rest

## Non-Goals

- Social/OAuth login (Google, GitHub, etc.)
- Email verification flow (field exists but verification emails are not sent)
- Magic link login
- Risk-based authentication (device fingerprinting, anomaly detection)

---

## Users / Personas

**Primary:** A technically capable individual deploying BudgetApp on Unraid or a home server. They use a modern browser (Chrome 116+, Safari 17+) and may want passkey support on multiple devices.

---

## Functional Requirements

### Registration
- Email + password registration
- Password hashed with Argon2id (self-describing output ~95 chars)
- Email stored encrypted (AES-256-GCM); HMAC-SHA256 hash stored for fast uniqueness lookup
- 20 default categories seeded on successful registration

### Login
- Email + password login
- Returns access token (15-min JWT) and sets httpOnly refresh token cookie (30-day)
- Rate limiting: 5 requests per 15 minutes on auth endpoints
- Failed login counter; account lockout after excessive failures (`locked_until` field)
- TOTP code required after password check if `totp_enabled = true`
- WebAuthn assertion accepted as a standalone authentication factor

### Token Lifecycle
- **Access token (15 min):** Stored only in Zustand memory (never localStorage); included as `Authorization: Bearer` header
- **Refresh token (30 days):** Stored as httpOnly, SameSite=Strict, Secure cookie; SHA-256 hash stored in DB (never the raw token)
- **Rotation:** Each `POST /auth/refresh` issues a new refresh token and invalidates the previous one
- **Reuse detection:** Presenting a previously revoked refresh token immediately revokes all sessions for the user

### TOTP 2FA
- Setup: `POST /auth/totp/setup` generates a TOTP secret and QR code URI; secret stored encrypted until confirmed
- Confirm: `POST /auth/totp/verify` validates a TOTP code and enables TOTP on the account
- Disable: `DELETE /auth/totp` removes TOTP and clears the encrypted secret
- Backup codes: 8 single-use codes generated on setup; `POST /auth/totp/backup-codes/regenerate` invalidates all and generates a fresh set

### WebAuthn / Passkeys
- Registration: options → verify round-trip via `POST /auth/webauthn/register/options` + `/verify`
- Authentication: `POST /auth/webauthn/authenticate/options` + `/verify`
- Multiple credentials per user (multi-device passkeys supported)
- `GET /auth/webauthn/credentials` lists registered credentials; `DELETE /auth/webauthn/credentials/:id` removes one
- PRF extension requested during assertion for offline encryption key derivation (Phase 7)

### Session Management
- `GET /auth/sessions` — list all active (non-revoked) sessions with `created_at`
- `DELETE /auth/sessions/:id` — revoke a specific session
- `POST /auth/logout` — revoke the current session's refresh token

---

## Data Model

Key tables: [`users`](../planning/database-schema.md#users), [`refresh_tokens`](../planning/database-schema.md#refresh_tokens), [`passkeys`](../planning/database-schema.md#passkeys), [`totp_backup_codes`](../planning/database-schema.md#totp_backup_codes)

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | None | Register a new user |
| POST | `/api/v1/auth/login` | None | Login with email + password (+ TOTP if enabled) |
| POST | `/api/v1/auth/refresh` | Cookie | Rotate refresh token; return new access token |
| POST | `/api/v1/auth/logout` | Required | Revoke current session |
| GET | `/api/v1/auth/me` | Required | Return authenticated user profile |
| PATCH | `/api/v1/auth/me` | Required | Update profile / preferences |
| POST | `/api/v1/auth/totp/setup` | Required | Begin TOTP enrollment; returns secret + QR URI |
| POST | `/api/v1/auth/totp/verify` | Required | Confirm TOTP code to activate 2FA |
| DELETE | `/api/v1/auth/totp` | Required | Disable TOTP |
| POST | `/api/v1/auth/totp/backup-codes/regenerate` | Required | Regenerate backup codes |
| POST | `/api/v1/auth/webauthn/register/options` | Required | Start passkey registration |
| POST | `/api/v1/auth/webauthn/register/verify` | Required | Complete passkey registration |
| POST | `/api/v1/auth/webauthn/authenticate/options` | None | Start passkey assertion |
| POST | `/api/v1/auth/webauthn/authenticate/verify` | None | Complete passkey assertion; return tokens |
| GET | `/api/v1/auth/webauthn/credentials` | Required | List registered passkeys |
| DELETE | `/api/v1/auth/webauthn/credentials/:id` | Required | Remove a passkey |
| GET | `/api/v1/auth/sessions` | Required | List active sessions |
| DELETE | `/api/v1/auth/sessions/:id` | Required | Revoke a session |

---

## UI/UX Requirements

- **Login page:** Email + password fields; TOTP code field appears conditionally after credential check; passkey button ("Sign in with Passkey")
- **Registration page:** Email + password + confirm password
- **Security Settings page:** TOTP section (setup/disable, backup code regeneration); Passkeys section (list with device name + registered date, delete button); Active Sessions section (list with created date, revoke button)

---

## Security Requirements

- Argon2id with production-recommended time/memory cost parameters
- Access tokens signed with HS256 and stored only in memory (not persisted)
- Refresh tokens never stored in DB — only their SHA-256 hash
- Refresh token reuse detection immediately revokes all sessions (prevents token theft from logs/caches)
- All `httpOnly; SameSite=Strict; Secure` cookie attributes on refresh token
- Rate limit: 5 req/15 min on all auth endpoints
- TOTP secret encrypted at rest; never returned in API response after setup
- Email encrypted at rest; plaintext never stored

---

## Acceptance Criteria

- [x] User can register, log in, and be issued access + refresh tokens
- [x] Access token expires in 15 minutes; silent refresh via cookie works
- [x] Presenting a revoked refresh token revokes all sessions
- [x] TOTP setup, verify, and disable flow works end-to-end
- [x] Passkey registration and authentication work end-to-end
- [x] Users can see and revoke individual sessions

---

## Known Limitations / Future Work

- Email verification emails are not sent (field exists; verification flow deferred)
- Device name for refresh token sessions derived from User-Agent at session creation — not yet implemented
- No social/OAuth login
- Rate limit thresholds may need adjustment for WebAuthn multi-round-trip flows
