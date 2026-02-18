import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('budgets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('name', 100).notNullable();

    // Flexible date ranges — not locked to calendar months
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();

    table.boolean('is_active').notNullable().defaultTo(true);

    table.timestamps(true, true);
  });

  await knex.schema.table('budgets', (table) => {
    table.index('user_id');
    table.index(['user_id', 'start_date', 'end_date']);
  });

  await knex.schema.createTable('budget_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));

    table
      .uuid('budget_id')
      .notNullable()
      .references('id')
      .inTable('budgets')
      .onDelete('CASCADE');

    table
      .uuid('category_id')
      .notNullable()
      .references('id')
      .inTable('categories')
      .onDelete('CASCADE');

    table.decimal('allocated_amount', 15, 2).notNullable().defaultTo(0);

    table.timestamps(true, true);

    table.unique(['budget_id', 'category_id']);
  });

  await knex.schema.table('budget_categories', (table) => {
    table.index('budget_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('budget_categories');
  await knex.schema.dropTableIfExists('budgets');
}
