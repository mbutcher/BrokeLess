import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transaction_splits', (table) => {
    table.uuid('id').primary();
    table
      .uuid('transaction_id')
      .notNullable()
      .references('id')
      .inTable('transactions')
      .onDelete('CASCADE');

    table.decimal('principal_amount', 15, 2).notNullable();
    table.decimal('interest_amount', 15, 2).notNullable();

    // Immutable — no updated_at
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique('transaction_id');
  });

  await knex.schema.table('transaction_splits', (table) => {
    table.index('transaction_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transaction_splits');
}
