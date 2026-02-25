import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('totp_backup_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // SHA-256 of the raw backup code (raw codes shown once at setup, then discarded)
    table.string('code_hash', 64).notNullable();

    // Used codes are never deleted — they serve as an audit trail
    table.boolean('is_used').notNullable().defaultTo(false);
    table.timestamp('used_at').nullable();

    table.timestamps(true, true);

    // A specific code hash can only appear once per user
    table.unique(['user_id', 'code_hash']);
  });

  await knex.schema.alterTable('totp_backup_codes', (table) => {
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('totp_backup_codes');
}
