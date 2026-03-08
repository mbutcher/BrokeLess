import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('savings_goals', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');

    table.string('name', 255).notNullable();
    table.decimal('target_amount', 15, 2).notNullable();
    // Nullable — goal may have no deadline
    table.date('target_date').nullable();

    table.timestamps(true, true);
  });

  await knex.schema.table('savings_goals', (table) => {
    table.index('user_id');
    table.index(['user_id', 'account_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('savings_goals');
}
