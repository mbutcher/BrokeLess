import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { recurringTransactionController } from '@controllers/recurringTransactionController';
import {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
} from '@validators/coreValidators';

const router = Router();

router.use(authenticate);

router.get('/', recurringTransactionController.list);
router.post(
  '/',
  validateRequest(createRecurringTransactionSchema),
  recurringTransactionController.create
);
router.patch(
  '/:id',
  validateRequest(updateRecurringTransactionSchema),
  recurringTransactionController.update
);
router.delete('/:id', recurringTransactionController.delete);
// Manual generation trigger — useful for debugging / admin
router.post('/generate', recurringTransactionController.generate);

export default router;
