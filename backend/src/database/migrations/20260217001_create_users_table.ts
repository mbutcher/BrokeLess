import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));

    // Email stored two ways:
    //   email_encrypted: AES-256-GCM "iv:authTag:ciphertext" for display after decryption
    //   email_hash: HMAC-SHA256 of lowercased email for fast unique lookups
    table.text('email_encrypted').notNullable();
    table.string('email_hash', 64).notNullable().unique();

    // Argon2id output (self-describing format includes params, ~95 chars)
    table.string('password_hash', 255).notNullable();

    // Account state
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('email_verified').notNullable().defaultTo(false);

    // TOTP 2FA
    table.boolean('totp_enabled').notNullable().defaultTo(false);
    table.text('totp_secret_encrypted').nullable(); // AES-256-GCM encrypted, null until TOTP confirmed

    // WebAuthn / Passkeys
    table.boolean('webauthn_enabled').notNullable().defaultTo(false);

    // Account lockout tracking
    table.integer('failed_login_attempts').notNullable().defaultTo(0);
    table.timestamp('locked_until').nullable();

    // Audit fields
    table.timestamp('last_login_at').nullable();
    table.timestamps(true, true); // created_at, updated_at with defaults
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
