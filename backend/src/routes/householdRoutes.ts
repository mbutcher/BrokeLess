import { Router } from 'express';
import { householdController } from '@controllers/householdController';
import { authenticate } from '@middleware/authenticate';
import { loadHousehold, requireOwner } from '@middleware/requireHousehold';
import { validateRequest } from '@middleware/validateRequest';
import {
  onboardingSchema,
  setupHouseholdSchema,
  updateHouseholdSchema,
  addMemberSchema,
} from '@validators/coreValidators';

const router = Router();

// POST /household/setup — no household yet required; auth only
router.post(
  '/setup',
  authenticate,
  validateRequest(setupHouseholdSchema),
  householdController.setup
);

// POST /household/onboarding — seeds categories; requires existing household
router.post(
  '/onboarding',
  authenticate,
  loadHousehold,
  validateRequest(onboardingSchema),
  householdController.onboarding
);

// All remaining routes require an existing household
router.get('/', authenticate, loadHousehold, householdController.get);
router.patch(
  '/',
  authenticate,
  loadHousehold,
  requireOwner,
  validateRequest(updateHouseholdSchema),
  householdController.update
);
router.post(
  '/members',
  authenticate,
  loadHousehold,
  requireOwner,
  validateRequest(addMemberSchema),
  householdController.addMember
);
router.delete(
  '/members/:userId',
  authenticate,
  loadHousehold,
  requireOwner,
  householdController.removeMember
);

export default router;
