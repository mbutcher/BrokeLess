import { Router } from 'express';
import { authenticateAny } from '@middleware/authenticate';
import { loadHousehold } from '@middleware/requireHousehold';
import { validateRequest } from '@middleware/validateRequest';
import { budgetLineController } from '@controllers/budgetLineController';
import { createBudgetLineSchema, updateBudgetLineSchema } from '@validators/coreValidators';

const router = Router();

// All budget-line routes require authentication + household context
router.use(authenticateAny);
router.use(loadHousehold);

// ─── Budget Lines ─────────────────────────────────────────────────────────────
router.get('/', budgetLineController.list);
router.post('/', validateRequest(createBudgetLineSchema), budgetLineController.create);
router.get('/:id', budgetLineController.get);
router.patch('/:id', validateRequest(updateBudgetLineSchema), budgetLineController.update);
router.delete('/:id', budgetLineController.delete);

export default router;
