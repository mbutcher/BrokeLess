/**
 * Sync engine — push pending mutations to the server, then pull fresh data.
 *
 * pull(since?)  — GET /api/v1/sync[?updatedSince=<iso>]
 *                 Full sync when `since` is undefined; delta sync otherwise.
 *
 * push()        — Flush the pendingMutations queue in creation order.
 *                 Returns a summary including any conflicts (auto-resolved).
 *
 * sync()        — push() then pull(lastSyncAt).
 */

import { apiClient } from '@lib/api/client';
import { db } from './index';
import { encryptFields, decryptFields, decryptField, hasIndexedDbKey, TX_ENCRYPTED_FIELDS } from './crypto';
import type { SyncPayload } from '@features/core/types';
import type { LocalTransaction } from './schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConflictRecord {
  entityType: string;
  entityId: string;
  /** Always true — we always auto-resolve; surfaced to user for awareness only. */
  autoResolved: true;
  details: string;
}

export interface PushResult {
  flushed: number;
  failed: number;
  conflicts: ConflictRecord[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Serialize a date-containing API response object to strings so it can be
 * stored in Dexie (which stores JS objects as-is but Dates can cause issues
 * with IndexedDB across browsers — strings are safe).
 */
function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = v instanceof Date ? v.toISOString() : v;
  }
  return result as T;
}

async function encryptTx(tx: LocalTransaction): Promise<LocalTransaction> {
  return encryptFields(
    tx as unknown as Record<string, unknown>,
    TX_ENCRYPTED_FIELDS
  ) as unknown as LocalTransaction;
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

/**
 * Fetch server state and merge into the local Dexie database.
 *
 * @param since  ISO 8601 cursor from the previous sync. Omit for a full sync.
 */
export async function pull(since?: string): Promise<void> {
  const url = since
    ? `/sync?updatedSince=${encodeURIComponent(since)}`
    : '/sync';

  const res = await apiClient.get<{ status: string; data: SyncPayload }>(url);
  const payload = res.data.data;

  const fullSync = !since;

  await db.transaction('rw', [
    db.accounts,
    db.categories,
    db.transactions,
    db.budgets,
    db.budgetCategories,
    db.savingsGoals,
    db.syncMeta,
  ], async () => {
    if (fullSync) {
      // Replace local state entirely on first/full sync
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.budgets.clear(),
        db.budgetCategories.clear(),
        db.savingsGoals.clear(),
      ]);
    }

    // Upsert accounts, categories, budgets, budgetCategories, savingsGoals
    // (no sensitive fields to encrypt on these entities)
    await db.accounts.bulkPut(
      payload.accounts.map((a) => serializeDates(a as unknown as Record<string, unknown>) as unknown as typeof a)
    );
    await db.categories.bulkPut(
      payload.categories.map((c) => serializeDates(c as unknown as Record<string, unknown>) as unknown as typeof c)
    );
    await db.budgets.bulkPut(
      payload.budgets.map((b) => serializeDates(b as unknown as Record<string, unknown>) as unknown as typeof b)
    );
    await db.budgetCategories.bulkPut(
      payload.budgetCategories.map((bc) => serializeDates(bc as unknown as Record<string, unknown>) as unknown as typeof bc)
    );
    await db.savingsGoals.bulkPut(
      payload.savingsGoals.map((sg) => serializeDates(sg as unknown as Record<string, unknown>) as unknown as typeof sg)
    );

    // Encrypt sensitive transaction fields before storing
    const localTxs: LocalTransaction[] = await Promise.all(
      payload.transactions.map(async (tx) => {
        const serialized = serializeDates(tx as unknown as Record<string, unknown>) as unknown as LocalTransaction;
        return encryptTx(serialized);
      })
    );
    await db.transactions.bulkPut(localTxs);

    // Advance sync cursor
    await db.syncMeta.put({ id: 'singleton', lastSyncAt: payload.syncedAt });
  });
}

// ─── Push ─────────────────────────────────────────────────────────────────────

/**
 * Flush all pending mutations to the server in the order they were created.
 * Stops on the first network error (leaving remaining mutations in the queue).
 * Unrecoverable HTTP errors (4xx) are marked as failed and collected as conflicts.
 */
export async function push(): Promise<PushResult> {
  const pending = await db.pendingMutations
    .where('status')
    .equals('pending')
    .sortBy('createdAt');

  let flushed = 0;
  let failed = 0;
  const conflicts: ConflictRecord[] = [];

  for (const mutation of pending) {
    try {
      // Resolve the request body — decrypt if it was stored encrypted.
      // The key should still be in memory (user is authenticated), but if it
      // isn't (e.g. password-only re-login after a passkey session) we skip
      // this mutation rather than sending garbled data.
      let bodyJson: string | null = mutation.body;
      if (mutation.bodyEncrypted && bodyJson !== null) {
        if (!hasIndexedDbKey()) {
          // Key unavailable — cannot decrypt; leave queued for when user
          // re-authenticates with their passkey.
          continue;
        }
        bodyJson = await decryptField(bodyJson);
      }

      const config = {
        method: mutation.method.toLowerCase() as 'post' | 'patch' | 'delete',
        url: mutation.url,
        ...(bodyJson ? { data: JSON.parse(bodyJson) } : {}),
      };

      await apiClient.request(config);

      // Success — remove from queue
      await db.pendingMutations.delete(mutation.id);
      flushed++;
    } catch (err: unknown) {
      const status = getHttpStatus(err);

      if (status !== null && status >= 400 && status < 500) {
        // Unrecoverable — mark failed and report as conflict
        await db.pendingMutations.update(mutation.id, { status: 'failed' });
        failed++;
        conflicts.push({
          entityType: mutation.entityType,
          entityId: mutation.localId,
          autoResolved: true,
          details: `${mutation.method} ${mutation.url} returned HTTP ${status}`,
        });
      } else {
        // Network error or 5xx — stop flushing; retry on next reconnect
        break;
      }
    }
  }

  return { flushed, failed, conflicts };
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/** Push pending mutations, then pull a delta from the server. */
export async function sync(): Promise<PushResult> {
  const result = await push();
  const meta = await db.syncMeta.get('singleton');
  await pull(meta?.lastSyncAt ?? undefined);
  return result;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Decrypt a stored LocalTransaction's sensitive fields for display. */
export async function decryptLocalTransaction(tx: LocalTransaction): Promise<LocalTransaction> {
  return decryptFields(
    tx as unknown as Record<string, unknown>,
    TX_ENCRYPTED_FIELDS
  ) as unknown as LocalTransaction;
}

function getHttpStatus(err: unknown): number | null {
  if (
    err !== null &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status != null
  ) {
    return (err as { response: { status: number } }).response.status;
  }
  return null;
}
