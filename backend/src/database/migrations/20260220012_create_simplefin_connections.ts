import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('simplefin_connections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    // One SimpleFIN connection per user
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');

    // AES-256-GCM encrypted SimpleFIN access URL (iv:authTag:ciphertext)
    table.text('access_url_encrypted').notNullable();

    // Sync status tracking
    table.datetime('last_sync_at').nullable();
    table.enum('last_sync_status', ['success', 'error', 'pending']).nullable();
    table.text('last_sync_error').nullable();

    // Auto-sync schedule settings (off by default)
    table.boolean('auto_sync_enabled').notNullable().defaultTo(false);
    // Interval options: 1, 2, 4, 6, 8, 12, 24 hours
    table.tinyint('auto_sync_interval_hours').unsigned().notNullable().defaultTo(24);
    // Active window — only sync when current hour is within [start, end] (0–23)
    table.tinyint('auto_sync_window_start').unsigned().notNullable().defaultTo(0);
    table.tinyint('auto_sync_window_end').unsigned().notNullable().defaultTo(23);

    // JSON array of SimpleFIN transaction IDs the user has explicitly discarded
    // Prevents re-flagging them as fuzzy duplicates on subsequent syncs
    table.text('discarded_ids_json').nullable();

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('simplefin_connections');
}
