import { Router } from 'express';
import { authenticateAny } from '@middleware/authenticate';
import { dashboardController } from '@controllers/dashboardController';

const router = Router();

router.use(authenticateAny);

router.get('/config', dashboardController.getConfig);
router.put('/config', dashboardController.putConfig);
router.get('/hints', dashboardController.getHints);

export default router;
