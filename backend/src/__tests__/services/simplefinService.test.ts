import { simplefinService } from '@services/integrations/simplefinService';
import { simplefinRepository } from '@repositories/simplefinRepository';
import { simplefinAccountMappingRepository } from '@repositories/simplefinAccountMappingRepository';
import { simplefinPendingReviewRepository } from '@repositories/simplefinPendingReviewRepository';
import { accountRepository } from '@repositories/accountRepository';
import { transactionRepository } from '@repositories/transactionRepository';
import { simplefinApiClient } from '@services/integrations/simplefinApiClient';
import { encryptionService } from '@services/encryption/encryptionService';
import { AppError } from '@middleware/errorHandler';

jest.mock('@repositories/simplefinRepository');
jest.mock('@repositories/simplefinAccountMappingRepository');
jest.mock('@repositories/simplefinPendingReviewRepository');
jest.mock('@repositories/accountRepository');
jest.mock('@repositories/transactionRepository');
jest.mock('@services/integrations/simplefinApiClient');
jest.mock('@services/encryption/encryptionService', () => ({
  encryptionService: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    hash: jest.fn(),
    hashToken: jest.fn(),
  },
}));
jest.mock('@services/core/accountService');
jest.mock('@utils/logger', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));
jest.mock('@config/database');

import { getDatabase } from '@config/database';
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

const mockSfRepo = simplefinRepository as jest.Mocked<typeof simplefinRepository>;
const mockMappingRepo = simplefinAccountMappingRepository as jest.Mocked<
  typeof simplefinAccountMappingRepository
>;
const mockReviewRepo = simplefinPendingReviewRepository as jest.Mocked<
  typeof simplefinPendingReviewRepository
>;
const mockAccountRepo = accountRepository as jest.Mocked<typeof accountRepository>;
const mockTxRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockApiClient = simplefinApiClient as jest.Mocked<typeof simplefinApiClient>;
const mockEncryption = encryptionService as jest.Mocked<typeof encryptionService>;

const USER_ID = 'user-111';
const SETUP_TOKEN = Buffer.from('https://bridge.simplefin.org/claim/abc123').toString('base64');
const PLAIN_URL = 'https://bridge.simplefin.org/simplefin/accounts';
const ENCRYPTED_URL = 'enc:abc123';

const mockConnection = {
  id: 'conn-1',
  userId: USER_ID,
  lastSyncAt: null,
  lastSyncStatus: null as null,
  lastSyncError: null,
  autoSyncEnabled: false,
  autoSyncIntervalHours: 24,
  autoSyncWindowStart: 0,
  autoSyncWindowEnd: 23,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSfTransaction = {
  id: 'sf-tx-1',
  posted: Math.floor(Date.now() / 1000),
  amount: '-42.50',
  description: 'Coffee Shop',
  pending: false,
};

const mockApiResponse = {
  accounts: [
    {
      id: 'sf-acct-1',
      org: { name: 'First Bank' },
      name: 'Checking',
      currency: 'USD',
      balance: '1234.56',
      'available-balance': '1200.00',
      'balance-date': Math.floor(Date.now() / 1000),
      transactions: [mockSfTransaction],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEncryption.encrypt.mockReturnValue(ENCRYPTED_URL);
  mockEncryption.decrypt.mockReturnValue(PLAIN_URL);
  // Knex transaction mock — executes the callback synchronously with no trx arg
  mockGetDatabase.mockReturnValue({
    transaction: jest.fn((cb: (trx: null) => Promise<unknown>) => cb(null)),
  } as unknown as ReturnType<typeof getDatabase>);
});

// ─── connect ──────────────────────────────────────────────────────────────────

describe('simplefinService.connect', () => {
  it('exchanges setup token for access URL and stores it encrypted without validating', async () => {
    mockApiClient.claimToken.mockResolvedValue(PLAIN_URL);
    mockSfRepo.upsertConnection.mockResolvedValue(mockConnection);

    await simplefinService.connect(USER_ID, SETUP_TOKEN);

    expect(mockApiClient.claimToken).toHaveBeenCalledWith(SETUP_TOKEN);
    // fetchAccounts must NOT be called — the token is one-time-use
    expect(mockApiClient.fetchAccounts).not.toHaveBeenCalled();
    expect(mockEncryption.encrypt).toHaveBeenCalledWith(PLAIN_URL);
    expect(mockSfRepo.upsertConnection).toHaveBeenCalledWith(USER_ID, ENCRYPTED_URL);
  });

  it('propagates AppError thrown during token claim without storing anything', async () => {
    mockApiClient.claimToken.mockRejectedValue(
      new AppError('This SimpleFIN setup token has already been used', 409)
    );

    await expect(simplefinService.connect(USER_ID, SETUP_TOKEN)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mockSfRepo.upsertConnection).not.toHaveBeenCalled();
  });
});

// ─── disconnect ───────────────────────────────────────────────────────────────

describe('simplefinService.disconnect', () => {
  it('throws 404 when no connection exists', async () => {
    mockSfRepo.findConnectionByUser.mockResolvedValue(null);

    await expect(simplefinService.disconnect(USER_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockSfRepo.deleteConnection).not.toHaveBeenCalled();
  });

  it('deletes connection when it exists', async () => {
    mockSfRepo.findConnectionByUser.mockResolvedValue(mockConnection);
    mockSfRepo.deleteConnection.mockResolvedValue();

    await simplefinService.disconnect(USER_ID);

    expect(mockSfRepo.deleteConnection).toHaveBeenCalledWith(USER_ID);
  });
});

// ─── sync ─────────────────────────────────────────────────────────────────────

describe('simplefinService.sync', () => {
  const mockMapping = {
    id: 'map-1',
    userId: USER_ID,
    simplefinAccountId: 'sf-acct-1',
    simplefinOrgName: 'First Bank',
    simplefinAccountName: 'Checking',
    simplefinAccountType: 'Checking',
    localAccountId: 'local-acct-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSfRepo.findAccessUrl.mockResolvedValue(ENCRYPTED_URL);
    mockSfRepo.findConnectionByUser.mockResolvedValue(mockConnection);
    mockSfRepo.updateSyncStatus.mockResolvedValue();
    mockSfRepo.updateSyncTimestamp.mockResolvedValue();
    mockSfRepo.getDiscardedIds.mockResolvedValue([]);
    mockSfRepo.pruneDiscardedIds.mockResolvedValue();
    mockApiClient.fetchAccounts.mockResolvedValue(mockApiResponse);
    mockAccountRepo.setCurrentBalance.mockResolvedValue();
    mockTxRepo.findBySimplefinId.mockResolvedValue(null);
    mockReviewRepo.findBySimplefinTxId.mockResolvedValue(null);
    mockTxRepo.findRecentForAccount.mockResolvedValue([]);
    mockTxRepo.create.mockResolvedValue({} as never);
  });

  it('throws 404 when no connection exists', async () => {
    mockSfRepo.findAccessUrl.mockResolvedValue(null);

    await expect(simplefinService.sync(USER_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('counts unmapped accounts and skips their transactions', async () => {
    mockMappingRepo.findBySimplefinId.mockResolvedValue(null);
    mockMappingRepo.upsert.mockResolvedValue({} as never);

    const result = await simplefinService.sync(USER_ID);

    expect(result.unmappedAccounts).toBe(1);
    expect(result.imported).toBe(0);
    expect(mockTxRepo.create).not.toHaveBeenCalled();
  });

  it('imports transaction for mapped account with no fuzzy match', async () => {
    mockMappingRepo.findBySimplefinId.mockResolvedValue(mockMapping);
    mockMappingRepo.upsert.mockResolvedValue({} as never);

    const result = await simplefinService.sync(USER_ID);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.pendingReviews).toBe(0);
    expect(mockTxRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ simplefinTransactionId: 'sf-tx-1' }),
      null // trx arg from mocked db.transaction
    );
  });

  it('skips pending SimpleFIN transactions', async () => {
    const pendingApiResponse = {
      accounts: [
        {
          ...mockApiResponse.accounts[0]!,
          transactions: [{ ...mockSfTransaction, pending: true }],
        },
      ],
    };
    mockApiClient.fetchAccounts.mockResolvedValue(pendingApiResponse);
    mockMappingRepo.findBySimplefinId.mockResolvedValue(mockMapping);
    mockMappingRepo.upsert.mockResolvedValue({} as never);

    const result = await simplefinService.sync(USER_ID);

    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('skips already-imported transactions (exact ID match)', async () => {
    mockMappingRepo.findBySimplefinId.mockResolvedValue(mockMapping);
    mockMappingRepo.upsert.mockResolvedValue({} as never);
    mockTxRepo.findBySimplefinId.mockResolvedValue({ id: 'existing-tx' } as never);

    const result = await simplefinService.sync(USER_ID);

    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('skips discarded transactions', async () => {
    mockSfRepo.getDiscardedIds.mockResolvedValue(['sf-tx-1']);
    mockMappingRepo.findBySimplefinId.mockResolvedValue(mockMapping);
    mockMappingRepo.upsert.mockResolvedValue({} as never);

    const result = await simplefinService.sync(USER_ID);

    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('creates a pending review when fuzzy match exceeds threshold', async () => {
    mockMappingRepo.findBySimplefinId.mockResolvedValue(mockMapping);
    mockMappingRepo.upsert.mockResolvedValue({} as never);

    // Existing transaction with same amount and very similar payee
    mockTxRepo.findRecentForAccount.mockResolvedValue([
      {
        id: 'tx-existing',
        amount: -42.5,
        payee: 'enc-payee',
        description: null,
      } as never,
    ]);
    // Decrypt payee to a nearly-identical string
    mockEncryption.decrypt.mockImplementation((val) => {
      if (val === ENCRYPTED_URL) return PLAIN_URL;
      if (val === 'enc-payee') return 'Coffee Shop'; // identical → similarity=1.0
      return val;
    });
    mockReviewRepo.create.mockResolvedValue({} as never);

    const result = await simplefinService.sync(USER_ID);

    expect(result.pendingReviews).toBe(1);
    expect(result.imported).toBe(0);
    expect(mockReviewRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, simplefinTransactionId: 'sf-tx-1' })
    );
  });

  it('updates sync status to error and rethrows on API failure', async () => {
    mockMappingRepo.findBySimplefinId.mockResolvedValue(mockMapping);
    mockApiClient.fetchAccounts.mockRejectedValue(new Error('API down'));

    await expect(simplefinService.sync(USER_ID)).rejects.toThrow('API down');
    expect(mockSfRepo.updateSyncStatus).toHaveBeenCalledWith(USER_ID, 'error', 'API down');
  });
});

// ─── resolveReview ────────────────────────────────────────────────────────────

describe('simplefinService.resolveReview', () => {
  const mockReview = {
    id: 'review-1',
    userId: USER_ID,
    simplefinTransactionId: 'sf-tx-99',
    rawData: {
      id: 'sf-tx-99',
      posted: Math.floor(Date.now() / 1000),
      amount: '-25.00',
      description: 'Grocery Store',
      pending: false,
    },
    candidateTransactionId: 'local-tx-1',
    localAccountId: 'local-acct-1',
    similarityScore: 0.85,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockReviewRepo.findById.mockResolvedValue(mockReview);
    mockReviewRepo.delete.mockResolvedValue();
  });

  it('throws 404 when review not found', async () => {
    mockReviewRepo.findById.mockResolvedValue(null);

    await expect(
      simplefinService.resolveReview(USER_ID, 'bad-id', 'discard')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('accept: creates transaction on the correct account and deletes review', async () => {
    mockEncryption.encrypt.mockReturnValue('enc:grocery');
    mockTxRepo.create.mockResolvedValue({} as never);

    await simplefinService.resolveReview(USER_ID, 'review-1', 'accept');

    expect(mockTxRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        accountId: 'local-acct-1',
        amount: -25.0,
        simplefinTransactionId: 'sf-tx-99',
      })
    );
    expect(mockReviewRepo.delete).toHaveBeenCalledWith(USER_ID, 'review-1');
  });

  it('accept: throws 422 when review has no localAccountId', async () => {
    mockReviewRepo.findById.mockResolvedValue({ ...mockReview, localAccountId: null });

    await expect(
      simplefinService.resolveReview(USER_ID, 'review-1', 'accept')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('discard: stores the simplefin tx id and deletes the review', async () => {
    mockSfRepo.addDiscardedId.mockResolvedValue();

    await simplefinService.resolveReview(USER_ID, 'review-1', 'discard');

    expect(mockSfRepo.addDiscardedId).toHaveBeenCalledWith(USER_ID, 'sf-tx-99');
    expect(mockReviewRepo.delete).toHaveBeenCalledWith(USER_ID, 'review-1');
  });

  it('merge: marks existing transaction as cleared and deletes review', async () => {
    mockTxRepo.findById.mockResolvedValue({ id: 'local-tx-1' } as never);
    mockTxRepo.update.mockResolvedValue({} as never);

    await simplefinService.resolveReview(USER_ID, 'review-1', 'merge', 'local-tx-1');

    expect(mockTxRepo.update).toHaveBeenCalledWith('local-tx-1', USER_ID, { isCleared: true });
    expect(mockReviewRepo.delete).toHaveBeenCalledWith(USER_ID, 'review-1');
  });

  it('merge: throws 400 when targetTransactionId is missing', async () => {
    await expect(
      simplefinService.resolveReview(USER_ID, 'review-1', 'merge')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('merge: throws 404 when target transaction not found', async () => {
    mockTxRepo.findById.mockResolvedValue(null);

    await expect(
      simplefinService.resolveReview(USER_ID, 'review-1', 'merge', 'bad-tx-id')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── getPendingReviewCount ─────────────────────────────────────────────────────

describe('simplefinService.getPendingReviewCount', () => {
  it('returns the count from the repository', async () => {
    mockReviewRepo.countByUser.mockResolvedValue(3);

    const count = await simplefinService.getPendingReviewCount(USER_ID);

    expect(count).toBe(3);
  });
});
