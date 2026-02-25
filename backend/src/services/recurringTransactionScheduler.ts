import cron from 'node-cron';
import { recurringTransactionService } from '@services/core/recurringTransactionService';
import logger from '@utils/logger';

class RecurringTransactionScheduler {
  private job: cron.ScheduledTask | null = null;

  start(): void {
    // Run at 1 AM daily
    this.job = cron.schedule('0 1 * * *', () => {
      void this.run();
    });
    logger.info('Recurring transaction scheduler started (daily at 01:00)');
  }

  private async run(): Promise<void> {
    try {
      const count = await recurringTransactionService.generateDue();
      logger.info(`Recurring transaction scheduler: generated ${count} transaction(s)`);
    } catch (err) {
      logger.error('Recurring transaction scheduler: generation run failed', { err });
    }
  }

  shutdown(): void {
    this.job?.stop();
    logger.info('Recurring transaction scheduler stopped');
  }
}

export const recurringTransactionScheduler = new RecurringTransactionScheduler();
