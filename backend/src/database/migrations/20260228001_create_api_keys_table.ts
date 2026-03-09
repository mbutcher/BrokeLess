import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').notNullable().primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('label', 255).notNullable();
    // SHA-256 hex of the raw key — 64 chars
    table.string('key_hash', 64).notNullable().unique();
    table.json('scopes').notNullable();
    table.datetime('last_used_at').nullable();
    table.datetime('expires_at').nullable();
    table.timestamps(true, true);

    table.index(['user_id'], 'idx_api_keys_user');
    table.index(['key_hash'], 'idx_api_keys_hash');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_keys');
}
