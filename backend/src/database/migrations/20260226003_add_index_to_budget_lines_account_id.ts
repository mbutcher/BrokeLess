import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('budget_lines', (table) => {
    table.index('account_id', 'idx_budget_lines_account_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('budget_lines', (table) => {
    table.dropIndex('account_id', 'idx_budget_lines_account_id');
  });
}
