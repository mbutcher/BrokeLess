import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { budgetService } from '@services/core/budgetService';
import type { CreateBudgetData, UpdateBudgetData, BudgetCategoryEntry } from '@typings/core.types';

class BudgetController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const budgets = await budgetService.listBudgets(req.user!.id);
    res.json({ status: 'success', data: { budgets } });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const progress = await budgetService.getBudgetProgress(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: { budget: progress } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateBudgetData, 'userId'>;
    const budget = await budgetService.createBudget(req.user!.id, input);
    res.status(201).json({ status: 'success', data: { budget } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateBudgetData;
    const budget = await budgetService.updateBudget(req.user!.id, req.params['id']!, input);
    res.json({ status: 'success', data: { budget } });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await budgetService.deleteBudget(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });

  upsertCategories = asyncHandler(async (req: Request, res: Response) => {
    const { categories } = req.body as { categories: BudgetCategoryEntry[] };
    await budgetService.upsertBudgetCategories(req.user!.id, req.params['id']!, categories);
    res.json({ status: 'success', data: null });
  });
}

export const budgetController = new BudgetController();
