import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('simplefin_account_mappings', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // SimpleFIN Bridge account identifiers (for display and lookup)
    table.string('simplefin_account_id', 255).notNullable();
    table.string('simplefin_org_name', 255).notNullable(); // Bank name
    table.string('simplefin_account_name', 255).notNullable();
    table.string('simplefin_account_type', 50).notNullable(); // SimpleFIN's type string

    // Null = discovered but not yet mapped by user; set after user maps it
    table
      .uuid('local_account_id')
      .nullable()
      .references('id')
      .inTable('accounts')
      .onDelete('SET NULL');

    table.timestamps(true, true);

    // One entry per SimpleFIN account per user
    table.unique(['user_id', 'simplefin_account_id']);
  });

  await knex.schema.table('simplefin_account_mappings', (table) => {
    table.index('user_id');
    // Fast lookup of unmapped accounts
    table.index(['user_id', 'local_account_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('simplefin_account_mappings');
}
