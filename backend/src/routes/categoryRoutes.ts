import { Router } from 'express';
import { categoryController } from '@controllers/categoryController';
import { authenticateAny, requireScope } from '@middleware/authenticate';
import { loadHousehold } from '@middleware/requireHousehold';
import { validateRequest } from '@middleware/validateRequest';
import { createCategorySchema, updateCategorySchema } from '@validators/coreValidators';

const router = Router();

router.use(authenticateAny);
router.use(loadHousehold);

router.get('/', requireScope('categories:read'), categoryController.list);
router.post(
  '/',
  requireScope('categories:write'),
  validateRequest(createCategorySchema),
  categoryController.create
);
router.get('/:id', requireScope('categories:read'), categoryController.getById);
router.get('/:id/usage', requireScope('categories:read'), categoryController.getUsage);
router.patch(
  '/:id',
  requireScope('categories:write'),
  validateRequest(updateCategorySchema),
  categoryController.update
);
router.delete('/:id', requireScope('categories:write'), categoryController.archive);
router.post(
  '/:id/reassign',
  requireScope('categories:write'),
  categoryController.reassignAndArchive
);

export default router;
