import { Router } from 'express';
import { accountController } from '@controllers/accountController';
import { accountShareController } from '@controllers/accountShareController';
import { authenticateAny, requireScope } from '@middleware/authenticate';
import { loadHousehold } from '@middleware/requireHousehold';
import { validateRequest } from '@middleware/validateRequest';
import {
  createAccountSchema,
  updateAccountSchema,
  putSharesSchema,
  patchShareSchema,
} from '@validators/coreValidators';

const router = Router();

router.use(authenticateAny);
router.use(loadHousehold);

router.get('/', requireScope('accounts:read'), accountController.list);
router.post(
  '/',
  requireScope('accounts:write'),
  validateRequest(createAccountSchema),
  accountController.create
);
router.get('/:id', requireScope('accounts:read'), accountController.get);
router.patch(
  '/:id',
  requireScope('accounts:write'),
  validateRequest(updateAccountSchema),
  accountController.update
);
router.delete('/:id', requireScope('accounts:write'), accountController.archive);
router.get(
  '/:id/transaction-count',
  requireScope('accounts:read'),
  accountController.transactionCount
);
router.delete('/:id/permanent', requireScope('accounts:write'), accountController.destroy);

// ─── Account share management ─────────────────────────────────────────────────
router.get('/:id/shares', requireScope('accounts:read'), accountShareController.getShares);
router.put(
  '/:id/shares',
  requireScope('accounts:write'),
  validateRequest(putSharesSchema),
  accountShareController.putShares
);
router.patch(
  '/:id/shares/:userId',
  requireScope('accounts:write'),
  validateRequest(patchShareSchema),
  accountShareController.patchShare
);

export default router;
