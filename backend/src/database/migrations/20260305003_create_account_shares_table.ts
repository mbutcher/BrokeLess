import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('account_shares', (table) => {
    table.uuid('id').primary();
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table
      .uuid('shared_with_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.enum('access_level', ['view', 'write']).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['account_id', 'shared_with_user_id']);
    table.index('shared_with_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('account_shares');
}
