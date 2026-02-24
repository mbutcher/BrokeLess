/**
 * Offline-first helper functions.
 *
 * - `isOfflineError`: detect network failures from Axios errors.
 * - `getDecrypted*`: read entities from Dexie, decrypting sensitive fields.
 * - `queueMutation`: enqueue an API call for later flush when back online.
 */

import type { AxiosError } from 'axios';
import { db } from './index';
import { decryptFields, encryptField, hasIndexedDbKey, TX_ENCRYPTED_FIELDS } from './crypto';
import type { Account, BudgetLine, Category, Transaction, Budget, SavingsGoal } from '@features/core/types';
import type { LocalTransaction, PendingMutation } from './schema';
import type { TransactionFilters } from '@features/core/types';

// ─── Network detection ────────────────────────────────────────────────────────

/**
 * Returns true for Axios network errors (no response received) and for
 * requests that timed out or were aborted — the cases where falling back to
 * IndexedDB makes sense.
 */
export function isOfflineError(err: unknown): boolean {
  const axiosErr = err as AxiosError | undefined;
  if (!axiosErr) return false;
  // No response means the request never reached the server (no connectivity)
  if (axiosErr.code === 'ERR_NETWORK' || axiosErr.code === 'ECONNABORTED') return true;
  if (axiosErr.response === undefined && axiosErr.request !== undefined) return true;
  return false;
}

// ─── Decrypted reads ──────────────────────────────────────────────────────────

export async function getDecryptedAccounts(userId: string): Promise<Account[]> {
  const rows = await db.accounts.where('userId').equals(userId).toArray();
  return rows as Account[];
}

export async function getDecryptedCategories(userId: string): Promise<Category[]> {
  const rows = await db.categories.where('userId').equals(userId).toArray();
  return rows as Category[];
}

export async function getDecryptedTransactions(
  userId: string,
  filters?: Pick<TransactionFilters, 'accountId' | 'startDate' | 'endDate'>
): Promise<Transaction[]> {
  let query = db.transactions.where('userId').equals(userId);

  const rows = await query.toArray();

  // Apply optional client-side filters (Dexie compound indexes not worth the
  // complexity here; data volume per user is manageable in memory)
  let filtered = rows;
  if (filters?.accountId) {
    filtered = filtered.filter((t) => t.accountId === filters.accountId);
  }
  if (filters?.startDate) {
    filtered = filtered.filter((t) => t.date >= filters.startDate!);
  }
  if (filters?.endDate) {
    filtered = filtered.filter((t) => t.date <= filters.endDate!);
  }

  // Decrypt sensitive fields
  const decrypted = await Promise.all(
    filtered.map((tx) =>
      decryptFields(tx as unknown as Record<string, unknown>, TX_ENCRYPTED_FIELDS)
    )
  );

  return decrypted as unknown as Transaction[];
}

export async function getDecryptedBudgets(userId: string): Promise<Budget[]> {
  const rows = await db.budgets.where('userId').equals(userId).toArray();
  return rows as Budget[];
}

export async function getDecryptedBudgetLines(userId: string): Promise<BudgetLine[]> {
  const rows = await db.budgetLines.where('userId').equals(userId).toArray();
  return rows as BudgetLine[];
}

export async function getDecryptedSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const rows = await db.savingsGoals.where('userId').equals(userId).toArray();
  return rows as SavingsGoal[];
}

// ─── Mutation queue ───────────────────────────────────────────────────────────

/**
 * Enqueue a failed-network API call for replay when connectivity returns.
 * Callers should also apply the mutation optimistically to the Dexie table
 * before calling this function.
 *
 * The request body is encrypted with the IndexedDB key (if available) before
 * being stored in Dexie, preventing plaintext PII from resting in IndexedDB.
 * `push()` decrypts the body before sending it to the server.
 */
export async function queueMutation(
  mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retryCount' | 'status'>
): Promise<void> {
  let { body } = mutation;
  let bodyEncrypted = false;

  if (body !== null && hasIndexedDbKey()) {
    body = await encryptField(body);
    bodyEncrypted = true;
  }

  await db.pendingMutations.add({
    ...mutation,
    body,
    bodyEncrypted,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  });
}

/** Returns the current count of pending (not failed) mutations. */
export async function getPendingMutationCount(): Promise<number> {
  return db.pendingMutations.where('status').equals('pending').count();
}

// ─── Offline write error ──────────────────────────────────────────────────────

/**
 * Thrown when an offline write is attempted but no IndexedDB encryption key
 * is available (user authenticated with password only, not a passkey).
 */
export class OfflineWriteNotAvailableError extends Error {
  constructor() {
    super(
      'Offline writes require a passkey with PRF support. ' +
      'Add a passkey in Security Settings to enable offline transaction entry.'
    );
    this.name = 'OfflineWriteNotAvailableError';
  }
}

// ─── Optimistic local-only entity helpers ─────────────────────────────────────

/**
 * Build a minimal LocalTransaction suitable for optimistic local storage
 * from a CreateTransactionInput + a locally-generated UUID.
 */
export function buildLocalTransaction(
  data: {
    accountId: string;
    amount: number;
    description?: string;
    payee?: string;
    notes?: string;
    date: string;
    categoryId?: string;
  },
  localId: string,
  userId: string
): LocalTransaction {
  const now = new Date().toISOString();
  return {
    id: localId,
    userId,
    accountId: data.accountId,
    amount: data.amount,
    description: data.description ?? null,
    payee: data.payee ?? null,
    notes: data.notes ?? null,
    date: data.date,
    categoryId: data.categoryId ?? null,
    isTransfer: false,
    isCleared: false,
    createdAt: now,
    updatedAt: now,
  };
}
