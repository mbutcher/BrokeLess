/**
 * Local IndexedDB types for offline-first storage.
 *
 * These mirror the server-side entity shapes returned by the API.
 * Sensitive transaction fields (payee, description, notes) are stored
 * as AES-256-GCM ciphertext when an IndexedDB encryption key is available
 * (derived from the user's passkey via the WebAuthn PRF extension).
 *
 * All date fields are ISO 8601 strings (same as API response).
 */

import type {
  Account,
  Category,
  Transaction,
  Budget,
  BudgetCategory,
  BudgetLine,
  SavingsGoal,
  RecurringTransaction,
} from '@features/core/types';
import type { DashboardConfig } from '@features/dashboard/types/dashboard';

// Local entity types alias the frontend API types directly.
// The Dexie layer stores/retrieves these shapes; crypto.ts handles
// encrypting/decrypting the sensitive fields transparently.
export type LocalAccount = Account;
export type LocalCategory = Category;
export type LocalTransaction = Transaction; // payee/description/notes may be encrypted ciphertext
export type LocalBudget = Budget;
export type LocalBudgetCategory = BudgetCategory;
export type LocalBudgetLine = BudgetLine;
export type LocalSavingsGoal = SavingsGoal;
export type LocalRecurringTransaction = RecurringTransaction;

/** A queued API mutation to be flushed when the device is back online. */
export interface PendingMutation {
  /** Client-generated UUID (primary key). */
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  /** Relative API path, e.g. '/transactions' or '/accounts/some-uuid'. */
  url: string;
  /**
   * JSON-stringified request body.
   * When `bodyEncrypted` is true this is an AES-256-GCM ciphertext string
   * (base64(iv + ciphertext)) produced by `encryptField`. Decrypted in
   * `push()` before being sent to the server.
   * When `bodyEncrypted` is false (or absent) this is plaintext JSON.
   */
  body: string | null;
  /**
   * True when `body` has been encrypted with the IndexedDB key.
   * Set when an encryption key is available at queue time.
   * Absent / false for mutations queued without a PRF key (should not occur
   * because writes are blocked without a key, but guarded for safety).
   */
  bodyEncrypted?: boolean;
  /** ISO 8601 creation timestamp — used for ordering during flush. */
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'failed';
  entityType: string;
  /** Local entity ID (may be a temp UUID for offline-created records). */
  localId: string;
}

/** Single row tracking when the last successful sync occurred. */
export interface SyncMeta {
  /** Always 'singleton' — this table has exactly one row. */
  id: 'singleton';
  /** ISO 8601 timestamp of the last successful pull, or null for never. */
  lastSyncAt: string | null;
}

/** Locally cached copy of the user's dashboard config. */
export type LocalDashboardConfig = DashboardConfig & {
  /** Always 'singleton' — one row per IndexedDB database. */
  id: 'singleton';
};
