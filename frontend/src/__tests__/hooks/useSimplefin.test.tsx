import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import React from 'react';

vi.mock('@features/integrations/api/simplefinApi', () => ({
  simplefinApi: {
    getStatus: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    sync: vi.fn(),
    getSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    getUnmappedAccounts: vi.fn(),
    mapAccount: vi.fn(),
    getPendingReviews: vi.fn(),
    getPendingReviewCount: vi.fn(),
    resolveReview: vi.fn(),
  },
}));

import { simplefinApi } from '@features/integrations/api/simplefinApi';
import {
  useSimplefinStatus,
  usePendingReviewCount,
  useConnectSimplefin,
  useSyncNow,
  useResolveReview,
} from '@features/integrations/hooks/useSimplefin';

const mockApi = simplefinApi as Record<string, ReturnType<typeof vi.fn>>;

const mockConnection = {
  id: 'conn-1',
  userId: 'u-1',
  lastSyncAt: null,
  lastSyncStatus: null,
  lastSyncError: null,
  autoSyncEnabled: false,
  autoSyncIntervalHours: 24,
  autoSyncWindowStart: 0,
  autoSyncWindowEnd: 23,
  createdAt: '2026-02-20T00:00:00.000Z',
  updatedAt: '2026-02-20T00:00:00.000Z',
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => vi.clearAllMocks());

// ─── useSimplefinStatus ───────────────────────────────────────────────────────

describe('useSimplefinStatus', () => {
  it('returns null when not connected', async () => {
    mockApi['getStatus'].mockResolvedValue({ data: { data: { connection: null } } });

    const { result } = renderHook(() => useSimplefinStatus(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('returns connection data when connected', async () => {
    mockApi['getStatus'].mockResolvedValue({ data: { data: { connection: mockConnection } } });

    const { result } = renderHook(() => useSimplefinStatus(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConnection);
  });

  it('enters error state when API fails', async () => {
    mockApi['getStatus'].mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSimplefinStatus(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── usePendingReviewCount ────────────────────────────────────────────────────

describe('usePendingReviewCount', () => {
  it('returns the count from the API', async () => {
    mockApi['getPendingReviewCount'].mockResolvedValue({ data: { data: { count: 5 } } });

    const { result } = renderHook(() => usePendingReviewCount(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(5);
  });
});

// ─── useConnectSimplefin ──────────────────────────────────────────────────────

describe('useConnectSimplefin', () => {
  it('calls simplefinApi.connect with the setup token', async () => {
    mockApi['connect'].mockResolvedValue({ data: { data: { connection: mockConnection } } });
    mockApi['getStatus'].mockResolvedValue({ data: { data: { connection: mockConnection } } });
    mockApi['getSchedule'].mockResolvedValue({ data: { data: { connection: mockConnection } } });

    const { result } = renderHook(() => useConnectSimplefin(), { wrapper: makeWrapper() });

    result.current.mutate('aGVsbG8gd29ybGQ=');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi['connect']).toHaveBeenCalledWith('aGVsbG8gd29ybGQ=');
  });
});

// ─── useSyncNow ───────────────────────────────────────────────────────────────

describe('useSyncNow', () => {
  it('calls sync and returns the result', async () => {
    const syncResult = { imported: 3, skipped: 1, pendingReviews: 0, unmappedAccounts: 0 };
    mockApi['sync'].mockResolvedValue({ data: { data: { result: syncResult } } });
    // Queries invalidated after sync
    mockApi['getStatus'].mockResolvedValue({ data: { data: { connection: mockConnection } } });
    mockApi['getUnmappedAccounts'].mockResolvedValue({ data: { data: { accounts: [] } } });
    mockApi['getPendingReviews'].mockResolvedValue({ data: { data: { reviews: [] } } });
    mockApi['getPendingReviewCount'].mockResolvedValue({ data: { data: { count: 0 } } });

    const { result } = renderHook(() => useSyncNow(), { wrapper: makeWrapper() });

    let res: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      res = await result.current.mutateAsync();
    });

    expect(mockApi['sync']).toHaveBeenCalledTimes(1);
    // @ts-expect-error — assigned in act
    expect(res.data.data.result).toEqual(syncResult);
  });
});

// ─── useResolveReview ─────────────────────────────────────────────────────────

describe('useResolveReview', () => {
  it('calls resolveReview with the correct arguments for discard', async () => {
    mockApi['resolveReview'].mockResolvedValue({ data: { data: null } });
    mockApi['getPendingReviews'].mockResolvedValue({ data: { data: { reviews: [] } } });
    mockApi['getPendingReviewCount'].mockResolvedValue({ data: { data: { count: 0 } } });

    const { result } = renderHook(() => useResolveReview(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ reviewId: 'rev-1', data: { action: 'discard' } });
    });

    expect(mockApi['resolveReview']).toHaveBeenCalledWith('rev-1', { action: 'discard' });
  });

  it('calls resolveReview with targetTransactionId for merge', async () => {
    mockApi['resolveReview'].mockResolvedValue({ data: { data: null } });
    mockApi['getPendingReviews'].mockResolvedValue({ data: { data: { reviews: [] } } });
    mockApi['getPendingReviewCount'].mockResolvedValue({ data: { data: { count: 0 } } });

    const { result } = renderHook(() => useResolveReview(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        reviewId: 'rev-2',
        data: { action: 'merge', targetTransactionId: 'tx-99' },
      });
    });

    expect(mockApi['resolveReview']).toHaveBeenCalledWith('rev-2', {
      action: 'merge',
      targetTransactionId: 'tx-99',
    });
  });
});
