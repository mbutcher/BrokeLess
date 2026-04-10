import cron from 'node-cron';
import { getDatabase } from '@config/database';
import { logger } from '@utils/logger';
import {
  isPushEnabled,
  sendUpcomingBillAlert,
  sendGoalDeadlineAlert,
} from './pushNotificationService';
import { computeOccurrences } from '@utils/recurringDates';
import type { ScheduleFrequency } from '@utils/recurringDates';
import type { PushPreferences } from '@typings/auth.types';

// Row shapes returned by raw DB queries
interface UserNotifRow {
  id: string;
  push_enabled: number;
  push_preferences: string | null;
  default_currency: string;
}

interface BudgetLineRow {
  id: string;
  user_id: string;
  name: string;
  amount: string;
  frequency: string;
  frequency_interval: number | null;
  day_of_month_1: number | null;
  day_of_month_2: number | null;
  anchor_date: string;
  is_active: number;
  classification: string;
  flexibility: string;
  category_id: string;
  account_id: string | null;
  is_pay_period_anchor: number;
  notes: string | null;
}

interface SavingsGoalRow {
  id: string;
  user_id: string;
  name: string;
  target_amount: string;
  target_date: string | null;
}

const DEFAULT_PREFS: PushPreferences = {
  upcomingBills: true,
  simplefinErrors: true,
  goalDeadlines: true,
};

class NotificationScheduler {
  private job: cron.ScheduledTask | null = null;
  private isRunning = false;

  start(): void {
    // Run daily at 7:00 AM
    this.job = cron.schedule('0 7 * * *', () => {
      void this.runDailyNotifications();
    });
    logger.info('Notification scheduler started (daily at 07:00)');
  }

  async runDailyNotifications(): Promise<void> {
    if (!isPushEnabled()) return;
    if (this.isRunning) {
      logger.warn('Notification scheduler: previous run still in progress, skipping');
      return;
    }

    this.isRunning = true;
    try {
      await this._runDailyNotificationsInner();
    } finally {
      this.isRunning = false;
    }
  }

  private async _runDailyNotificationsInner(): Promise<void> {
    const db = getDatabase();
    const users = (await db('users')
      .where({ is_active: true, push_enabled: true })
      .select('id', 'push_preferences', 'push_enabled', 'default_currency')) as UserNotifRow[];

    for (const user of users) {
      let parsedPrefs: Partial<PushPreferences> = {};
      if (user.push_preferences) {
        try {
          const raw = user.push_preferences;
          parsedPrefs = (
            typeof raw === 'string' ? JSON.parse(raw) : raw
          ) as Partial<PushPreferences>;
        } catch {
          logger.warn('Notification scheduler: invalid push_preferences JSON', { userId: user.id });
        }
      }
      const prefs: PushPreferences = { ...DEFAULT_PREFS, ...parsedPrefs };

      await Promise.all([
        prefs.upcomingBills
          ? this.notifyUpcomingBills(user.id, user.default_currency)
          : Promise.resolve(),
        prefs.goalDeadlines ? this.notifyGoalDeadlines(user.id) : Promise.resolve(),
      ]);
    }
  }

  private async notifyUpcomingBills(userId: string, currency: string): Promise<void> {
    const db = getDatabase();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    const lines = (await db('budget_lines')
      .where({ user_id: userId, is_active: true, classification: 'expense', flexibility: 'fixed' })
      .select('*')) as BudgetLineRow[];

    for (const row of lines) {
      const occurrences = computeOccurrences(
        new Date(row.anchor_date),
        row.frequency as ScheduleFrequency | 'one_time',
        row.frequency_interval,
        new Date(todayStr),
        new Date(tomorrowStr),
        row.day_of_month_1,
        row.day_of_month_2
      );
      if (occurrences.some((o) => o.toISOString().slice(0, 10) === tomorrowStr)) {
        void sendUpcomingBillAlert(userId, row.name, parseFloat(row.amount), currency).catch(
          (err: unknown) => logger.warn('Upcoming bill alert failed', { userId, err })
        );
      }
    }
  }

  private async notifyGoalDeadlines(userId: string): Promise<void> {
    const db = getDatabase();
    const today = new Date();
    const sevenDays = new Date(today);
    sevenDays.setDate(today.getDate() + 7);
    const sevenDaysStr = sevenDays.toISOString().slice(0, 10);

    const goals = (await db('savings_goals')
      .where({ user_id: userId })
      .whereNotNull('target_date')
      .where('target_date', '<=', sevenDaysStr)
      .where('target_date', '>=', today.toISOString().slice(0, 10))
      .select('id', 'name', 'target_date')) as SavingsGoalRow[];

    for (const goal of goals) {
      const targetDate = new Date(goal.target_date!);
      const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      void sendGoalDeadlineAlert(userId, goal.name, daysLeft).catch((err: unknown) =>
        logger.warn('Goal deadline alert failed', { userId, err })
      );
    }
  }

  shutdown(): void {
    this.job?.stop();
    logger.info('Notification scheduler stopped');
  }
}

export const notificationScheduler = new NotificationScheduler();
