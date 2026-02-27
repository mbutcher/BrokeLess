import cron from 'node-cron';
import { simplefinRepository } from '@repositories/simplefinRepository';
import { simplefinService } from './simplefinService';
import logger from '@utils/logger';

class SimplefinScheduler {
  private job: cron.ScheduledTask | null = null;

  start(): void {
    // Run every 15 minutes — check each connection for eligibility
    this.job = cron.schedule('*/15 * * * *', () => {
      void this.runEligibleSyncs();
    });
    logger.info('SimpleFIN scheduler started (checking every 15 minutes)');
  }

  private async runEligibleSyncs(): Promise<void> {
    let connections;
    try {
      connections = await simplefinRepository.findAllAutoSyncEligible();
    } catch (err) {
      logger.error('SimpleFIN scheduler: failed to load eligible connections', { err });
      return;
    }

    const nowHour = new Date().getHours();

    for (const conn of connections) {
      // Check time window
      if (nowHour < conn.autoSyncWindowStart || nowHour > conn.autoSyncWindowEnd) {
        continue;
      }

      // Check interval
      const elapsed = conn.lastSyncAt
        ? (Date.now() - new Date(conn.lastSyncAt).getTime()) / 3_600_000
        : Infinity;

      if (elapsed < conn.autoSyncIntervalHours) {
        continue;
      }

      logger.info('SimpleFIN scheduler: triggering sync', { userId: conn.userId });
      void simplefinService.sync(conn.userId).catch((err: unknown) => {
        logger.error('SimpleFIN scheduler: sync failed', { userId: conn.userId, err });
      });
    }
  }

  shutdown(): void {
    this.job?.stop();
    logger.info('SimpleFIN scheduler stopped');
  }
}

export const simplefinScheduler = new SimplefinScheduler();
