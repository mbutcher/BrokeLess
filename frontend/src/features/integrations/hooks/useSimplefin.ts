import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simplefinApi } from '../api/simplefinApi';
import type { MapAccountAction, ResolveReviewAction, UpdateScheduleInput } from '../types';

export interface SyncResult {
  imported: number;
  skipped: number;
  pendingReviews: number;
  unmappedAccounts: number;
}

const KEYS = {
  status: ['simplefin', 'status'] as const,
  schedule: ['simplefin', 'schedule'] as const,
  accounts: ['simplefin', 'accounts'] as const,
  unmapped: ['simplefin', 'unmapped'] as const,
  reviews: ['simplefin', 'reviews'] as const,
  reviewCount: ['simplefin', 'reviews', 'count'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useSimplefinStatus() {
  return useQuery({
    queryKey: KEYS.status,
    queryFn: async () => {
      const res = await simplefinApi.getStatus();
      return res.data.data.connection;
    },
  });
}

export function useSimplefinSchedule() {
  return useQuery({
    queryKey: KEYS.schedule,
    queryFn: async () => {
      const res = await simplefinApi.getSchedule();
      return res.data.data.connection;
    },
  });
}

export function useSimplefinAccounts() {
  return useQuery({
    queryKey: KEYS.accounts,
    queryFn: async () => {
      const res = await simplefinApi.getAccounts();
      return res.data.data.accounts;
    },
  });
}

export function useUnmappedAccounts() {
  return useQuery({
    queryKey: KEYS.unmapped,
    queryFn: async () => {
      const res = await simplefinApi.getUnmappedAccounts();
      return res.data.data.accounts;
    },
  });
}

export function usePendingReviews() {
  return useQuery({
    queryKey: KEYS.reviews,
    queryFn: async () => {
      const res = await simplefinApi.getPendingReviews();
      return res.data.data.reviews;
    },
  });
}

export function usePendingReviewCount() {
  return useQuery({
    queryKey: KEYS.reviewCount,
    queryFn: async () => {
      const res = await simplefinApi.getPendingReviewCount();
      return res.data.data.count;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useConnectSimplefin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (setupToken: string) => simplefinApi.connect(setupToken),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.status });
      void qc.invalidateQueries({ queryKey: KEYS.schedule });
    },
  });
}

export function useDisconnectSimplefin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => simplefinApi.disconnect(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.status });
      void qc.invalidateQueries({ queryKey: KEYS.schedule });
      void qc.invalidateQueries({ queryKey: KEYS.accounts });
      void qc.invalidateQueries({ queryKey: KEYS.unmapped });
    },
  });
}

export function useSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (full: boolean) => simplefinApi.sync(full),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.status });
      void qc.invalidateQueries({ queryKey: KEYS.accounts });
      void qc.invalidateQueries({ queryKey: KEYS.unmapped });
      void qc.invalidateQueries({ queryKey: KEYS.reviews });
      void qc.invalidateQueries({ queryKey: KEYS.reviewCount });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['dashboard', 'hints'] });
    },
  });
}

/**
 * Wraps useSyncNow with local UI state for per-button spinner tracking and result display.
 * Both the ImportsPage and IntegrationsSettingsPage use this identical pattern.
 */
export function useManualSync() {
  const syncMutation = useSyncNow();
  const [activeSyncMode, setActiveSyncMode] = useState<'normal' | 'full' | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function handleSync(full = false) {
    setSyncResult(null);
    setActiveSyncMode(full ? 'full' : 'normal');
    try {
      const res = await syncMutation.mutateAsync(full);
      setSyncResult(res.data.data.result);
    } finally {
      setActiveSyncMode(null);
    }
  }

  return {
    activeSyncMode,
    syncResult,
    handleSync,
    isPending: syncMutation.isPending,
  };
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateScheduleInput) => simplefinApi.updateSchedule(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.schedule });
    },
  });
}

export function useMapAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ simplefinAccountId, data }: { simplefinAccountId: string; data: MapAccountAction }) =>
      simplefinApi.mapAccount(simplefinAccountId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.accounts });
      void qc.invalidateQueries({ queryKey: KEYS.unmapped });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
      void qc.invalidateQueries({ queryKey: ['dashboard', 'hints'] });
    },
  });
}

export function useIgnoreSimplefinAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (simplefinAccountId: string) => simplefinApi.ignoreAccount(simplefinAccountId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.accounts });
      void qc.invalidateQueries({ queryKey: KEYS.unmapped });
      void qc.invalidateQueries({ queryKey: ['dashboard', 'hints'] });
    },
  });
}

export function useResolveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: ResolveReviewAction }) =>
      simplefinApi.resolveReview(reviewId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.reviews });
      void qc.invalidateQueries({ queryKey: KEYS.reviewCount });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
