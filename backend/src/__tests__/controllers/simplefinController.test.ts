import type { Request, Response, NextFunction } from 'express';
import { simplefinController } from '@controllers/simplefinController';
import { simplefinService } from '@services/integrations/simplefinService';

jest.mock('@services/integrations/simplefinService');
jest.mock('@services/encryption/encryptionService', () => ({
  encryptionService: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    hash: jest.fn(),
    hashToken: jest.fn(),
  },
}));
jest.mock('@utils/logger', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));

const mockService = simplefinService as jest.Mocked<typeof simplefinService>;

const USER_ID = 'user-abc';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: USER_ID },
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, json, status };
}

const next = jest.fn() as unknown as NextFunction;

const mockConnection = {
  id: 'conn-1',
  userId: USER_ID,
  lastSyncAt: null,
  lastSyncStatus: null,
  lastSyncError: null,
  autoSyncEnabled: false,
  autoSyncIntervalHours: 24,
  autoSyncWindowStart: 0,
  autoSyncWindowEnd: 23,
  discardedIdsJson: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─── getStatus ────────────────────────────────────────────────────────────────

describe('simplefinController.getStatus', () => {
  it('returns connection when found', async () => {
    mockService.getConnection.mockResolvedValue(mockConnection as never);

    const { res, json } = makeRes();
    await simplefinController.getStatus(makeReq(), res, next);

    expect(json).toHaveBeenCalledWith({
      status: 'success',
      data: { connection: mockConnection },
    });
  });

  it('returns null connection when not connected', async () => {
    mockService.getConnection.mockResolvedValue(null);

    const { res, json } = makeRes();
    await simplefinController.getStatus(makeReq(), res, next);

    expect(json).toHaveBeenCalledWith({ status: 'success', data: { connection: null } });
  });
});

// ─── connect ──────────────────────────────────────────────────────────────────

describe('simplefinController.connect', () => {
  it('calls service with userId and setupToken; returns 201 with connection', async () => {
    mockService.connect.mockResolvedValue(mockConnection as never);
    const token = 'aGVsbG8gd29ybGQ=';

    const { res, status } = makeRes();
    await simplefinController.connect(makeReq({ body: { setupToken: token } }), res, next);

    expect(mockService.connect).toHaveBeenCalledWith(USER_ID, token);
    expect(status).toHaveBeenCalledWith(201);
  });
});

// ─── disconnect ───────────────────────────────────────────────────────────────

describe('simplefinController.disconnect', () => {
  it('calls service and returns success', async () => {
    mockService.disconnect.mockResolvedValue();

    const { res, json } = makeRes();
    await simplefinController.disconnect(makeReq(), res, next);

    expect(mockService.disconnect).toHaveBeenCalledWith(USER_ID);
    expect(json).toHaveBeenCalledWith({ status: 'success', data: null });
  });
});

// ─── sync ─────────────────────────────────────────────────────────────────────

describe('simplefinController.sync', () => {
  it('returns sync result', async () => {
    const syncResult = { imported: 5, skipped: 2, pendingReviews: 1, unmappedAccounts: 0 };
    mockService.sync.mockResolvedValue(syncResult);

    const { res, json } = makeRes();
    await simplefinController.sync(makeReq(), res, next);

    expect(json).toHaveBeenCalledWith({ status: 'success', data: { result: syncResult } });
  });
});

// ─── mapAccount ───────────────────────────────────────────────────────────────

describe('simplefinController.mapAccount', () => {
  it('calls service with simplefinAccountId from params and returns success', async () => {
    mockService.mapAccount.mockResolvedValue();

    const { res, json } = makeRes();
    await simplefinController.mapAccount(
      makeReq({
        params: { simplefinAccountId: 'sf-acct-42' },
        body: { action: 'link', localAccountId: 'local-acct-1' },
      }),
      res,
      next
    );

    expect(mockService.mapAccount).toHaveBeenCalledWith(
      USER_ID,
      'sf-acct-42',
      { action: 'link', localAccountId: 'local-acct-1' }
    );
    expect(json).toHaveBeenCalledWith({ status: 'success', data: null });
  });
});

// ─── getPendingReviewCount ────────────────────────────────────────────────────

describe('simplefinController.getPendingReviewCount', () => {
  it('returns the count', async () => {
    mockService.getPendingReviewCount.mockResolvedValue(7);

    const { res, json } = makeRes();
    await simplefinController.getPendingReviewCount(makeReq(), res, next);

    expect(json).toHaveBeenCalledWith({ status: 'success', data: { count: 7 } });
  });
});

// ─── resolveReview ────────────────────────────────────────────────────────────

describe('simplefinController.resolveReview', () => {
  it('calls service with reviewId, action, and optional targetTransactionId', async () => {
    mockService.resolveReview.mockResolvedValue();

    const { res, json } = makeRes();
    await simplefinController.resolveReview(
      makeReq({
        params: { reviewId: 'rev-1' },
        body: { action: 'merge', targetTransactionId: 'tx-99' },
      }),
      res,
      next
    );

    expect(mockService.resolveReview).toHaveBeenCalledWith(USER_ID, 'rev-1', 'merge', 'tx-99');
    expect(json).toHaveBeenCalledWith({ status: 'success', data: null });
  });

  it('passes undefined targetTransactionId for discard action', async () => {
    mockService.resolveReview.mockResolvedValue();

    const { res } = makeRes();
    await simplefinController.resolveReview(
      makeReq({ params: { reviewId: 'rev-2' }, body: { action: 'discard' } }),
      res,
      next
    );

    expect(mockService.resolveReview).toHaveBeenCalledWith(USER_ID, 'rev-2', 'discard', undefined);
  });
});
