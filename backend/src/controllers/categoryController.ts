import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { categoryService } from '@services/core/categoryService';
import type { CreateCategoryData, UpdateCategoryData } from '@types/core.types';

class CategoryController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.listCategories(req.user!.id);
    res.json({ status: 'success', data: { categories } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateCategoryData, 'userId'>;
    const category = await categoryService.createCategory(req.user!.id, input);
    res.status(201).json({ status: 'success', data: { category } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateCategoryData;
    const category = await categoryService.updateCategory(req.user!.id, req.params['id']!, input);
    res.json({ status: 'success', data: { category } });
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    await categoryService.archiveCategory(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });
}

export const categoryController = new CategoryController();
