/**
 * Extend debt_schedules to support credit cards, lines of credit, and simplified
 * loan entry (current balance as of a date instead of original principal + origination date).
 *
 * Loan / Mortgage — full mode:
 *   principal (original), annual_rate, term_months, origination_date, payment_amount
 *
 * Loan / Mortgage — simplified mode (is_simplified = 1):
 *   principal (current balance), annual_rate, term_months, as_of_date, payment_amount
 *   origination_date is NULL
 *
 * Credit Card / Line of Credit:
 *   annual_rate (purchase APR), cash_advance_rate, minimum_payment_* fields, credit_limit
 *   principal, term_months, origination_date, payment_amount are all NULL
 */
import type { Knex } from 'knex';
import { isMySQL, isPostgres } from '../../utils/db/dialectHelper';

export async function up(knex: Knex): Promise<void> {
  if (isMySQL(knex) || isPostgres(knex)) {
    await knex.schema.table('debt_schedules', (table) => {
      // Make existing term/origination/principal/payment nullable (CC/LOC don't have them)
      table.decimal('principal', 15, 2).nullable().alter();
      table.integer('term_months').unsigned().nullable().alter();
      table.date('origination_date').nullable().alter();
      table.decimal('payment_amount', 15, 2).nullable().alter();

      // Simplified loan mode: user enters current balance instead of original
      table.boolean('is_simplified').notNullable().defaultTo(false);
      table.date('as_of_date').nullable();

      // CC / LOC fields
      table.decimal('cash_advance_rate', 8, 6).nullable();
      table.string('minimum_payment_type', 20).nullable(); // 'fixed'|'percentage'|'greater_of'|'lesser_of'
      table.decimal('minimum_payment_amount', 15, 2).nullable();
      table.decimal('minimum_payment_percent', 8, 6).nullable();
      table.decimal('credit_limit', 15, 2).nullable();
    });
    return;
  }

  // SQLite: table recreation (SQLite does not support DROP NOT NULL via ALTER)
  await knex.raw('PRAGMA foreign_keys = OFF');
  try {
    await knex.raw(`
      CREATE TABLE debt_schedules_new (
        id                      varchar(36)  NOT NULL PRIMARY KEY,
        user_id                 varchar(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id              varchar(36)  NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        principal               decimal(15,2),
        annual_rate             decimal(8,6) NOT NULL,
        term_months             integer,
        origination_date        date,
        payment_amount          decimal(15,2),
        is_simplified           integer      NOT NULL DEFAULT 0,
        as_of_date              date,
        cash_advance_rate       decimal(8,6),
        minimum_payment_type    varchar(20),
        minimum_payment_amount  decimal(15,2),
        minimum_payment_percent decimal(8,6),
        credit_limit            decimal(15,2),
        created_at              datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at              datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, account_id)
      )
    `);

    await knex.raw(`
      INSERT INTO debt_schedules_new
        (id, user_id, account_id, principal, annual_rate, term_months,
         origination_date, payment_amount, created_at, updated_at)
      SELECT
        id, user_id, account_id, principal, annual_rate, term_months,
        origination_date, payment_amount, created_at, updated_at
      FROM debt_schedules
    `);

    await knex.raw('DROP TABLE debt_schedules');
    await knex.raw('ALTER TABLE debt_schedules_new RENAME TO debt_schedules');

    await knex.raw('CREATE INDEX debt_schedules_user_id_index ON debt_schedules (user_id)');
    await knex.raw('CREATE INDEX debt_schedules_account_id_index ON debt_schedules (account_id)');
  } finally {
    await knex.raw('PRAGMA foreign_keys = ON');
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Intentionally irreversible — rolling back would lose CC/LOC schedules.
}
