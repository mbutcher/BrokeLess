import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('accounts', (table) => {
    // SimpleFIN Bridge account ID — set when account is mapped to a SimpleFIN account
    table.string('simplefin_account_id', 255).nullable();
  });

  await knex.schema.table('accounts', (table) => {
    // One SimpleFIN account per BudgetApp account per user
    table.unique(['user_id', 'simplefin_account_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('accounts', (table) => {
    table.dropUnique(['user_id', 'simplefin_account_id']);
    table.dropColumn('simplefin_account_id');
  });
}
