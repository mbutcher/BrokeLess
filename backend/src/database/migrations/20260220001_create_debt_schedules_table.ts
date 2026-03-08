import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('debt_schedules', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');

    // Original loan amount
    table.decimal('principal', 15, 2).notNullable();
    // Stored as a decimal fraction: 0.065 = 6.5% APR
    table.decimal('annual_rate', 8, 6).notNullable();
    table.integer('term_months').unsigned().notNullable();
    table.date('origination_date').notNullable();
    table.decimal('payment_amount', 15, 2).notNullable();

    table.timestamps(true, true);

    // One schedule per account per user
    table.unique(['user_id', 'account_id']);
  });

  await knex.schema.table('debt_schedules', (table) => {
    table.index('user_id');
    table.index('account_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('debt_schedules');
}
