import { Router } from 'express';
import { simplefinController } from '@controllers/simplefinController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import {
  connectSimplefinSchema,
  updateSimplefinScheduleSchema,
  mapAccountSchema,
  resolveReviewSchema,
} from '@validators/coreValidators';

const router = Router();

router.use(authenticate);

// ─── Connection ──────────────────────────────────────────────────────────────
router.get('/status', simplefinController.getStatus);
router.post('/connect', validateRequest(connectSimplefinSchema), simplefinController.connect);
router.delete('/disconnect', simplefinController.disconnect);

// ─── Sync ────────────────────────────────────────────────────────────────────
router.post('/sync', simplefinController.sync);

// ─── Schedule ────────────────────────────────────────────────────────────────
router.get('/schedule', simplefinController.getSchedule);
router.patch(
  '/schedule',
  validateRequest(updateSimplefinScheduleSchema),
  simplefinController.updateSchedule
);

// ─── Account Mapping ─────────────────────────────────────────────────────────
router.get('/accounts/unmapped', simplefinController.getUnmappedAccounts);
router.post(
  '/accounts/:simplefinAccountId/map',
  validateRequest(mapAccountSchema),
  simplefinController.mapAccount
);

// ─── Pending Reviews ─────────────────────────────────────────────────────────
router.get('/reviews', simplefinController.getPendingReviews);
router.get('/reviews/count', simplefinController.getPendingReviewCount);
router.post(
  '/reviews/:reviewId/resolve',
  validateRequest(resolveReviewSchema),
  simplefinController.resolveReview
);

export default router;
