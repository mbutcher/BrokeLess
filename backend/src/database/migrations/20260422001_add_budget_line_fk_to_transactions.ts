import type { Knex } from 'knex';
import { isSQLite } from '@utils/db/dialectHelper';

export async function up(knex: Knex): Promise<void> {
  // SQLite doesn't support adding FK constraints via ALTER TABLE
  if (isSQLite(knex)) return;

  await knex.schema.table('transactions', (table) => {
    table.foreign('budget_line_id').references('id').inTable('budget_lines').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  if (isSQLite(knex)) return;

  await knex.schema.table('transactions', (table) => {
    table.dropForeign(['budget_line_id']);
  });
}
