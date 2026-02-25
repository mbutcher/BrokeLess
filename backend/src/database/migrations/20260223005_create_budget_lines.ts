import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('budget_lines', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('UUID()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.enu('classification', ['income', 'expense']).notNullable();
    table.enu('flexibility', ['fixed', 'flexible']).notNullable();
    // Category (top-level) — RESTRICT to preserve data integrity on category delete
    table
      .uuid('category_id')
      .notNullable()
      .references('id')
      .inTable('categories')
      .onDelete('RESTRICT');
    // Subcategory (child of category_id) — optional; SET NULL if subcategory deleted
    table
      .uuid('subcategory_id')
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL');
    // Schedule (embedded)
    table.decimal('amount', 15, 2).notNullable();
    table
      .enu('frequency', [
        'weekly',
        'biweekly',
        'semi_monthly',
        'monthly',
        'every_n_days',
        'annually',
        'one_time',
      ])
      .notNullable()
      .defaultTo('monthly');
    // Only used when frequency = 'every_n_days'
    table.integer('frequency_interval').nullable();
    // First/next known occurrence date — establishes the recurrence cycle
    table.date('anchor_date').notNullable();
    // At most one income Budget Line per user has this true — marks the pay period anchor
    table.boolean('is_pay_period_anchor').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('notes', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['user_id']);
    table.index(['category_id']);
    table.index(['subcategory_id']);
    // Optimises the "find pay period anchor" query (at-most-one true per user)
    table.index(['user_id', 'is_pay_period_anchor']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('budget_lines');
}
