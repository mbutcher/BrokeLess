import { getDatabase } from '@config/database';
import type { PushSubscription, CreatePushSubscriptionData } from '@typings/core.types';

function rowToSubscription(row: Record<string, unknown>): PushSubscription {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    endpoint: row['endpoint'] as string,
    p256dh: row['p256dh'] as string,
    auth: row['auth'] as string,
    deviceName: (row['device_name'] as string | null) ?? null,
    createdAt: new Date(row['created_at'] as string),
  };
}

export const pushSubscriptionRepository = {
  async findByUser(userId: string): Promise<PushSubscription[]> {
    const db = getDatabase();
    const rows = await db('push_subscriptions').where({ user_id: userId }).select('*');
    return rows.map(rowToSubscription);
  },

  async findById(id: string): Promise<PushSubscription | null> {
    const db = getDatabase();
    const row = (await db('push_subscriptions').where({ id }).first()) as
      | Record<string, unknown>
      | undefined;
    return row ? rowToSubscription(row) : null;
  },

  async create(data: CreatePushSubscriptionData): Promise<PushSubscription> {
    const db = getDatabase();
    const id = crypto.randomUUID();
    await db('push_subscriptions').insert({
      id,
      user_id: data.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      device_name: data.deviceName ?? null,
    });
    return (await this.findById(id))!;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db('push_subscriptions').where({ id }).delete();
  },

  async deleteByUser(userId: string): Promise<void> {
    const db = getDatabase();
    await db('push_subscriptions').where({ user_id: userId }).delete();
  },

  async deleteByEndpoint(endpoint: string, userId: string): Promise<void> {
    const db = getDatabase();
    await db('push_subscriptions').where({ endpoint, user_id: userId }).delete();
  },
};
