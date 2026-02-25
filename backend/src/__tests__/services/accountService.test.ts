import { accountService } from '@services/core/accountService';
import { accountRepository } from '@repositories/accountRepository';

// Mock the repository
jest.mock('@repositories/accountRepository');
const mockRepo = accountRepository as jest.Mocked<typeof accountRepository>;

const USER_ID = 'user-123';
const ACCOUNT_ID = 'account-456';

const mockAccount = {
  id: ACCOUNT_ID,
  userId: USER_ID,
  name: 'Chase Checking',
  type: 'checking' as const,
  isAsset: true,
  startingBalance: 1000,
  currentBalance: 1500,
  currency: 'USD',
  color: '#3b82f6',
  institution: 'Chase',
  annualRate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('accountService.listAccounts', () => {
  it('returns accounts from repository', async () => {
    mockRepo.findAllForUser.mockResolvedValue([mockAccount]);
    const accounts = await accountService.listAccounts(USER_ID);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual(mockAccount);
    expect(mockRepo.findAllForUser).toHaveBeenCalledWith(USER_ID);
  });
});

describe('accountService.getAccount', () => {
  it('returns account when found', async () => {
    mockRepo.findById.mockResolvedValue(mockAccount);
    const account = await accountService.getAccount(USER_ID, ACCOUNT_ID);
    expect(account).toEqual(mockAccount);
    expect(mockRepo.findById).toHaveBeenCalledWith(ACCOUNT_ID, USER_ID);
  });

  it('throws 404 when account not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(accountService.getAccount(USER_ID, ACCOUNT_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('accountService.createAccount', () => {
  it('calls repository with userId prepended', async () => {
    mockRepo.create.mockResolvedValue(mockAccount);
    const input = {
      name: 'Chase Checking',
      type: 'checking' as const,
      isAsset: true,
      startingBalance: 1000,
      currency: 'USD',
    };
    const account = await accountService.createAccount(USER_ID, input);
    expect(account).toEqual(mockAccount);
    expect(mockRepo.create).toHaveBeenCalledWith({ ...input, userId: USER_ID });
  });
});

describe('accountService.updateAccount', () => {
  it('throws 404 when account not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      accountService.updateAccount(USER_ID, ACCOUNT_ID, { name: 'New Name' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updates and returns account', async () => {
    const updated = { ...mockAccount, name: 'New Name' };
    mockRepo.findById.mockResolvedValue(mockAccount);
    mockRepo.update.mockResolvedValue(updated);
    const result = await accountService.updateAccount(USER_ID, ACCOUNT_ID, { name: 'New Name' });
    expect(result.name).toBe('New Name');
  });
});

describe('accountService.archiveAccount', () => {
  it('throws 404 when account not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(accountService.archiveAccount(USER_ID, ACCOUNT_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 409 when already archived', async () => {
    mockRepo.findById.mockResolvedValue({ ...mockAccount, isActive: false });
    await expect(accountService.archiveAccount(USER_ID, ACCOUNT_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('soft-deletes active account', async () => {
    mockRepo.findById.mockResolvedValue(mockAccount);
    mockRepo.softDelete.mockResolvedValue();
    await accountService.archiveAccount(USER_ID, ACCOUNT_ID);
    expect(mockRepo.softDelete).toHaveBeenCalledWith(ACCOUNT_ID, USER_ID);
  });
});
