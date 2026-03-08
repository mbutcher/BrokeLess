import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transaction_search_index', (table) => {
    table.uuid('id').primary();
    table
      .uuid('transaction_id')
      .notNullable()
      .references('id')
      .inTable('transactions')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('search_token', 64).notNullable();

    table.index(['user_id', 'search_token'], 'idx_tsi_user_token');
    table.index('transaction_id', 'idx_tsi_transaction_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transaction_search_index');
}
