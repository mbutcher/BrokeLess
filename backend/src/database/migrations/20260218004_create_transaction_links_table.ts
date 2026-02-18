import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transaction_links', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));

    table
      .uuid('from_transaction_id')
      .notNullable()
      .references('id')
      .inTable('transactions')
      .onDelete('CASCADE');

    table
      .uuid('to_transaction_id')
      .notNullable()
      .references('id')
      .inTable('transactions')
      .onDelete('CASCADE');

    table
      .enum('link_type', ['transfer', 'payment', 'refund'])
      .notNullable()
      .defaultTo('transfer');

    // Links are immutable — no updated_at
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['from_transaction_id', 'to_transaction_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transaction_links');
}
