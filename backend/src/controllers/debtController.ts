import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';
import { debtService } from '@services/core/debtService';
import { whatIfQuerySchema } from '@validators/coreValidators';
import type { UpsertDebtScheduleData } from '@typings/core.types';

class DebtController {
  getSchedule = asyncHandler(async (req: Request, res: Response) => {
    const schedule = await debtService.getSchedule(req.user!.id, req.params['accountId']!);
    if (!schedule) throw new AppError('Debt schedule not found', 404);
    res.json({ status: 'success', data: { schedule } });
  });

  upsertSchedule = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<UpsertDebtScheduleData, 'accountId'>;
    const schedule = await debtService.upsertSchedule(req.user!.id, {
      ...input,
      accountId: req.params['accountId']!,
    });
    res.json({ status: 'success', data: { schedule } });
  });

  deleteSchedule = asyncHandler(async (req: Request, res: Response) => {
    await debtService.deleteSchedule(req.user!.id, req.params['accountId']!);
    res.json({ status: 'success', data: null });
  });

  getAmortizationSchedule = asyncHandler(async (req: Request, res: Response) => {
    const result = await debtService.getAmortizationSchedule(
      req.user!.id,
      req.params['accountId']!
    );
    res.json({ status: 'success', data: result });
  });

  whatIfExtraPayment = asyncHandler(async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { error, value } = whatIfQuerySchema.validate(req.query);
    if (error) throw new AppError(error.details[0]?.message ?? 'Invalid query', 400);

    const result = await debtService.whatIfExtraPayment(
      req.user!.id,
      req.params['accountId']!,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      value.extraMonthly as number
    );
    res.json({ status: 'success', data: result });
  });

  getSplit = asyncHandler(async (req: Request, res: Response) => {
    const split = await debtService.getSplitForTransaction(
      req.user!.id,
      req.params['transactionId']!
    );
    res.json({ status: 'success', data: { split } });
  });
}

export const debtController = new DebtController();
