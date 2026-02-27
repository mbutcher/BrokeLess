import { Router } from 'express';
import { authenticateAny, requireScope } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { budgetLineController } from '@controllers/budgetLineController';
import { budgetViewQuerySchema, upcomingExpensesSchema } from '@validators/coreValidators';

const router = Router();

router.use(authenticateAny);
router.use(requireScope('budget:read'));

// GET /budget-view?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get(
  '/',
  validateRequest(budgetViewQuerySchema, 'query'),
  budgetLineController.getBudgetView
);

// GET /budget-view/pay-period — current pay period derived from anchor income line
router.get('/pay-period', budgetLineController.getPayPeriod);

// GET /budget-view/upcoming?start=YYYY-MM-DD&end=YYYY-MM-DD[&includeFlexible=true]
router.get(
  '/upcoming',
  validateRequest(upcomingExpensesSchema, 'query'),
  budgetLineController.getUpcoming
);

export default router;
