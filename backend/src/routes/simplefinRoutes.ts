import { Router } from 'express';
import { simplefinController } from '@controllers/simplefinController';
import { authenticateAny, requireScope } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import {
  connectSimplefinSchema,
  updateSimplefinScheduleSchema,
  mapAccountSchema,
  resolveReviewSchema,
} from '@validators/coreValidators';

const router = Router();

router.use(authenticateAny);

// ─── Connection ──────────────────────────────────────────────────────────────
router.get('/status', requireScope('simplefin:read'), simplefinController.getStatus);
router.post('/connect', validateRequest(connectSimplefinSchema), simplefinController.connect);
router.delete('/disconnect', simplefinController.disconnect);

// ─── Sync ────────────────────────────────────────────────────────────────────
router.post('/sync', requireScope('simplefin:write'), simplefinController.sync);

// ─── Schedule ────────────────────────────────────────────────────────────────
router.get('/schedule', requireScope('simplefin:read'), simplefinController.getSchedule);
router.patch(
  '/schedule',
  validateRequest(updateSimplefinScheduleSchema),
  simplefinController.updateSchedule
);

// ─── Account Mapping ─────────────────────────────────────────────────────────
router.get(
  '/accounts/unmapped',
  requireScope('simplefin:read'),
  simplefinController.getUnmappedAccounts
);
router.post(
  '/accounts/:simplefinAccountId/map',
  validateRequest(mapAccountSchema),
  simplefinController.mapAccount
);

// ─── Pending Reviews ─────────────────────────────────────────────────────────
router.get('/reviews', requireScope('simplefin:read'), simplefinController.getPendingReviews);
router.get(
  '/reviews/count',
  requireScope('simplefin:read'),
  simplefinController.getPendingReviewCount
);
router.post(
  '/reviews/:reviewId/resolve',
  validateRequest(resolveReviewSchema),
  simplefinController.resolveReview
);

export default router;
