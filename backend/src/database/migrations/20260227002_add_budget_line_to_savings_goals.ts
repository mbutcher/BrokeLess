import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('savings_goals', (table) => {
    // Use .uuid() so Knex maps to the correct type per dialect:
    //   PostgreSQL → UUID (matches budget_lines.id UUID, enabling the FK constraint)
    //   MySQL/SQLite → CHAR(36)
    table
      .uuid('budget_line_id')
      .nullable()
      .references('id')
      .inTable('budget_lines')
      .onDelete('SET NULL')
      .after('account_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('savings_goals', (table) => {
    table.dropForeign(['budget_line_id']);
  });
  await knex.schema.alterTable('savings_goals', (table) => {
    table.dropColumn('budget_line_id');
  });
}
