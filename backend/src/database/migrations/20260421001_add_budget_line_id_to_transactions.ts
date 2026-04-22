import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('transactions', (table) => {
    table.string('budget_line_id', 36).nullable().defaultTo(null);
    table.index('budget_line_id', 'idx_transactions_budget_line_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('transactions', (table) => {
    table.dropIndex('budget_line_id', 'idx_transactions_budget_line_id');
    table.dropColumn('budget_line_id');
  });
}
