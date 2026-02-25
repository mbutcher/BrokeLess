import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { recurringTransactionService } from '@services/core/recurringTransactionService';
import type {
  CreateRecurringTransactionData,
  UpdateRecurringTransactionData,
} from '@typings/core.types';

class RecurringTransactionController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const records = await recurringTransactionService.getAll(req.user!.id);
    res.json({ status: 'success', data: { recurringTransactions: records } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateRecurringTransactionData, 'userId'>;
    const record = await recurringTransactionService.create(req.user!.id, input);
    res.status(201).json({ status: 'success', data: { recurringTransaction: record } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateRecurringTransactionData;
    const record = await recurringTransactionService.update(req.user!.id, req.params['id']!, input);
    res.json({ status: 'success', data: { recurringTransaction: record } });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await recurringTransactionService.delete(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });

  /** Manual trigger for generating due transactions. Useful for debugging. */
  generate = asyncHandler(async (_req: Request, res: Response) => {
    const count = await recurringTransactionService.generateDue();
    res.json({ status: 'success', data: { generated: count } });
  });
}

export const recurringTransactionController = new RecurringTransactionController();
