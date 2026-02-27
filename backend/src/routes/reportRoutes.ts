import { Router } from 'express';
import { reportController } from '@controllers/reportController';
import { authenticateAny, requireScope } from '@middleware/authenticate';

const router = Router();

router.use(authenticateAny);
router.use(requireScope('reports:read'));

router.get('/monthly-summary', reportController.monthlySummary);
router.get('/forecast', reportController.forecast);
router.get('/spending-by-category', reportController.spendingByCategory);
router.get('/net-worth', reportController.netWorthHistory);
router.post('/net-worth/snapshot', reportController.takeNetWorthSnapshot);
router.get('/top-payees', reportController.topPayees);

export default router;
