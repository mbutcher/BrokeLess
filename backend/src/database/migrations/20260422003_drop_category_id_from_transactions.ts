import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropIndex('category_id', 'transactions_category_id_index');
    table.dropColumn('category_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('transactions', (table) => {
    table.uuid('category_id').nullable().references('id').inTable('categories').onDelete('SET NULL');
    table.index('category_id');
  });
}
