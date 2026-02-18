import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // SHA-256 of the raw JWT refresh token (raw token sent as httpOnly cookie, never stored)
    table.string('token_hash', 64).notNullable().unique();

    // Device binding: SHA-256(ip + userAgent) — detects refresh token theft across devices
    table.string('device_fingerprint', 64).nullable();

    // Stored for audit/debugging only, not used for validation
    table.string('user_agent', 512).nullable();
    table.string('ip_address', 45).nullable(); // 45 chars covers full IPv6

    table.boolean('is_revoked').notNullable().defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('refresh_tokens', (table) => {
    table.index(['user_id']);
    table.index(['token_hash']);
    table.index(['expires_at']); // For periodic cleanup of expired tokens
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
