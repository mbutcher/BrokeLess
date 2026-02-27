import { Router } from 'express';
import { authenticateAny } from '@middleware/authenticate';
import { syncController } from '@controllers/syncController';

const router = Router();

// All sync endpoints require authentication
router.get('/', authenticateAny, syncController.get);

export default router;
