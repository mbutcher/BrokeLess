import type { AccountType } from '@features/core/types';

// ─── SimpleFIN Connection ─────────────────────────────────────────────────────

export interface SimplefinConnection {
  id: string;
  userId: string;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | 'pending' | null;
  lastSyncError: string | null;
  autoSyncEnabled: boolean;
  autoSyncIntervalHours: number;
  autoSyncWindowStart: number; // Hour 0–23
  autoSyncWindowEnd: number;   // Hour 0–23
  createdAt: string;
  updatedAt: string;
}

// ─── Account Mappings ─────────────────────────────────────────────────────────

export interface SimplefinAccountMapping {
  id: string;
  userId: string;
  simplefinAccountId: string;
  simplefinOrgName: string;
  simplefinAccountName: string;
  simplefinAccountType: string;
  localAccountId: string | null;
  ignored: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Pending Reviews ──────────────────────────────────────────────────────────

export interface SimplefinRawTransaction {
  id: string;
  posted: number;
  amount: string;
  description: string;
  pending: boolean;
}

export interface SimplefinPendingReview {
  id: string;
  userId: string;
  simplefinTransactionId: string;
  rawData: SimplefinRawTransaction;
  candidateTransactionId: string | null;
  localAccountId: string | null;
  similarityScore: number;
  createdAt: string;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncResult {
  imported: number;
  skipped: number;
  pendingReviews: number;
  unmappedAccounts: number;
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface UpdateScheduleInput {
  autoSyncEnabled: boolean;
  autoSyncIntervalHours: number;
  autoSyncWindowStart: number;
  autoSyncWindowEnd: number;
}

export type MapAccountAction =
  | { action: 'link'; localAccountId: string }
  | {
      action: 'create';
      newAccount: {
        name: string;
        type: AccountType;
        isAsset: boolean;
        currency: string;
        color?: string;
      };
    };

export type ResolveReviewAction =
  | { action: 'accept' }
  | { action: 'discard' }
  | { action: 'merge'; targetTransactionId: string };
