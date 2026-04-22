import { Router } from 'express';
import { categorizationRuleController } from '@controllers/categorizationRuleController';
import { authenticateAny, requireScope } from '@middleware/authenticate';

const router = Router();

router.use(authenticateAny);

router.get('/', requireScope('transactions:read'), categorizationRuleController.list);
router.post('/', requireScope('transactions:write'), categorizationRuleController.create);
router.delete('/:id', requireScope('transactions:write'), categorizationRuleController.delete);

export default router;
