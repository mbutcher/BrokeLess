import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { budgetLineController } from '@controllers/budgetLineController';

const router = Router();

router.use(authenticate);

// GET /budget-view?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', budgetLineController.getBudgetView);

// GET /budget-view/pay-period — current pay period derived from anchor income line
router.get('/pay-period', budgetLineController.getPayPeriod);

export default router;
