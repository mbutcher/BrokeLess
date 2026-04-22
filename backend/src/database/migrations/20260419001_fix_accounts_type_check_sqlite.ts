/**
 * Fix: accounts.type CHECK constraint missing 'line_of_credit' on SQLite.
 *
 * Migration 20260223002 used Knex's .enu().alter() which triggers a full SQLite
 * table recreation. However, Knex 3.x reads PRAGMA table_info for column types —
 * PRAGMA returns 'varchar(255)' for enum columns, not the original CHECK expression.
 * When Knex reconstructs the CREATE TABLE for the temp table, the CHECK constraint
 * is lost and the column reverts to an unconstrained varchar.
 *
 * This migration re-runs the table recreation for SQLite using raw SQL so the
 * CHECK constraint is explicitly and correctly specified. MySQL and PostgreSQL
 * handled 20260223002 correctly via ALTER TABLE and are skipped here.
 */
import type { Knex } from 'knex';
import { isMySQL, isPostgres } from '../../utils/db/dialectHelper';

const ALL_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'loan',
  'line_of_credit',
  'mortgage',
  'investment',
  'other',
] as const;

export async function up(knex: Knex): Promise<void> {
  if (isMySQL(knex) || isPostgres(knex)) {
    // These dialects handled line_of_credit correctly in 20260223002 — nothing to do.
    return;
  }

  const typeCheck = ALL_TYPES.map((t) => `'${t}'`).join(', ');

  // Disable FK checks for the duration of the swap.
  await knex.raw('PRAGMA foreign_keys = OFF');

  try {
    await knex.raw(`
      CREATE TABLE accounts_fixed (
        id            varchar(36)    NOT NULL PRIMARY KEY,
        user_id       varchar(36)    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name          varchar(255)   NOT NULL,
        type          varchar(255)   NOT NULL CHECK (type IN (${typeCheck})),
        is_asset      integer        NOT NULL DEFAULT 1,
        starting_balance decimal(15,2) NOT NULL DEFAULT 0,
        current_balance  decimal(15,2) NOT NULL DEFAULT 0,
        currency      varchar(3)     NOT NULL DEFAULT 'USD',
        color         varchar(7),
        institution   varchar(255),
        is_active     integer        NOT NULL DEFAULT 1,
        created_at    datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    datetime       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        simplefin_account_id varchar(255),
        annual_rate   decimal(5,4)
      )
    `);

    await knex.raw(`
      INSERT INTO accounts_fixed
        (id, user_id, name, type, is_asset, starting_balance, current_balance,
         currency, color, institution, is_active, created_at, updated_at,
         simplefin_account_id, annual_rate)
      SELECT
        id, user_id, name, type, is_asset, starting_balance, current_balance,
        currency, color, institution, is_active, created_at, updated_at,
        simplefin_account_id, annual_rate
      FROM accounts
    `);

    await knex.raw('DROP TABLE accounts');
    await knex.raw('ALTER TABLE accounts_fixed RENAME TO accounts');

    // Recreate indexes that existed on the original accounts table.
    await knex.raw('CREATE INDEX accounts_user_id_index ON accounts (user_id)');
    await knex.raw(
      'CREATE INDEX accounts_user_id_is_active_index ON accounts (user_id, is_active)'
    );
    await knex.raw(
      'CREATE UNIQUE INDEX accounts_user_id_simplefin_account_id_unique ON accounts (user_id, simplefin_account_id)'
    );
  } finally {
    await knex.raw('PRAGMA foreign_keys = ON');
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Removing line_of_credit would require deleting rows using it — not safe.
  // This migration is intentionally irreversible.
}
