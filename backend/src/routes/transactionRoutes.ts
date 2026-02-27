import { Router } from 'express';
import { transactionController } from '@controllers/transactionController';
import { authenticateAny, requireScope } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import {
  createTransactionSchema,
  updateTransactionSchema,
  linkTransactionSchema,
} from '@validators/coreValidators';

const router = Router();

router.use(authenticateAny);

router.get('/', requireScope('transactions:read'), transactionController.list);
router.post(
  '/',
  requireScope('transactions:write'),
  validateRequest(createTransactionSchema),
  transactionController.create
);
router.get('/:id', requireScope('transactions:read'), transactionController.get);
router.patch('/:id', validateRequest(updateTransactionSchema), transactionController.update);
router.delete('/:id', transactionController.delete);

// Transfer linking
router.get('/:id/candidates', transactionController.getCandidates);
router.post('/:id/link', validateRequest(linkTransactionSchema), transactionController.link);
router.delete('/:id/link', transactionController.unlink);

export default router;
