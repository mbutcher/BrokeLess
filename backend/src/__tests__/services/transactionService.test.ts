import { transactionService } from '@services/core/transactionService';
import { transactionRepository } from '@repositories/transactionRepository';
import { transactionLinkRepository } from '@repositories/transactionLinkRepository';
import { accountRepository } from '@repositories/accountRepository';

// Mock all repositories and the database transaction
jest.mock('@repositories/transactionRepository');
jest.mock('@repositories/transactionLinkRepository');
jest.mock('@repositories/accountRepository');
jest.mock('@repositories/transactionSearchRepository', () => ({
  transactionSearchRepository: {
    // Plain functions so resetMocks: true doesn't wipe the Promise return
    index: () => Promise.resolve(),
    findMatchingIds: () => Promise.resolve([]),
  },
}));
jest.mock('@config/database', () => ({
  getDatabase: () => ({
    transaction: (cb: (trx: unknown) => Promise<unknown>) => cb({}),
  }),
}));
jest.mock('@services/encryption/encryptionService', () => ({
  encryptionService: {
    encrypt: (v: string) => `enc:${v}`,
    decrypt: (v: string) => v.replace('enc:', ''),
    hash: (v: string) => `hash:${v}`,
  },
}));

const mockTxRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockLinkRepo = transactionLinkRepository as jest.Mocked<typeof transactionLinkRepository>;
const mockAccRepo = accountRepository as jest.Mocked<typeof accountRepository>;

const USER_ID = 'user-123';
const TX_ID = 'tx-456';
const ACCOUNT_ID = 'acc-789';

const mockAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: 'Checking',
  type: 'checking' as const,
  isAsset: true,
  startingBalance: 0,
  currentBalance: 1000,
  currency: 'USD',
  color: null,
  institution: null,
  annualRate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTx = {
  id: TX_ID,
  userId: USER_ID,
  accountId: ACCOUNT_ID,
  amount: -45.5,
  description: 'enc:Grocery run',
  payee: 'enc:Whole Foods',
  notes: null,
  date: new Date('2026-02-18'),
  categoryId: null,
  isTransfer: false,
  isCleared: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('transactionService.getTransaction', () => {
  it('returns decrypted transaction', async () => {
    mockTxRepo.findById.mockResolvedValue(mockTx);
    const tx = await transactionService.getTransaction(USER_ID, TX_ID);
    expect(tx.description).toBe('Grocery run');
    expect(tx.payee).toBe('Whole Foods');
  });

  it('throws 404 when not found', async () => {
    mockTxRepo.findById.mockResolvedValue(null);
    await expect(transactionService.getTransaction(USER_ID, TX_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('transactionService.createTransaction', () => {
  it('throws 404 when account not found', async () => {
    mockAccRepo.findById.mockResolvedValue(null);
    await expect(
      transactionService.createTransaction(USER_ID, {
        accountId: ACCOUNT_ID,
        amount: -45.5,
        date: '2026-02-18',
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('creates transaction and returns candidates', async () => {
    mockAccRepo.findById.mockResolvedValue(mockAccount);
    mockAccRepo.updateBalance.mockResolvedValue();
    mockTxRepo.create.mockResolvedValue(mockTx);
    mockTxRepo.findTransferCandidates.mockResolvedValue([]);

    const result = await transactionService.createTransaction(USER_ID, {
      accountId: ACCOUNT_ID,
      amount: -45.5,
      date: '2026-02-18',
      payee: 'Whole Foods',
    });

    expect(result.transaction).toBeDefined();
    expect(result.transferCandidates).toEqual([]);
  });
});

describe('transactionService.deleteTransaction', () => {
  it('throws 404 when not found', async () => {
    mockTxRepo.findById.mockResolvedValue(null);
    await expect(transactionService.deleteTransaction(USER_ID, TX_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('reverses balance and removes link on delete', async () => {
    mockTxRepo.findById.mockResolvedValue(mockTx);
    mockLinkRepo.findByTransactionId.mockResolvedValue(null);
    mockAccRepo.updateBalance.mockResolvedValue();
    mockTxRepo.delete.mockResolvedValue();

    await transactionService.deleteTransaction(USER_ID, TX_ID);
    expect(mockAccRepo.updateBalance).toHaveBeenCalledWith(ACCOUNT_ID, 45.5, expect.anything()); // reversal of -45.5
  });
});

describe('transactionService.linkTransactions', () => {
  const TX_A = 'tx-a';
  const TX_B = 'tx-b';

  it('throws 400 when linking a transaction to itself', async () => {
    await expect(
      transactionService.linkTransactions(USER_ID, TX_A, TX_A)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 422 when amounts are not equal and opposite', async () => {
    mockTxRepo.findById
      .mockResolvedValueOnce({ ...mockTx, id: TX_A, amount: -100 })
      .mockResolvedValueOnce({ ...mockTx, id: TX_B, amount: 50 }); // not 100
    await expect(
      transactionService.linkTransactions(USER_ID, TX_A, TX_B)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 409 when transaction is already linked', async () => {
    mockTxRepo.findById
      .mockResolvedValueOnce({ ...mockTx, id: TX_A, amount: -100 })
      .mockResolvedValueOnce({ ...mockTx, id: TX_B, amount: 100 });
    mockLinkRepo.findByTransactionId.mockResolvedValue({
      id: 'link-1',
      fromTransactionId: TX_A,
      toTransactionId: TX_B,
      linkType: 'transfer',
      createdAt: new Date(),
    });
    await expect(
      transactionService.linkTransactions(USER_ID, TX_A, TX_B)
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('transactionService.unlinkTransactions', () => {
  it('throws 404 when transaction not found', async () => {
    mockTxRepo.findById.mockResolvedValue(null);
    await expect(transactionService.unlinkTransactions(USER_ID, TX_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 409 when transaction is not linked', async () => {
    mockTxRepo.findById.mockResolvedValue(mockTx);
    mockLinkRepo.findByTransactionId.mockResolvedValue(null);
    await expect(transactionService.unlinkTransactions(USER_ID, TX_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
