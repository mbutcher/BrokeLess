import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categorization_rules', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('payee_encrypted').notNullable();
    // JSON array of HMAC-SHA256 hashed payee tokens, for matching incoming transactions
    t.text('token_hashes').notNullable();
    t.string('category_id', 36)
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL');
    t.string('budget_line_id', 36)
      .nullable()
      .references('id')
      .inTable('budget_lines')
      .onDelete('SET NULL');
    t.datetime('created_at').notNullable();
    t.datetime('updated_at').notNullable();
    t.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('categorization_rules');
}
