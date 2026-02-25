import { Router } from 'express';
import { budgetController } from '@controllers/budgetController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetCategoriesSchema,
} from '@validators/coreValidators';

const router = Router();

router.use(authenticate);

router.get('/', budgetController.list);
router.post('/', validateRequest(createBudgetSchema), budgetController.create);
router.get('/:id', budgetController.get);
router.patch('/:id', validateRequest(updateBudgetSchema), budgetController.update);
router.delete('/:id', budgetController.delete);
router.put(
  '/:id/categories',
  validateRequest(budgetCategoriesSchema),
  budgetController.upsertCategories
);

export default router;
