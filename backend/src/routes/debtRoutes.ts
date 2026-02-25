import { Router } from 'express';
import { debtController } from '@controllers/debtController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { upsertDebtScheduleSchema } from '@validators/coreValidators';

const router = Router();

router.use(authenticate);

// Debt schedule CRUD (keyed by accountId)
router.get('/schedule/:accountId', debtController.getSchedule);
router.put(
  '/schedule/:accountId',
  validateRequest(upsertDebtScheduleSchema),
  debtController.upsertSchedule
);
router.delete('/schedule/:accountId', debtController.deleteSchedule);

// Amortization + what-if
router.get('/amortization/:accountId', debtController.getAmortizationSchedule);
router.get('/what-if/:accountId', debtController.whatIfExtraPayment);

// Transaction split lookup
router.get('/split/:transactionId', debtController.getSplit);

export default router;
