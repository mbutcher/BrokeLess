import { apiClient } from '@lib/api/client';
import type {
  SimplefinConnection,
  SimplefinAccountMapping,
  SimplefinPendingReview,
  SyncResult,
  UpdateScheduleInput,
  MapAccountAction,
  ResolveReviewAction,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const simplefinApi = {
  // ─── Connection ──────────────────────────────────────────────────────────────

  getStatus: () =>
    apiClient.get<ApiResponse<{ connection: SimplefinConnection | null }>>('/simplefin/status'),

  connect: (setupToken: string) =>
    apiClient.post<ApiResponse<{ connection: SimplefinConnection }>>('/simplefin/connect', {
      setupToken,
    }),

  disconnect: () => apiClient.delete<ApiResponse<null>>('/simplefin/disconnect'),

  // ─── Sync ────────────────────────────────────────────────────────────────────

  sync: () => apiClient.post<ApiResponse<{ result: SyncResult }>>('/simplefin/sync'),

  // ─── Schedule ────────────────────────────────────────────────────────────────

  getSchedule: () =>
    apiClient.get<ApiResponse<{ connection: SimplefinConnection }>>('/simplefin/schedule'),

  updateSchedule: (data: UpdateScheduleInput) =>
    apiClient.patch<ApiResponse<{ connection: SimplefinConnection }>>('/simplefin/schedule', data),

  // ─── Account Mapping ─────────────────────────────────────────────────────────

  getAccounts: () =>
    apiClient.get<ApiResponse<{ accounts: SimplefinAccountMapping[] }>>('/simplefin/accounts'),

  getUnmappedAccounts: () =>
    apiClient.get<ApiResponse<{ accounts: SimplefinAccountMapping[] }>>(
      '/simplefin/accounts/unmapped'
    ),

  mapAccount: (simplefinAccountId: string, data: MapAccountAction) =>
    apiClient.post<ApiResponse<null>>(`/simplefin/accounts/${simplefinAccountId}/map`, data),

  ignoreAccount: (simplefinAccountId: string) =>
    apiClient.post<ApiResponse<null>>(`/simplefin/accounts/${simplefinAccountId}/ignore`, {}),

  // ─── Pending Reviews ─────────────────────────────────────────────────────────

  getPendingReviews: () =>
    apiClient.get<ApiResponse<{ reviews: SimplefinPendingReview[] }>>('/simplefin/reviews'),

  getPendingReviewCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/simplefin/reviews/count'),

  resolveReview: (reviewId: string, data: ResolveReviewAction) =>
    apiClient.post<ApiResponse<null>>(`/simplefin/reviews/${reviewId}/resolve`, data),
};
