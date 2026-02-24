import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { syncController } from '@controllers/syncController';

const router = Router();

// All sync endpoints require authentication
router.get('/', authenticate, syncController.get);

export default router;
