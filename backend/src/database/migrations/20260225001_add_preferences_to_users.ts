import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.string('locale', 10).notNullable().defaultTo('en-CA');
    table
      .enum('date_format', ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
      .notNullable()
      .defaultTo('DD/MM/YYYY');
    table.enum('time_format', ['12h', '24h']).notNullable().defaultTo('12h');
    table.string('timezone', 100).notNullable().defaultTo('America/Toronto');
    table.enum('week_start', ['sunday', 'monday', 'saturday']).notNullable().defaultTo('sunday');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('locale');
    table.dropColumn('date_format');
    table.dropColumn('time_format');
    table.dropColumn('timezone');
    table.dropColumn('week_start');
  });
}
