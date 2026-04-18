import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('simplefin_account_mappings', (table) => {
    table.boolean('ignored').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('simplefin_account_mappings', (table) => {
    table.dropColumn('ignored');
  });
}
