import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { simplefinService } from '@services/integrations/simplefinService';
import type { MapAccountData, UpdateSimplefinScheduleData } from '@typings/core.types';

class SimplefinController {
  // ─── Connection ────────────────────────────────────────────────────────────

  getStatus = asyncHandler(async (req: Request, res: Response) => {
    const connection = await simplefinService.getConnection(req.user!.id);
    res.json({ status: 'success', data: { connection } });
  });

  connect = asyncHandler(async (req: Request, res: Response) => {
    const { setupToken } = req.body as { setupToken: string };
    const connection = await simplefinService.connect(req.user!.id, setupToken);
    res.status(201).json({ status: 'success', data: { connection } });
  });

  disconnect = asyncHandler(async (req: Request, res: Response) => {
    await simplefinService.disconnect(req.user!.id);
    res.json({ status: 'success', data: null });
  });

  // ─── Sync ──────────────────────────────────────────────────────────────────

  sync = asyncHandler(async (req: Request, res: Response) => {
    const result = await simplefinService.sync(req.user!.id);
    res.json({ status: 'success', data: { result } });
  });

  // ─── Schedule ──────────────────────────────────────────────────────────────

  getSchedule = asyncHandler(async (req: Request, res: Response) => {
    const connection = await simplefinService.getSchedule(req.user!.id);
    res.json({ status: 'success', data: { connection } });
  });

  updateSchedule = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateSimplefinScheduleData;
    const connection = await simplefinService.updateSchedule(req.user!.id, input);
    res.json({ status: 'success', data: { connection } });
  });

  // ─── Account Mapping ───────────────────────────────────────────────────────

  getUnmappedAccounts = asyncHandler(async (req: Request, res: Response) => {
    const accounts = await simplefinService.getUnmappedAccounts(req.user!.id);
    res.json({ status: 'success', data: { accounts } });
  });

  mapAccount = asyncHandler(async (req: Request, res: Response) => {
    const { simplefinAccountId } = req.params;
    const input = req.body as MapAccountData;
    await simplefinService.mapAccount(req.user!.id, simplefinAccountId!, input);
    res.json({ status: 'success', data: null });
  });

  // ─── Pending Reviews ───────────────────────────────────────────────────────

  getPendingReviews = asyncHandler(async (req: Request, res: Response) => {
    const reviews = await simplefinService.getPendingReviews(req.user!.id);
    res.json({ status: 'success', data: { reviews } });
  });

  getPendingReviewCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await simplefinService.getPendingReviewCount(req.user!.id);
    res.json({ status: 'success', data: { count } });
  });

  resolveReview = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const { action, targetTransactionId } = req.body as {
      action: 'accept' | 'merge' | 'discard';
      targetTransactionId?: string;
    };
    await simplefinService.resolveReview(req.user!.id, reviewId!, action, targetTransactionId);
    res.json({ status: 'success', data: null });
  });
}

export const simplefinController = new SimplefinController();
