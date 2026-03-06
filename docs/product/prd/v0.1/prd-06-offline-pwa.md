# PRD: Offline-First PWA

**Version:** 1.0
**Status:** Shipped — Phase 7
**Last updated:** 2026-02-24

---

## Problem Statement

A personal finance app is most useful when it's always available — including on a phone with spotty connectivity, on a laptop without Wi-Fi, or when the home server is temporarily unreachable. Users need to be able to view their data and record new transactions at any time, with changes automatically synchronized when connectivity is restored.

The self-hosted nature of the app adds a constraint: any data written while offline must stay as secure as data written online. Sensitive transaction fields must remain encrypted even in the offline write queue.

---

## Goals

- Full read access to all core data while offline (accounts, transactions, categories, savings goals, budgets)
- Write access while offline for users who have a registered passkey (PRF key derivation for encryption)
- Automatic synchronization when connectivity is restored, without user intervention
- Clear UI indicators for offline state, pending write count, and sync conflicts
- PWA installability (home screen icon, full-screen launch, offline app shell)

## Non-Goals

- Offline support for Budget View (computed server-side; cannot be served from local data)
- Offline support for reports, debt schedules, exchange rates, SimpleFIN
- Offline writes for password-only users (no PRF key → no local encryption → read-only)
- Multi-device conflict resolution (server always wins)

---

## Functional Requirements

### 7.1 Dexie Schema & Sync Engine

- `BudgetDB` (Dexie) with 8 tables: `accounts`, `transactions`, `categories`, `budgets`, `budgetCategories`, `savingsGoals`, `pendingMutations`, `syncMeta`
- **Pull:** `GET /api/v1/sync?updatedSince=<ISO>` — delta or full sync; upserts all returned rows into Dexie; stores `syncedAt` as the next delta cursor in `syncMeta`
- **Push:** Flushes `pendingMutations` in `createdAt` order; retries failed mutations; skips encrypted mutations when PRF key is unavailable
- **Sync:** Push then pull; guarded by `isSyncing` flag to prevent concurrent syncs

### 7.2 PRF Key Derivation

- WebAuthn PRF (Pseudo-Random Function) extension requested during passkey assertion
- PRF output → HKDF(SHA-256, salt="BudgetApp-IndexedDB-v1") → AES-256-GCM `CryptoKey`
- Key stored only in a module-level variable in `crypto.ts` — never in Zustand, localStorage, or IndexedDB
- `encryptField(plaintext, key)` / `decryptField(ciphertext, key)` / batch helpers in `crypto.ts`
- `queueMutation` encrypts the mutation body with the PRF key before writing to `pendingMutations.body`; sets `bodyEncrypted: true` flag
- `push()` decrypts mutation body before sending to the server when `bodyEncrypted: true`
- Without PRF key (password-only login): reads from Dexie work; writes throw `OfflineWriteNotAvailableError`

### 7.3 Service Worker

- `injectManifest` strategy (custom `sw.ts`) to allow custom handlers alongside Workbox precaching
- **App shell:** Workbox precaching of all Vite-built assets
- **API:** `NetworkFirst` strategy — tries network first, falls back to cache
- **Images:** `CacheFirst` strategy
- **Background sync relay:** Service worker `sync` event handler sends `FLUSH_MUTATIONS` message to all window clients, which then call `syncEngine.sync()`

### 7.4 Offline-Aware Hooks

All 5 core hooks implement the same pattern:
1. `queryFn` attempts the network request
2. On error: if `isOfflineError(error)` → return data from Dexie (decrypted where applicable)
3. Mutations: `onMutate` calls `queueMutation(...)` when offline; throws `OfflineWriteNotAvailableError` without PRF key

Hooks with offline support: `useAccounts`, `useTransactions`, `useCategories`, `useBudgets`, `useSavingsGoals`

### 7.5 Offline UI

- **Offline banner:** Sticky amber bar at top of every page when `isOnline = false`; shows pending mutation count; includes "Set up passkey" link when offline and no PRF key
- **Passkey prompt banner:** Orange variant when `passkeyPromptVisible = true` (write attempted without PRF key)
- **Conflict notification:** Fixed toast after successful sync that includes conflicts; expandable dialog lists each conflicted item (server value wins)
- **Pending count badge:** Shown in sidebar nav alongside "Pending" label
- **PWA install prompt:** Shown after 3rd visit via `beforeinstallprompt` event; dismissible; localStorage persistence

### 7.6 PWA Icons

- `scripts/generate-pwa-icons.js` (Sharp-based) rasterizes `favicon.svg` → 9 standard PNGs (72–512px) + 2 maskable PNGs (192px, 512px)

---

## Data Model

### IndexedDB Tables (Dexie)

See [database-schema.md — IndexedDB Schema](../planning/database-schema.md#indexeddb-schema)

### `PendingMutation` schema

```typescript
interface PendingMutation {
  id: string;           // UUID
  method: 'POST' | 'PATCH' | 'DELETE';
  url: string;          // Relative API path
  body?: string;        // JSON string (may be encrypted)
  bodyEncrypted?: boolean;  // true when body was encrypted with PRF key
  createdAt: Date;      // Ordering for flush
}
```

---

## API Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/sync?updatedSince=<ISO8601>` | Required | Delta or full sync snapshot of all user data |

**Response:** `{ accounts, categories, transactions, budgets, budgetCategories, savingsGoals, syncedAt }`

---

## UI/UX Requirements

- Offline banner must be visible without any scrolling (sticky, `z-index` above content)
- Pending count should update in real-time as mutations are queued and flushed
- Conflicts dialog should show what changed (server value) without overwhelming the user — summary count + expandable details
- PWA install prompt should not appear on first two visits; should respect dismissal permanently

---

## Security Requirements

- PRF-derived key never persisted — cleared on logout via `clearIndexedDbKey()`
- `pendingMutations.body` encrypted with AES-256-GCM when key is available; push engine verifies `bodyEncrypted` before sending
- Password-only users cannot write offline — `OfflineWriteNotAvailableError` surfaced via passkey prompt UI
- `GET /sync` scoped strictly to `req.user.id`; decrypts transaction sensitive fields before returning
- Background Sync API is not used for actual HTTP requests — only for relaying a message to the window client which then runs the sync with the in-memory PRF key

---

## Acceptance Criteria

- [x] App loads and shows all data from Dexie when server is unreachable
- [x] Transactions can be created offline (with passkey); appear in Dexie immediately; synced on reconnect
- [x] `pendingMutations.body` is AES-256-GCM encrypted before storage in IndexedDB
- [x] Password-only users see a passkey prompt when attempting a write offline
- [x] Conflicts after sync are surfaced as notifications
- [x] PWA installs from Chrome on Android and Safari on iOS

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Conflict resolution | Server always wins | Single-user app; server is authoritative; "last-write-wins for text" adds complexity with no practical benefit |
| PRF key storage | Module-level variable only | `CryptoKey` is non-serializable; keeping it outside Zustand prevents accidental exposure via devtools or state persistence |
| SW strategy | `injectManifest` | Required to add the background sync relay handler — `generateSW` doesn't allow custom service worker code |
| Offline writes blocked for password-only users | `OfflineWriteNotAvailableError` + passkey prompt | PRF key unavailable without passkey; encrypting pending mutations without a key would store PII in plaintext |

---

## Known Limitations / Future Work

- `budget_lines` not in Dexie schema — Budget View cannot be served offline (Phase 10+)
- Hard-deleted transactions (future soft-delete migration would fix this): stale records cleared only on next full sync
- PRF extension availability: Chrome 116+, Safari 17+; Firefox read-only offline only
- Background Sync API availability: Chrome/Edge on Android; `handleOnline` serves as fallback elsewhere
- Lighthouse PWA score not formally measured (requires HTTPS + production build)
