import { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';
import { pushSubscriptionRepository } from '@repositories/pushSubscriptionRepository';
import { isPushEnabled } from '@services/notifications/pushNotificationService';
import { env } from '@config/env';
import { logger } from '@utils/logger';

export const pushController = {
  /** GET /push/vapid-key — returns the VAPID public key (no auth required) */
  getVapidKey: asyncHandler((_req: Request, res: Response) => {
    if (!isPushEnabled()) {
      res.json({ status: 'success', data: { vapidPublicKey: null } });
      return;
    }
    res.json({ status: 'success', data: { vapidPublicKey: env.push.vapidPublicKey } });
  }),

  /** POST /push/subscribe — register a push subscription for the current user */
  subscribe: asyncHandler(async (req: Request, res: Response) => {
    if (!isPushEnabled()) {
      throw new AppError('Push notifications are not configured on this server', 503);
    }
    const userId = req.user!.id;
    const { endpoint, keys, deviceName } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      deviceName?: string;
    };

    // Remove any existing subscription with the same endpoint to avoid duplicates
    await pushSubscriptionRepository.deleteByEndpoint(endpoint, userId);

    const sub = await pushSubscriptionRepository.create({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      deviceName: deviceName ?? null,
    });

    logger.debug('Push subscription registered', { userId, id: sub.id });
    res.status(201).json({ status: 'success', data: { subscription: sub } });
  }),

  /** DELETE /push/subscribe/:id — remove a specific push subscription */
  unsubscribe: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const sub = await pushSubscriptionRepository.findById(id);
    if (!sub || sub.userId !== userId) {
      throw new AppError('Subscription not found', 404);
    }

    await pushSubscriptionRepository.delete(id);
    res.json({ status: 'success', data: null });
  }),

  /** GET /push/subscriptions — list the user's push subscriptions */
  listSubscriptions: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscriptions = await pushSubscriptionRepository.findByUser(userId);
    res.json({ status: 'success', data: { subscriptions } });
  }),
};
