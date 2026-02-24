import type { Knex } from 'knex';

// MariaDB requires a raw ALTER TABLE to add a value to an existing ENUM column.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(
    "ALTER TABLE accounts MODIFY COLUMN type ENUM('checking','savings','credit_card','loan','line_of_credit','mortgage','investment','other') NOT NULL"
  );
}

export async function down(knex: Knex): Promise<void> {
  // Remove line_of_credit — any existing rows must have been changed first
  await knex.schema.raw(
    "ALTER TABLE accounts MODIFY COLUMN type ENUM('checking','savings','credit_card','loan','mortgage','investment','other') NOT NULL"
  );
}
