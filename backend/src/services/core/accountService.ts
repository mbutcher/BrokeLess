import { accountRepository } from '@repositories/accountRepository';
import { AppError } from '@middleware/errorHandler';
import type {
  Account,
  CreateAccountData,
  UpdateAccountData,
} from '@types/core.types';

class AccountService {
  async listAccounts(userId: string): Promise<Account[]> {
    return accountRepository.findAllForUser(userId);
  }

  async getAccount(userId: string, id: string): Promise<Account> {
    const account = await accountRepository.findById(id, userId);
    if (!account) throw new AppError('Account not found', 404);
    return account;
  }

  async createAccount(
    userId: string,
    input: Omit<CreateAccountData, 'userId'>
  ): Promise<Account> {
    return accountRepository.create({ ...input, userId });
  }

  async updateAccount(
    userId: string,
    id: string,
    input: UpdateAccountData
  ): Promise<Account> {
    const existing = await accountRepository.findById(id, userId);
    if (!existing) throw new AppError('Account not found', 404);

    const updated = await accountRepository.update(id, userId, input);
    return updated!;
  }

  async archiveAccount(userId: string, id: string): Promise<void> {
    const existing = await accountRepository.findById(id, userId);
    if (!existing) throw new AppError('Account not found', 404);
    if (!existing.isActive) throw new AppError('Account is already archived', 409);

    await accountRepository.softDelete(id, userId);
  }
}

export const accountService = new AccountService();
