import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import { dialectHelper } from '../../utils/db/dialectHelper';

export async function up(knex: Knex): Promise<void> {
  // 1. Create the new normalized table
  await knex.schema.createTable('simplefin_discarded_ids', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('sfin_id', 255).notNullable();
    table.timestamp('discarded_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['user_id', 'sfin_id'], { indexName: 'uq_simplefin_discarded_user_sfin' });
    table.index(['user_id'], 'idx_simplefin_discarded_user');
    table.index(['discarded_at'], 'idx_simplefin_discarded_at');
  });

  // 2. Backfill rows from existing discarded_ids_json JSON arrays
  //    Implemented in JS to avoid dialect-specific JSON functions (JSON_TABLE, json_each, etc.)
  const connections = (await knex('simplefin_connections')
    .whereNotNull('discarded_ids_json')
    .whereNot('discarded_ids_json', '[]')
    .select('user_id', 'discarded_ids_json')) as Array<{
    user_id: string;
    discarded_ids_json: string | string[] | null;
  }>;

  const now = new Date();
  for (const conn of connections) {
    const raw = conn.discarded_ids_json;
    let ids: string[] = [];
    if (Array.isArray(raw)) {
      ids = raw;
    } else if (typeof raw === 'string') {
      try {
        const parsed: unknown = JSON.parse(raw);
        ids = Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        ids = [];
      }
    }

    for (const sfinId of ids) {
      await dialectHelper.insertIgnore(knex, 'simplefin_discarded_ids', {
        id: randomUUID(),
        user_id: conn.user_id,
        sfin_id: sfinId,
        discarded_at: now,
      });
    }
  }

  // 3. Drop the old JSON blob column
  await knex.schema.alterTable('simplefin_connections', (table) => {
    table.dropColumn('discarded_ids_json');
  });
}

export async function down(knex: Knex): Promise<void> {
  // 1. Restore the JSON column
  await knex.schema.alterTable('simplefin_connections', (table) => {
    table.text('discarded_ids_json').nullable().after('auto_sync_window_end');
  });

  // 2. Backfill JSON column from the normalized table (JS aggregation — no dialect-specific functions needed)
  const rows = (await knex('simplefin_discarded_ids')
    .select('user_id', 'sfin_id')
    .orderBy(['user_id', 'sfin_id'])) as Array<{ user_id: string; sfin_id: string }>;

  const byUser = new Map<string, string[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row.sfin_id);
    byUser.set(row.user_id, list);
  }

  for (const [userId, sfinIds] of byUser) {
    await knex('simplefin_connections')
      .where({ user_id: userId })
      .update({ discarded_ids_json: JSON.stringify(sfinIds) });
  }

  // 3. Drop the normalized table
  await knex.schema.dropTable('simplefin_discarded_ids');
}
