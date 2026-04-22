import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { householdService } from '@services/core/householdService';
import type { OnboardingOptions } from '@services/core/categoryService';

class HouseholdController {
  setup = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body as { name: string };
    const household = await householdService.setup(req.user!.id, name);
    res.status(201).json({ status: 'success', data: { household } });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const household = await householdService.getHousehold(req.user!.id);
    res.json({ status: 'success', data: { household } });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body as { name: string };
    const household = await householdService.updateHousehold(req.user!.householdId!, name);
    res.json({ status: 'success', data: { household } });
  });

  addMember = asyncHandler(async (req: Request, res: Response) => {
    const user = await householdService.addMember(
      req.user!.id,
      req.body as Parameters<typeof householdService.addMember>[1]
    );
    res.status(201).json({ status: 'success', data: { user } });
  });

  removeMember = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    await householdService.removeMember(req.user!.id, userId!);
    res.json({ status: 'success', data: null });
  });

  onboarding = asyncHandler(async (req: Request, res: Response) => {
    const householdId = req.user!.householdId!;
    const opts = req.body as OnboardingOptions;
    await householdService.applyOnboarding(householdId, opts);
    res.json({ status: 'success', data: null });
  });
}

export const householdController = new HouseholdController();
