import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('net_worth_snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('UUID()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('snapshot_date').notNullable();
    table.decimal('total_assets', 15, 2).notNullable().defaultTo(0.0);
    table.decimal('total_liabilities', 15, 2).notNullable().defaultTo(0.0);
    table.decimal('net_worth', 15, 2).notNullable().defaultTo(0.0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'snapshot_date']);
    table.index(['user_id', 'snapshot_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('net_worth_snapshots');
}
