import { Router } from 'express';
import { categoryController } from '@controllers/categoryController';
import { authenticateAny } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { createCategorySchema, updateCategorySchema } from '@validators/coreValidators';

const router = Router();

router.use(authenticateAny);

router.get('/', categoryController.list);
router.post('/', validateRequest(createCategorySchema), categoryController.create);
router.get('/:id', categoryController.getById);
router.patch('/:id', validateRequest(updateCategorySchema), categoryController.update);
router.delete('/:id', categoryController.archive);

export default router;
