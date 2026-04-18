import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('debt_schedules', (table) => {
    // Payment frequency for loan amortization (CC/LOC ignore this — they simulate monthly)
    table.string('payment_frequency', 20).nullable().defaultTo('monthly');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('debt_schedules', (table) => {
    table.dropColumn('payment_frequency');
  });
}
