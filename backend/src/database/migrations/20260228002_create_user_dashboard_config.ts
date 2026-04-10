import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_dashboard_config', (table) => {
    // Use .uuid() so Knex maps to the correct type per dialect:
    //   PostgreSQL → UUID (matches users.id UUID, enabling the FK constraint)
    //   MySQL/SQLite → CHAR(36)
    table
      .uuid('user_id')
      .notNullable()
      .primary()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    // { "net-worth": true, "savings-goals": false, ... }
    table.json('widget_visibility').notNullable();
    // UUID[] of accounts excluded from dashboard widgets
    table.json('excluded_account_ids').notNullable();
    // { xs: [...], sm: [...], lg: [...], xl: [...] } — react-grid-layout layout arrays
    table.json('layouts').notNullable();
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_dashboard_config');
}
