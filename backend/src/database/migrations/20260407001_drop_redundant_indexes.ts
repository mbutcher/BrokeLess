/**
 * Drop redundant non-unique indexes that duplicate the coverage already provided
 * by the UNIQUE constraints on the same columns.
 *
 * - net_worth_snapshots: UNIQUE(user_id, snapshot_date) already creates an index;
 *   the explicit INDEX(user_id, snapshot_date) is a duplicate.
 * - transaction_splits: UNIQUE(transaction_id) already creates an index;
 *   the explicit INDEX(transaction_id) is a duplicate.
 *
 * Duplicate indexes waste space and add overhead to every INSERT/UPDATE/DELETE
 * on these tables without providing any query-execution benefit.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('net_worth_snapshots', (table) => {
    table.dropIndex(['user_id', 'snapshot_date']);
  });

  await knex.schema.table('transaction_splits', (table) => {
    table.dropIndex(['transaction_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('net_worth_snapshots', (table) => {
    table.index(['user_id', 'snapshot_date']);
  });

  await knex.schema.table('transaction_splits', (table) => {
    table.index(['transaction_id']);
  });
}
