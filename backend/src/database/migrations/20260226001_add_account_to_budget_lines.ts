import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('budget_lines', (table) => {
    // Use .uuid() so Knex maps to the correct type per dialect:
    //   PostgreSQL → UUID (matches accounts.id UUID, enabling the FK constraint)
    //   MySQL/SQLite → CHAR(36)
    table
      .uuid('account_id')
      .nullable()
      .references('id')
      .inTable('accounts')
      .onDelete('SET NULL')
      .after('subcategory_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('budget_lines', (table) => {
    table.dropForeign(['account_id']);
  });
  await knex.schema.alterTable('budget_lines', (table) => {
    table.dropColumn('account_id');
  });
}
