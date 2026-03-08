import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('name', 100).notNullable();
    table.string('color', 7).nullable(); // Hex color
    table.string('icon', 50).nullable(); // Lucide icon name

    table.boolean('is_income').notNullable().defaultTo(false);

    // Self-referential FK for subcategories (nullable = top-level category)
    table.uuid('parent_id').nullable().references('id').inTable('categories').onDelete('SET NULL');

    // Soft delete — preserved on existing transactions
    table.boolean('is_active').notNullable().defaultTo(true);

    table.timestamps(true, true);
  });

  await knex.schema.table('categories', (table) => {
    table.index('user_id');
    table.index('parent_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('categories');
}
