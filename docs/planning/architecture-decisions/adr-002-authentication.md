# ADR-002: Authentication Strategy

**Date:** 2026-02-13
**Status:** Accepted
**Phase:** 2 — Authentication & Security

---

## Context

The application requires a secure authentication system suitable for self-hosted deployment where the single user (or small household) has high trust but needs strong protection against:
- Database compromise (leaked hashes, encrypted data)
- Token theft (access or refresh token interception)
- Timing attacks (user enumeration via response time differences)
- Session hijacking (refresh token reuse across devices)

---

## Decisions

### 1. JWT Architecture: Dual-Token with httpOnly Cookie

**Decision:** Short-lived access tokens (15 min) returned in response body; long-lived refresh tokens (30 days) stored as httpOnly cookies.

**Rationale:**
- Access tokens stored **in Zustand memory only** — never `localStorage` or `sessionStorage`. Eliminates XSS token theft for access tokens.
- Refresh tokens in `httpOnly; SameSite=Strict; Secure` cookies prevent JavaScript access entirely. Cookie is scoped to `path: /api/v1/auth` to minimise exposure.
- 15-min access token expiry limits the damage window from token interception.
- Silent refresh via Axios interceptor provides seamless UX without user-facing re-logins.

**Alternative considered:** Single long-lived JWT in memory. Rejected because a page refresh would lose the token requiring re-login on every tab/reload.

**Alternative considered:** Access token in `localStorage`. Rejected due to XSS vulnerability — any injected script can exfiltrate the token.

---

### 2. Refresh Token Rotation with Reuse Detection

**Decision:** Each refresh operation issues a new refresh token and revokes the old one. If a revoked token is presented, **all user sessions are immediately killed** and a security event is logged.

**Rationale:**
- If a refresh token is stolen and the attacker refreshes first, the legitimate user's next refresh will present the now-revoked token, triggering detection.
- Killing all sessions is aggressive but appropriate for a single-user app — a legitimate user can simply re-login.
- Token hashes (SHA-256) are stored in the DB, not the raw JWTs. A DB compromise exposes only hashes, not usable tokens.

**Storage:** `SHA-256(rawRefreshToken)` in `refresh_tokens` table. Raw token only ever travels over TLS.

---

### 3. Password Hashing: Argon2id with Pepper

**Decision:** Argon2id (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`) with the server-side pepper prepended to the password.

**Rationale:**
- Argon2id is the OWASP-recommended algorithm — memory-hard, resistant to GPU/ASIC cracking.
- Parameters chosen to run in ~200–500ms on modern hardware (acceptable UX, punishing for attackers).
- Pepper (env secret) means even if the DB is dumped, hashes cannot be cracked without the server secret.
- Pepper is prepended, not appended, to avoid length extension attacks on naive implementations.

**Timing attack prevention:** When a user is not found by email hash, a full Argon2id verification still runs against a real pre-computed dummy hash. This ensures constant response time regardless of whether the email exists.

---

### 4. Email Storage: Encrypted + Hashed

**Decision:** Emails stored in two columns:
- `email_encrypted`: AES-256-GCM encrypted (`iv:authTag:ciphertext`, fresh IV per write) for display
- `email_hash`: HMAC-SHA256 of lowercased email, for unique-lookup index

**Rationale:**
- Raw email never stored. DB compromise exposes neither plaintext emails nor crackable values.
- HMAC (keyed hash) for lookups — unlike plain SHA-256, an attacker with the hash but not the key cannot build rainbow tables.
- GCM provides authenticated encryption — tampered ciphertext is detected on decrypt.
- Normalising to lowercase before hashing ensures case-insensitive login without storing a canonical form.

---

### 5. Two-Factor Authentication: Intermediate Token Pattern

**Decision:** After successful password verification when 2FA is enabled, issue a short-lived `type: 2fa_pending` JWT (5 min) instead of full tokens. A separate middleware (`authenticateTwoFactor`) guards 2FA completion endpoints and only accepts this token type.

**Rationale:**
- Prevents 2FA tokens from being used to access protected resources (type guard enforced at token verification, not just route level).
- 5-minute expiry limits the window for TOTP interception.
- The intermediate token carries only the user ID — no session privileges until 2FA completes.

**TOTP specifics:**
- `speakeasy` with `window: 1` (±30s tolerance for clock drift)
- Secret NOT persisted until the user confirms with a valid first token (`confirmSetup` pattern)
- 8 backup codes (10-char base32, ~50 bits entropy), stored as SHA-256 hashes, single-use
- Backup code comparison uses `crypto.timingSafeEqual()` to prevent timing attacks

---

### 6. WebAuthn/Passkeys

**Decision:** Full WebAuthn Level 2 via `@simplewebauthn/server`. Challenges stored in Redis (5-min TTL), deleted immediately after verification (success or failure).

**Rationale:**
- Redis storage prevents challenge replay across server restarts and enables future horizontal scaling.
- Immediate deletion after verify prevents replay attacks even within the TTL window.
- `credentialId` is globally unique — cross-account registration is explicitly checked and rejected.
- Counter verification (`newCounter > storedCounter`) protects against authenticator cloning.
- `attestationType: 'none'` chosen — attestation verification requires internet access and is impractical for self-hosted deployment.

---

### 7. Account Lockout

**Decision:** 5 failed login attempts triggers a 15-minute lockout, tracked in the `users` table.

**Rationale:**
- DB-based lockout survives server restarts (unlike in-memory rate limiting).
- Generic error message for both "account locked" and "wrong password" after the lockout threshold prevents attackers from knowing which reason applies.
- Lockout check occurs **before** password verification to prevent timing-based confirmation that an account exists.

---

## Security Checklist

| Control | Implementation | Status |
|---------|---------------|--------|
| User enumeration prevention | Dummy Argon2id verify when email not found | ✅ |
| Refresh token reuse detection | Kill all sessions on revoked-token presentation | ✅ |
| 2FA type confusion attack | Separate middleware, explicit `type` claim check | ✅ |
| WebAuthn challenge replay | Redis delete immediately after verify | ✅ |
| Backup code timing attack | `crypto.timingSafeEqual()` on hash buffers | ✅ |
| Cookie scope minimisation | `path: '/api/v1/auth'`, `SameSite: Strict` | ✅ |
| Lockout before credential check | Order enforced in `authService.login()` | ✅ |
| TOTP secret premature persistence | Stored only after `confirmSetup()` succeeds | ✅ |
| Access token XSS protection | Memory-only storage (Zustand), never DOM-accessible | ✅ |
| Refresh token DB exposure | SHA-256 hash stored, raw token never persisted | ✅ |
| Email PII protection | AES-256-GCM encrypted; HMAC for lookups | ✅ |
| Password DB exposure | Argon2id + pepper; cracking requires server secret | ✅ |

---

## Consequences

- Silent token refresh (Axios interceptor) adds complexity but is essential for UX without localStorage.
- The "kill all sessions on reuse" policy may occasionally affect legitimate users (e.g., duplicate tab race condition). Acceptable trade-off for a single-user app.
- Dummy Argon2id hash computed at server startup — adds ~200–500ms to cold start but ensures timing safety.
- Redis is a hard dependency for WebAuthn. If Redis is unavailable, WebAuthn authentication and registration will fail (but password + TOTP login still works).
