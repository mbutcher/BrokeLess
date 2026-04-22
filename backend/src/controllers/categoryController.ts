import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { categoryService } from '@services/core/categoryService';
import type { CreateCategoryData, UpdateCategoryData } from '@typings/core.types';

class CategoryController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.listCategories(req.user!.householdId!);
    res.json({ status: 'success', data: { categories } });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.getCategory(req.user!.householdId!, req.params['id']!);
    res.json({ status: 'success', data: { category } });
  });

  getUsage = asyncHandler(async (req: Request, res: Response) => {
    const usage = await categoryService.getCategoryUsage(
      req.user!.householdId!,
      req.params['id']!,
      req.user!.id
    );
    res.json({ status: 'success', data: { usage } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateCategoryData, 'householdId'>;
    const category = await categoryService.createCategory(req.user!.householdId!, input);
    res.status(201).json({ status: 'success', data: { category } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateCategoryData;
    const category = await categoryService.updateCategory(
      req.user!.householdId!,
      req.params['id']!,
      input
    );
    res.json({ status: 'success', data: { category } });
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    await categoryService.archiveCategory(req.user!.householdId!, req.params['id']!);
    res.json({ status: 'success', data: null });
  });

  reassignAndArchive = asyncHandler(async (req: Request, res: Response) => {
    const { targetCategoryId } = req.body as { targetCategoryId: string | null };
    const result = await categoryService.reassignAndArchive(
      req.user!.householdId!,
      req.params['id']!,
      req.user!.id,
      targetCategoryId ?? null
    );
    res.json({ status: 'success', data: result });
  });
}

export const categoryController = new CategoryController();
