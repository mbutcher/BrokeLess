import type { Knex } from 'knex';

/**
 * Adds local_account_id to simplefin_pending_reviews so that the resolveReview
 * 'accept' action knows which BudgetApp account to import the transaction into.
 *
 * Stored as a plain UUID string (no FK) so that deleting a local account does not
 * cascade-delete pending reviews — the review still exists but accept will gracefully
 * skip if the account is gone.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('simplefin_pending_reviews', (table) => {
    // Nullable: rows created before this migration will have NULL;
    // the service handles null by skipping import (logged as a warning).
    table.string('local_account_id', 36).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('simplefin_pending_reviews', (table) => {
    table.dropColumn('local_account_id');
  });
}
