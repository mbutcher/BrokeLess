import { Router } from 'express';
import { adminController } from '@controllers/adminController';

const router = Router();

// Staging-only: wipe the database, re-run migrations, and re-run seeds.
// Gated at registration time in routes/index.ts (NODE_ENV === 'staging')
// AND by an X-Reset-Token header checked in the controller.
router.post('/reset-seeds', adminController.resetSeeds);

export default router;
