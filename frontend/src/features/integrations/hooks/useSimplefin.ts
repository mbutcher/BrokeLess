import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simplefinApi } from '../api/simplefinApi';
import type { MapAccountAction, ResolveReviewAction, UpdateScheduleInput } from '../types';

const KEYS = {
  status: ['simplefin', 'status'] as const,
  schedule: ['simplefin', 'schedule'] as const,
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
      void qc.invalidateQueries({ queryKey: KEYS.unmapped });
    },
  });
}

export function useSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => simplefinApi.sync(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.status });
      void qc.invalidateQueries({ queryKey: KEYS.unmapped });
      void qc.invalidateQueries({ queryKey: KEYS.reviews });
      void qc.invalidateQueries({ queryKey: KEYS.reviewCount });
      // Accounts balances may have changed
      void qc.invalidateQueries({ queryKey: ['accounts'] });
      // New transactions may have arrived
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
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
      void qc.invalidateQueries({ queryKey: KEYS.unmapped });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
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
