import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('name', 255).notNullable();
    table
      .enum('type', [
        'checking',
        'savings',
        'credit_card',
        'loan',
        'mortgage',
        'investment',
        'other',
      ])
      .notNullable();

    // true = asset (checking/savings), false = liability (credit card/loan)
    table.boolean('is_asset').notNullable().defaultTo(true);

    table.decimal('starting_balance', 15, 2).notNullable().defaultTo(0);
    // Updated atomically with each transaction insert/update/delete
    table.decimal('current_balance', 15, 2).notNullable().defaultTo(0);

    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('color', 7).nullable(); // Hex color e.g. '#3b82f6'
    table.string('institution', 255).nullable(); // Bank name

    // Soft delete — preserves transaction history
    table.boolean('is_active').notNullable().defaultTo(true);

    table.timestamps(true, true);
  });

  await knex.schema.table('accounts', (table) => {
    table.index('user_id');
    table.index(['user_id', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('accounts');
}
