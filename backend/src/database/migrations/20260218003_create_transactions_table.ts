import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');

    // Positive = income/deposit, Negative = expense/debit
    table.decimal('amount', 15, 2).notNullable();

    // Sensitive fields — AES-256-GCM encrypted ("iv:authTag:ciphertext")
    table.text('description').nullable();
    table.string('payee', 512).nullable();
    table.text('notes').nullable();

    // Transaction date chosen by user (not necessarily created_at)
    table.date('date').notNullable();

    // Optional category — nullable FK (no category = uncategorized)
    table
      .uuid('category_id')
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL');

    // Set true when this transaction is part of a confirmed transfer link
    table.boolean('is_transfer').notNullable().defaultTo(false);

    // User-controlled reconciliation flag
    table.boolean('is_cleared').notNullable().defaultTo(false);

    table.timestamps(true, true);
  });

  await knex.schema.table('transactions', (table) => {
    table.index('user_id');
    table.index('account_id');
    table.index('date');
    table.index('category_id');
    table.index('is_transfer');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transactions');
}
