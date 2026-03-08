import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('household_members', (table) => {
    table.uuid('id').primary();
    table
      .uuid('household_id')
      .notNullable()
      .references('id')
      .inTable('households')
      .onDelete('CASCADE');
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.enum('role', ['owner', 'member']).notNullable();
    table.datetime('joined_at').notNullable();
    table.index('household_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('household_members');
}
