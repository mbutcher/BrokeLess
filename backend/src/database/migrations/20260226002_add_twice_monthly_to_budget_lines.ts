import type { Knex } from 'knex';
import { isMySQL, isPostgres } from '../../utils/db/dialectHelper';

/**
 * Adds support for a configurable twice-monthly recurrence pattern.
 *
 * - `twice_monthly` frequency: fires on two user-specified days each month
 * - `day_of_month_1`: first firing day (1–28, or 31 = last day of month)
 * - `day_of_month_2`: second firing day (must be > day_of_month_1; 31 = last day)
 *
 * `semi_monthly` (existing) remains as a shorthand for 1st & 15th.
 */

const FULL_FREQS = [
  'weekly',
  'biweekly',
  'semi_monthly',
  'monthly',
  'every_n_days',
  'annually',
  'one_time',
  'twice_monthly',
] as const;

const ORIG_FREQS = [
  'weekly',
  'biweekly',
  'semi_monthly',
  'monthly',
  'every_n_days',
  'annually',
  'one_time',
] as const;

export async function up(knex: Knex): Promise<void> {
  // Add the two day-of-month columns
  await knex.schema.alterTable('budget_lines', (table) => {
    table.tinyint('day_of_month_1').nullable().after('frequency_interval');
    table.tinyint('day_of_month_2').nullable().after('day_of_month_1');
  });

  // Extend the frequency enum to include 'twice_monthly'
  if (isMySQL(knex)) {
    await knex.raw(`
      ALTER TABLE budget_lines
        MODIFY COLUMN frequency
          ENUM('weekly','biweekly','semi_monthly','monthly','every_n_days','annually','one_time','twice_monthly')
          NOT NULL DEFAULT 'monthly'
    `);
  } else if (isPostgres(knex)) {
    await knex.raw(
      'ALTER TABLE budget_lines DROP CONSTRAINT IF EXISTS budget_lines_frequency_check'
    );
    await knex.raw(
      `ALTER TABLE budget_lines ADD CONSTRAINT budget_lines_frequency_check CHECK (frequency IN ('weekly','biweekly','semi_monthly','monthly','every_n_days','annually','one_time','twice_monthly'))`
    );
  } else {
    // SQLite: Knex performs a full table-recreation when .alter() is used
    await knex.schema.alterTable('budget_lines', (table) => {
      table
        .enu('frequency', [...FULL_FREQS])
        .notNullable()
        .defaultTo('monthly')
        .alter();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Restore original enum (removes twice_monthly rows first to avoid constraint error)
  await knex('budget_lines').where('frequency', 'twice_monthly').delete();

  if (isMySQL(knex)) {
    await knex.raw(`
      ALTER TABLE budget_lines
        MODIFY COLUMN frequency
          ENUM('weekly','biweekly','semi_monthly','monthly','every_n_days','annually','one_time')
          NOT NULL DEFAULT 'monthly'
    `);
  } else if (isPostgres(knex)) {
    await knex.raw(
      'ALTER TABLE budget_lines DROP CONSTRAINT IF EXISTS budget_lines_frequency_check'
    );
    await knex.raw(
      `ALTER TABLE budget_lines ADD CONSTRAINT budget_lines_frequency_check CHECK (frequency IN ('weekly','biweekly','semi_monthly','monthly','every_n_days','annually','one_time'))`
    );
  } else {
    await knex.schema.alterTable('budget_lines', (table) => {
      table
        .enu('frequency', [...ORIG_FREQS])
        .notNullable()
        .defaultTo('monthly')
        .alter();
    });
  }

  await knex.schema.alterTable('budget_lines', (table) => {
    table.dropColumn('day_of_month_2');
    table.dropColumn('day_of_month_1');
  });
}
