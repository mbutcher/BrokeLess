import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { budgetLineController } from '@controllers/budgetLineController';
import { createBudgetLineSchema, updateBudgetLineSchema } from '@validators/coreValidators';

const router = Router();

// All budget-line routes require authentication
router.use(authenticate);

// ─── Budget Lines ─────────────────────────────────────────────────────────────
router.get('/', budgetLineController.list);
router.post('/', validateRequest(createBudgetLineSchema), budgetLineController.create);
router.get('/:id', budgetLineController.get);
router.patch('/:id', validateRequest(updateBudgetLineSchema), budgetLineController.update);
router.delete('/:id', budgetLineController.delete);

export default router;
