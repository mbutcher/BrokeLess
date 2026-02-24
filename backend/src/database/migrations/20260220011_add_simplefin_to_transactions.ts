import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('transactions', (table) => {
    // SimpleFIN Bridge transaction ID — primary deduplication key for imported transactions
    table.string('simplefin_transaction_id', 255).nullable();
  });

  await knex.schema.table('transactions', (table) => {
    // Prevents re-importing the same SimpleFIN transaction on subsequent syncs
    table.unique(['user_id', 'simplefin_transaction_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('transactions', (table) => {
    table.dropUnique(['user_id', 'simplefin_transaction_id']);
    table.dropColumn('simplefin_transaction_id');
  });
}
