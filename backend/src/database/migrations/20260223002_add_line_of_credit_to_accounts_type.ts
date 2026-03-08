import type { Knex } from 'knex';
import { isMySQL, isPostgres } from '../../utils/db/dialectHelper';

const FULL_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'loan',
  'line_of_credit',
  'mortgage',
  'investment',
  'other',
] as const;

const ORIG_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'loan',
  'mortgage',
  'investment',
  'other',
] as const;

export async function up(knex: Knex): Promise<void> {
  if (isMySQL(knex)) {
    await knex.schema.raw(
      "ALTER TABLE accounts MODIFY COLUMN type ENUM('checking','savings','credit_card','loan','line_of_credit','mortgage','investment','other') NOT NULL"
    );
  } else if (isPostgres(knex)) {
    await knex.raw('ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check');
    await knex.raw(
      `ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('checking','savings','credit_card','loan','line_of_credit','mortgage','investment','other'))`
    );
  } else {
    // SQLite: Knex performs a full table-recreation when .alter() is used
    await knex.schema.alterTable('accounts', (table) => {
      table
        .enu('type', [...FULL_TYPES])
        .notNullable()
        .alter();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove line_of_credit — any existing rows must have been changed first
  if (isMySQL(knex)) {
    await knex.schema.raw(
      "ALTER TABLE accounts MODIFY COLUMN type ENUM('checking','savings','credit_card','loan','mortgage','investment','other') NOT NULL"
    );
  } else if (isPostgres(knex)) {
    await knex.raw('ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check');
    await knex.raw(
      `ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('checking','savings','credit_card','loan','mortgage','investment','other'))`
    );
  } else {
    await knex.schema.alterTable('accounts', (table) => {
      table
        .enu('type', [...ORIG_TYPES])
        .notNullable()
        .alter();
    });
  }
}
