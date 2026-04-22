import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { categorizationRuleService } from '@services/core/categorizationRuleService';

class CategorizationRuleController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const rules = await categorizationRuleService.listRules(req.user!.id);
    res.json({ status: 'success', data: { rules } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const { payee, categoryId, budgetLineId } = req.body as {
      payee: string;
      categoryId?: string | null;
      budgetLineId?: string | null;
    };
    const rule = await categorizationRuleService.createRule(req.user!.id, {
      payee,
      categoryId,
      budgetLineId,
    });
    res.status(201).json({ status: 'success', data: { rule } });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await categorizationRuleService.deleteRule(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });
}

export const categorizationRuleController = new CategorizationRuleController();
