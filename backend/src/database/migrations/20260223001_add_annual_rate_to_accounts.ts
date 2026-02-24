import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('accounts', (table) => {
    // Annual interest/APY rate stored as decimal fraction: 0.0525 = 5.25%
    table.decimal('annual_rate', 6, 4).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('accounts', (table) => {
    table.dropColumn('annual_rate');
  });
}
