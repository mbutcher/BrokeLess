import cron from 'node-cron';
import { getDatabase } from '@config/database';
import { netWorthSnapshotRepository } from '@repositories/netWorthSnapshotRepository';
import logger from '@utils/logger';

class NetWorthScheduler {
  private job: cron.ScheduledTask | null = null;

  start(): void {
    // Run at 2 AM daily
    this.job = cron.schedule('0 2 * * *', () => {
      void this.takeSnapshotsForAllUsers();
    });
    logger.info('Net worth scheduler started (daily at 02:00)');
  }

  private async takeSnapshotsForAllUsers(): Promise<void> {
    let userIds: string[];
    try {
      const rows = await getDatabase()('users').where({ is_active: true }).select('id');
      userIds = rows.map((r: Record<string, unknown>) => r['id'] as string);
    } catch (err) {
      logger.error('Net worth scheduler: failed to load active users', { err });
      return;
    }

    for (const userId of userIds) {
      try {
        await netWorthSnapshotRepository.takeSnapshot(userId);
        logger.debug('Net worth scheduler: snapshot taken', { userId });
      } catch (err) {
        logger.error('Net worth scheduler: snapshot failed', { userId, err });
      }
    }

    logger.info(`Net worth scheduler: snapshots taken for ${userIds.length} users`);
  }

  shutdown(): void {
    this.job?.stop();
    logger.info('Net worth scheduler stopped');
  }
}

export const netWorthScheduler = new NetWorthScheduler();
