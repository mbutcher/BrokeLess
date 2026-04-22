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
router.post(
  '/connect',
  requireScope('simplefin:write'),
  validateRequest(connectSimplefinSchema),
  simplefinController.connect
);
router.delete('/disconnect', requireScope('simplefin:write'), simplefinController.disconnect);

// ─── Sync ────────────────────────────────────────────────────────────────────
router.post('/sync', requireScope('simplefin:write'), simplefinController.sync);

// ─── Schedule ────────────────────────────────────────────────────────────────
router.get('/schedule', requireScope('simplefin:read'), simplefinController.getSchedule);
router.patch(
  '/schedule',
  requireScope('simplefin:write'),
  validateRequest(updateSimplefinScheduleSchema),
  simplefinController.updateSchedule
);

// ─── Account Mapping ─────────────────────────────────────────────────────────
router.get('/accounts', requireScope('simplefin:read'), simplefinController.getAllAccounts);
router.get(
  '/accounts/unmapped',
  requireScope('simplefin:read'),
  simplefinController.getUnmappedAccounts
);
router.post(
  '/accounts/:simplefinAccountId/map',
  requireScope('simplefin:write'),
  validateRequest(mapAccountSchema),
  simplefinController.mapAccount
);
router.post(
  '/accounts/:simplefinAccountId/ignore',
  requireScope('simplefin:write'),
  simplefinController.ignoreAccount
);

// ─── Pending Reviews ─────────────────────────────────────────────────────────
router.get('/reviews', requireScope('simplefin:read'), simplefinController.getPendingReviews);
router.get(
  '/reviews/count',
  requireScope('simplefin:read'),
  simplefinController.getPendingReviewCount
);
router.post(
  '/reviews/bulk-accept',
  requireScope('simplefin:write'),
  simplefinController.bulkAcceptReviews
);
router.post(
  '/reviews/:reviewId/resolve',
  requireScope('simplefin:write'),
  validateRequest(resolveReviewSchema),
  simplefinController.resolveReview
);

export default router;
