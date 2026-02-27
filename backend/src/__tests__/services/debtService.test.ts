import { debtService } from '@services/core/debtService';
import { debtRepository } from '@repositories/debtRepository';
import { accountRepository } from '@repositories/accountRepository';
import { transactionRepository } from '@repositories/transactionRepository';

jest.mock('@repositories/debtRepository');
jest.mock('@repositories/accountRepository');
jest.mock('@repositories/transactionRepository');
jest.mock('@utils/logger', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));

const mockDebtRepo = debtRepository as jest.Mocked<typeof debtRepository>;
const mockAccountRepo = accountRepository as jest.Mocked<typeof accountRepository>;
const mockTxRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;

const USER_ID = 'user-123';
const ACCOUNT_ID = 'account-456';

const mockAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: 'My Loan',
  type: 'loan' as const,
  isAsset: false,
  startingBalance: -10000,
  currentBalance: -8500,
  currency: 'USD',
  color: null,
  institution: null,
  annualRate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSchedule = {
  id: 'sched-1',
  userId: USER_ID,
  accountId: ACCOUNT_ID,
  principal: 10000,
  annualRate: 0.06, // 6% APR
  termMonths: 60,
  originationDate: '2024-01-01',
  paymentAmount: 193.33,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('debtService.getAmortizationSchedule', () => {
  it('returns amortization schedule with correct structure', async () => {
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(mockSchedule);

    const result = await debtService.getAmortizationSchedule(USER_ID, ACCOUNT_ID);

    expect(result.schedule.length).toBeGreaterThan(0);
    expect(result.schedule.length).toBeLessThanOrEqual(60);
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.payoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // First row should have interest = principal * monthlyRate
    const firstRow = result.schedule[0];
    expect(firstRow).toBeDefined();
    expect(firstRow!.month).toBe(1);
    expect(firstRow!.interest).toBeCloseTo(10000 * (0.06 / 12), 1);
    expect(firstRow!.balance).toBeGreaterThan(0);
    expect(firstRow!.balance).toBeLessThan(10000);
  });

  it('throws 404 when schedule not found', async () => {
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(null);

    await expect(debtService.getAmortizationSchedule(USER_ID, ACCOUNT_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('balance reaches zero by final payment', async () => {
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(mockSchedule);

    const result = await debtService.getAmortizationSchedule(USER_ID, ACCOUNT_ID);
    const lastRow = result.schedule[result.schedule.length - 1];

    expect(lastRow!.balance).toBeLessThanOrEqual(0.01);
  });
});

describe('debtService amortization math (pure)', () => {
  it('correctly splits interest and principal for known loan', async () => {
    // $1000 loan at 12% APR for 12 months => monthly payment ~$88.85
    const schedule = {
      ...mockSchedule,
      principal: 1000,
      annualRate: 0.12,
      termMonths: 12,
      paymentAmount: 88.85,
    };
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(schedule);

    const result = await debtService.getAmortizationSchedule(USER_ID, ACCOUNT_ID);

    // Month 1 interest: $1000 * 0.01 = $10.00
    expect(result.schedule[0]!.interest).toBeCloseTo(10.0, 1);
    // Month 1 principal: ~$78.85
    expect(result.schedule[0]!.principal).toBeCloseTo(78.85, 0);
  });
});

describe('debtService.whatIfExtraPayment', () => {
  it('returns fewer months and less interest with extra payment', async () => {
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(mockSchedule);

    const result = await debtService.whatIfExtraPayment(USER_ID, ACCOUNT_ID, 50);

    expect(result.monthsSaved).toBeGreaterThan(0);
    expect(result.interestSaved).toBeGreaterThan(0);
    expect(new Date(result.newPayoffDate).getTime()).toBeLessThan(
      new Date(result.originalPayoffDate).getTime()
    );
  });
});

describe('debtService.autoSplitPayment', () => {
  it('returns null when no schedule exists', async () => {
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(null);

    const result = await debtService.autoSplitPayment('tx-1', ACCOUNT_ID, USER_ID, -200);

    expect(result).toBeNull();
  });

  it('creates split when schedule and account exist', async () => {
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(mockSchedule);
    mockAccountRepo.findById.mockResolvedValue(mockAccount);
    const mockSplit = {
      id: 'split-1',
      transactionId: 'tx-1',
      principalAmount: 150.33,
      interestAmount: 42.5,
      createdAt: new Date(),
    };
    mockDebtRepo.createSplit.mockResolvedValue(mockSplit);

    const result = await debtService.autoSplitPayment('tx-1', ACCOUNT_ID, USER_ID, -193.33);

    expect(result).not.toBeNull();
    expect(mockDebtRepo.createSplit).toHaveBeenCalled();
  });

  it('returns null (non-fatal) when createSplit throws', async () => {
    mockDebtRepo.findByUserAndAccount.mockResolvedValue(mockSchedule);
    mockAccountRepo.findById.mockResolvedValue(mockAccount);
    mockDebtRepo.createSplit.mockRejectedValue(new Error('DB error'));

    const result = await debtService.autoSplitPayment('tx-1', ACCOUNT_ID, USER_ID, -193.33);

    expect(result).toBeNull();
  });
});

describe('debtService.getSplitForTransaction', () => {
  it('throws 404 when transaction not found for user', async () => {
    mockTxRepo.findById.mockResolvedValue(null);

    await expect(debtService.getSplitForTransaction(USER_ID, 'tx-999')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
