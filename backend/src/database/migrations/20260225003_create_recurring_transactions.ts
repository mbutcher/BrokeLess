import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recurring_transactions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.decimal('amount', 15, 2).notNullable();
    // AES-256-GCM encrypted at rest
    table.text('description').nullable();
    table.text('payee').nullable();
    table.text('notes').nullable();
    table
      .uuid('category_id')
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL');
    table
      .enu('frequency', [
        'weekly',
        'biweekly',
        'semi_monthly',
        'monthly',
        'every_n_days',
        'annually',
      ])
      .notNullable();
    // Only used when frequency = 'every_n_days'
    table.integer('frequency_interval').nullable();
    // First/next known occurrence date — establishes the recurrence cycle
    table.date('anchor_date').notNullable();
    // Next computed occurrence — updated by cron after each generation
    table.date('next_due_date').notNullable();
    // Optional end date — null = indefinite
    table.date('end_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_generated_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['next_due_date', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recurring_transactions');
}
