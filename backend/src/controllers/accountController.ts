import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { accountService } from '@services/core/accountService';
import type { CreateAccountData, UpdateAccountData } from '@types/core.types';

class AccountController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const accounts = await accountService.listAccounts(req.user!.id);
    res.json({ status: 'success', data: { accounts } });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const account = await accountService.getAccount(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: { account } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateAccountData, 'userId'>;
    const account = await accountService.createAccount(req.user!.id, input);
    res.status(201).json({ status: 'success', data: { account } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateAccountData;
    const account = await accountService.updateAccount(req.user!.id, req.params['id']!, input);
    res.json({ status: 'success', data: { account } });
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    await accountService.archiveAccount(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });
}

export const accountController = new AccountController();
