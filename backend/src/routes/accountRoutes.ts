import { Router } from 'express';
import { accountController } from '@controllers/accountController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { createAccountSchema, updateAccountSchema } from '@validators/coreValidators';

const router = Router();

router.use(authenticate);

router.get('/', accountController.list);
router.post('/', validateRequest(createAccountSchema), accountController.create);
router.get('/:id', accountController.get);
router.patch('/:id', validateRequest(updateAccountSchema), accountController.update);
router.delete('/:id', accountController.archive);

export default router;
