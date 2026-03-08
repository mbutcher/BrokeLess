import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('passkeys', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Base64url-encoded credential ID from the authenticator (globally unique)
    table.string('credential_id', 1024).notNullable().unique();

    // COSE-encoded public key, base64url-encoded (as returned by @simplewebauthn/server)
    table.text('public_key').notNullable();

    // Monotonically increasing counter; if incoming counter <= stored, reject as replay attack
    table.bigInteger('counter').notNullable().defaultTo(0);

    // Authenticator Attestation GUID — identifies authenticator model/vendor
    table.string('aaguid', 36).nullable();

    // Human-readable label set by user during registration (e.g., "MacBook Touch ID")
    table.string('device_name', 255).nullable();

    // JSON array of transport hints: ["internal", "hybrid", "ble", "usb", "nfc"]
    table.json('transports').nullable();

    table.timestamp('last_used_at').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('passkeys', (table) => {
    table.index(['user_id']);
    table.index(['credential_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('passkeys');
}
