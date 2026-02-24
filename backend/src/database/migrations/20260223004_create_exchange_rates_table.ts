import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('exchange_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    // e.g. 'USD', 'CAD', 'EUR'
    table.string('from_currency', 3).notNullable();
    table.string('to_currency', 3).notNullable();
    // The exchange rate (1 from_currency = rate to_currency)
    table.decimal('rate', 18, 8).notNullable();
    // Date the rate was fetched from the external API (YYYY-MM-DD)
    table.date('fetched_date').notNullable();
    table.timestamps(true, true);

    table.unique(['from_currency', 'to_currency']);
    table.index('fetched_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('exchange_rates');
}
