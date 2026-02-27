import { Router } from 'express';
import { savingsGoalController } from '@controllers/savingsGoalController';
import { authenticateAny } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { createSavingsGoalSchema, updateSavingsGoalSchema } from '@validators/coreValidators';

const router = Router();

router.use(authenticateAny);

router.get('/', savingsGoalController.list);
router.post('/', validateRequest(createSavingsGoalSchema), savingsGoalController.create);
router.get('/:id', savingsGoalController.get);
router.patch('/:id', validateRequest(updateSavingsGoalSchema), savingsGoalController.update);
router.delete('/:id', savingsGoalController.delete);
router.get('/:id/progress', savingsGoalController.getProgress);

export default router;
