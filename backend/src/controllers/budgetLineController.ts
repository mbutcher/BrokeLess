import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';
import { budgetLineService } from '@services/core/budgetLineService';
import type { CreateBudgetLineData, UpdateBudgetLineData } from '@typings/core.types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class BudgetLineController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const lines = await budgetLineService.listBudgetLines(req.user!.id);
    res.json({ status: 'success', data: { budgetLines: lines } });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const line = await budgetLineService.getBudgetLine(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: { budgetLine: line } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateBudgetLineData, 'userId'>;
    const line = await budgetLineService.createBudgetLine(req.user!.id, input);
    res.status(201).json({ status: 'success', data: { budgetLine: line } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateBudgetLineData;
    const line = await budgetLineService.updateBudgetLine(req.user!.id, req.params['id']!, input);
    res.json({ status: 'success', data: { budgetLine: line } });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await budgetLineService.deleteBudgetLine(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });

  getBudgetView = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = req.query;
    if (typeof start !== 'string' || !ISO_DATE_RE.test(start)) {
      throw new AppError('start must be a valid ISO date (YYYY-MM-DD)', 400);
    }
    if (typeof end !== 'string' || !ISO_DATE_RE.test(end)) {
      throw new AppError('end must be a valid ISO date (YYYY-MM-DD)', 400);
    }
    const view = await budgetLineService.getBudgetView(req.user!.id, start, end);
    res.json({ status: 'success', data: { budgetView: view } });
  });

  getPayPeriod = asyncHandler(async (req: Request, res: Response) => {
    const period = await budgetLineService.getCurrentPayPeriod(req.user!.id);
    res.json({ status: 'success', data: { payPeriod: period } });
  });
}

export const budgetLineController = new BudgetLineController();
