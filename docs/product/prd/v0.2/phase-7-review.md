# Phase 7 Review — Offline-First PWA

**Date:** 2026-02-23
**Status:** Complete
**Bugs fixed post-implementation:** 6 (from internal review — see Security & Correctness Fixes)

---

## Summary

Phase 7 implemented full offline-first capability. The app now stores all core data in IndexedDB via Dexie, syncs bidirectionally with the server via a push/pull engine, queues mutations made while offline, and provides clear UI indicators for offline state and post-reconnect reconciliation. A custom service worker handles app-shell precaching and relays background sync triggers to the application window.

A critical design refinement was made during review: conflict resolution was simplified to **server always wins** (instead of the originally planned "server wins for balance, last-write-wins for text"). This is correct for a single-user app — the server is the authoritative state and local offline changes that conflict are surfaced to the user as reconciled, not silently merged.

---

## Files Created

### Backend

| File | Purpose |
|------|---------|
| `backend/src/routes/syncRoutes.ts` | Route definition for `GET /sync` |
| `backend/src/controllers/syncController.ts` | Delta/full sync handler — queries all entity tables with optional `updatedSince` filter, returns unified response |

**Edited:**

| File | Change |
|------|--------|
| `backend/src/routes/index.ts` | Mounted `/sync` route under the v1 router |

### Frontend

#### New Files

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Local IndexedDB types: `LocalAccount`, `LocalTransaction`, `PendingMutation` (with `bodyEncrypted` field), `SyncMeta` |
| `src/lib/db/index.ts` | Dexie database class (`BudgetDB`) with 8 tables; singleton `db` export |
| `src/lib/db/crypto.ts` | WebAuthn PRF → HKDF → AES-256-GCM key derivation; `encryptField` / `decryptField` / `encryptFields` / `decryptFields`; module-level key state (never persisted) |
| `src/lib/db/syncEngine.ts` | `push()` flushes `pendingMutations` in `createdAt` order; `pull(since?)` fetches and upserts from `GET /sync`; `sync()` runs push then pull |
| `src/lib/db/offlineHelpers.ts` | `isOfflineError`, decrypted read helpers (`getDecryptedAccounts`, etc.), `queueMutation` (encrypts body before storage), `OfflineWriteNotAvailableError`, `buildLocalTransaction` |
| `src/stores/networkStore.ts` | Zustand store: `isOnline`, `pendingCount`, `isSyncing`, `conflicts`, `passkeyPromptVisible`; all derived UI driven from this store |
| `src/sw.ts` | Custom service worker: Workbox precache, NetworkFirst for `/api/`, CacheFirst for images, background sync relay (`FLUSH_MUTATIONS` message to window clients) |
| `src/components/layout/OfflineBanner.tsx` | Sticky amber banner when offline; pending count; passkey add link; orange variant when `passkeyPromptVisible` |
| `src/components/layout/SyncNotification.tsx` | Fixed toast + detail dialog listing conflicts after reconnect |
| `src/hooks/usePWAInstall.ts` | Intercepts `beforeinstallprompt`; exposes `canInstall`, `visitCount`, `promptInstall` |
| `src/components/common/PWAInstallBanner.tsx` | Bottom install prompt shown on 3rd+ visit; dismissible with localStorage persistence |
| `scripts/generate-pwa-icons.js` | `sharp`-based script to rasterize `favicon.svg` → 9 standard PNGs + 2 maskable PNGs |

#### Edited Files

| File | Change |
|------|--------|
| `src/features/auth/stores/authStore.ts` | Removed `indexedDbKey` from Zustand state (security fix); `clearAuth` still calls `clearIndexedDbKey()` from `crypto.ts` |
| `src/features/auth/hooks/useWebAuthn.ts` | Added PRF extension to WebAuthn assertion; derives and stores key via `setIndexedDbKey` from `crypto.ts` (not authStore) |
| `src/features/core/hooks/useAccounts.ts` | Dexie fallback in `queryFn`; offline mutation queuing for create/update/delete |
| `src/features/core/hooks/useTransactions.ts` | Dexie fallback (decrypted) in `queryFn` and `useTransaction`; offline queuing for create/update/delete; `buildLocalTransaction` for optimistic write |
| `src/features/core/hooks/useCategories.ts` | Same offline pattern; offline queuing for create/update/archive |
| `src/features/core/hooks/useBudgets.ts` | Same offline pattern; offline queuing for create/update/delete; `useUpsertBudgetCategories` also queued offline |
| `src/features/core/hooks/useSavingsGoals.ts` | Same offline pattern; offline queuing for create/update/delete |
| `src/app/AppProviders.tsx` | Added `SyncController` component (online/offline listeners, initial pull, background sync relay); global `mutations.onError` handler for `OfflineWriteNotAvailableError` |
| `src/app/App.tsx` | Added `<PWAInstallBanner />` at root |
| `src/components/layout/AppLayout.tsx` | Renders `<OfflineBanner />`, `<SyncNotification />`, and pending mutations badge |
| `frontend/vite.config.ts` | Switched from `generateSW` to `injectManifest` strategy to allow custom `sw.ts` |

#### Generated Assets

| Path | Description |
|------|-------------|
| `frontend/public/icons/icon-{72,96,128,144,152,192,256,384,512}.png` | Standard PWA icons rasterized from `favicon.svg` |
| `frontend/public/icons/icon-192-maskable.png` | Maskable icon (192px, 10% safe-zone padding, blue-500 background) |
| `frontend/public/icons/icon-512-maskable.png` | Maskable icon (512px) |

---

## API Endpoint Added

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sync?updatedSince=<ISO8601>` | Delta or full sync. Omit `updatedSince` for full sync (used on first login and after full cache clear). Returns all entity tables in parallel via `Promise.all`; timestamps compared with `WHERE updated_at >= ?`. |

**Response shape:**
```typescript
{
  accounts:         Account[];
  categories:       Category[];
  transactions:     Transaction[];   // sensitive fields decrypted before response
  budgets:          Budget[];
  budgetCategories: BudgetCategory[];
  savingsGoals:     SavingsGoal[];
  syncedAt:         string;          // client stores as lastSyncAt for next delta
}
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| PRF key storage | Module-level `_key` variable in `crypto.ts` only — never in Zustand, localStorage, or IndexedDB | CryptoKey is non-serializable; keeping it outside Zustand prevents accidental exposure via devtools or state persistence |
| Conflict resolution | Server always wins | Single-user app — server is authoritative; "last-write-wins for text" adds complexity with no practical benefit for this use case; conflicts are surfaced as notifications, not silently merged |
| `bodyEncrypted` field | `PendingMutation.bodyEncrypted?: boolean` | Allows body to be encrypted at queue time and decrypted at push time; guards against PRF key being unavailable at push time (skip, not fail) |
| Concurrent sync guard | `isSyncing` flag in `networkStore` checked by shared `runSync()` helper | Prevents duplicate in-flight syncs from online event, SW message, and initial pull all firing near-simultaneously |
| `injectManifest` SW strategy | Custom `sw.ts` instead of `generateSW` | Required to add the background sync relay handler (`self.addEventListener('sync', ...)`) |
| `SyncEvent` type | Locally declared interface extending `ExtendableEvent` | Background Sync API is not yet in TypeScript's standard DOM lib |
| Background Sync API cast | `type WithSync = ServiceWorkerRegistration & { sync: { register: ... } }` | Same reason — `reg.sync` not in TS types; cast preferred over `// @ts-ignore` |
| Global mutation `onError` | `queryClient.defaultOptions.mutations.onError` catches `OfflineWriteNotAvailableError` | Single wiring point instead of per-hook; all 5 hook files automatically covered |
| Password-only offline | Read-only (Workbox HTTP cache); `OfflineWriteNotAvailableError` + passkey prompt banner on write attempt | PRF key unavailable without passkey; encrypting pending mutations without a key would store PII in plaintext |

---

## Security & Correctness Fixes (Post-Implementation Review)

Six issues were identified and fixed after initial implementation:

| # | Issue | Fix |
|---|-------|-----|
| 1 | `CryptoKey` stored in Zustand `authStore` in addition to `crypto.ts` module scope | Removed `indexedDbKey` field and `setIndexedDbKey` action from `authStore`; `useWebAuthn.ts` imports `setIndexedDbKey` directly from `crypto.ts` |
| 2 | `pendingMutations.body` stored transaction payee/description/notes in plaintext JSON | `queueMutation` now encrypts body with `encryptField` when key available; added `bodyEncrypted?: boolean` to schema; `push()` decrypts before sending |
| 3 | `OfflineWriteNotAvailableError` thrown but never shown to user | Added global `mutations.onError` to `queryClient`; added `passkeyPromptVisible` + `showPasskeyPrompt` / `hidePasskeyPrompt` to `networkStore`; `OfflineBanner` shows orange passkey prompt variant |
| 4 | `useUpsertBudgetCategories` had no offline support | Added offline queuing to the mutation; throws `OfflineWriteNotAvailableError` without key |
| 5 | Multiple event sources (online event, SW message, initial pull) could trigger concurrent syncs | Introduced shared `runSync()` helper that checks `useNetworkStore.getState().isSyncing` before proceeding |
| 6 | `useAuthStore.subscribe()` in `SyncController` fires only on future auth state changes; users already authenticated at mount skipped the initial pull | Added explicit `useAuthStore.getState().isAuthenticated` check at mount time with `initialPullDone` flag to prevent double execution |

---

## Security Checklist

| Control | Status |
|---------|--------|
| Sync endpoint behind `authenticate` middleware | ✅ |
| `GET /sync` scoped strictly to `req.user.id` — cross-user data impossible | ✅ |
| PRF-derived key stored only in memory (module-level variable); never written to IndexedDB, localStorage, or Zustand persisted state | ✅ |
| `pendingMutations.body` encrypted with AES-256-GCM when key available | ✅ |
| Offline writes blocked entirely for password-only users (no PRF key) | ✅ |
| `push()` skips encrypted mutations if key is unavailable at flush time (rather than failing or sending garbled data) | ✅ |
| `clearIndexedDbKey()` called in `clearAuth` — key cleared on logout | ✅ |
| No PII logged in sync or push operations | ✅ |

---

## Known Limitations / Phase 8+ Work

- **Lighthouse PWA score:** Not formally measured post-implementation. Requires a production build with HTTPS and a deployed service worker to audit accurately.
- **Hard-deleted transactions:** Transactions use hard delete; stale local records are cleared only on the next full sync (pull with no `updatedSince`). Acceptable for an ephemeral local cache.
- **Token expiry offline:** Access tokens expire in 15 min. The next online action triggers silent refresh via httpOnly cookie. If the cookie also expires (30 days), re-login re-derives the PRF key automatically.
- **PRF browser support:** Chrome 116+, Safari 17+. Firefox users receive read-only offline capability via Workbox HTTP cache only (no Dexie writes).
- **Background Sync API support:** Chrome/Edge on Android. Not available in all environments; `handleOnline` serves as the direct fallback.
- **No full-text search offline:** Transaction search is blocked by encrypted storage; a future approach would require a dedicated plaintext search index (e.g., Meilisearch) maintained separately.
- **`database-schema.md` not yet created:** The `docs/planning/` directory lacks a schema reference doc. All new IndexedDB tables are documented in `src/lib/db/schema.ts` and `src/lib/db/index.ts`.
