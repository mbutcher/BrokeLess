import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('webauthn_challenges', (table) => {
    table.specificType('id', 'CHAR(36)').primary().defaultTo(knex.raw('(UUID())'));
    table.string('challenge', 512).notNullable();
    table.string('type', 4).notNullable().comment('reg or auth');
    table.string('user_id', 36).nullable();
    table.dateTime('expires_at').notNullable();
    table.dateTime('created_at').defaultTo(knex.raw('CURRENT_TIMESTAMP'));

    table.index(['expires_at'], 'idx_webauthn_challenges_expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webauthn_challenges');
}
