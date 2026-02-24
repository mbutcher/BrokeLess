import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('simplefin_pending_reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // The SimpleFIN transaction that triggered the fuzzy-match flag
    table.string('simplefin_transaction_id', 255).notNullable();

    // AES-256-GCM encrypted JSON of the raw SimpleFIN transaction data
    table.text('raw_data_encrypted').notNullable();

    // The existing local transaction it may be a duplicate of (nullable — SET NULL on delete)
    table
      .uuid('candidate_transaction_id')
      .nullable()
      .references('id')
      .inTable('transactions')
      .onDelete('SET NULL');

    // Levenshtein-based payee similarity score (0.0000–1.0000)
    table.decimal('similarity_score', 5, 4).notNullable();

    // Immutable — no updated_at
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    // One pending review per SimpleFIN transaction per user
    // Explicit short index name — MariaDB enforces a 64-char identifier limit
    table.unique(['user_id', 'simplefin_transaction_id'], { indexName: 'sfpr_user_sftx_uniq' });
  });

  await knex.schema.table('simplefin_pending_reviews', (table) => {
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('simplefin_pending_reviews');
}
