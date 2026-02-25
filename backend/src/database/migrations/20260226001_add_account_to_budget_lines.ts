import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('budget_lines', (table) => {
    table
      .specificType('account_id', 'CHAR(36)')
      .nullable()
      .references('id')
      .inTable('accounts')
      .onDelete('SET NULL')
      .after('subcategory_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('budget_lines', (table) => {
    table.dropColumn('account_id');
  });
}
