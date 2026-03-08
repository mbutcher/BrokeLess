import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import { isMySQL } from '../../utils/db/dialectHelper';

interface UserRow {
  id: string;
  display_name: string | null;
}

export async function up(knex: Knex): Promise<void> {
  // Step 1: Add household_id column (nullable to allow data migration)
  await knex.schema.alterTable('categories', (table) => {
    table
      .uuid('household_id')
      .nullable()
      .references('id')
      .inTable('households')
      .onDelete('CASCADE')
      .after('id');
  });

  // Step 2: For each existing user, create a household + member, then migrate categories
  const users = (await knex('users').select('id', 'display_name')) as UserRow[];
  const now = new Date();

  for (const user of users) {
    const householdId = randomUUID();
    const memberId = randomUUID();

    await knex('households').insert({
      id: householdId,
      name: user.display_name ?? 'My Household',
      created_at: now,
      updated_at: now,
    });

    await knex('household_members').insert({
      id: memberId,
      household_id: householdId,
      user_id: user.id,
      role: 'owner',
      joined_at: now,
    });

    await knex('categories').where({ user_id: user.id }).update({ household_id: householdId });
  }

  // Step 3: Make household_id NOT NULL, add index, drop user_id
  await knex.schema.alterTable('categories', (table) => {
    table.uuid('household_id').notNullable().alter();
    table.index('household_id');
  });

  // Drop FK first (MariaDB requires FK dropped before its supporting index)
  await knex.schema.alterTable('categories', (table) => {
    table.dropForeign(['user_id']);
  });
  await knex.schema.alterTable('categories', (table) => {
    table.dropColumn('user_id'); // MariaDB automatically drops the index when the column is dropped
  });
}

export async function down(knex: Knex): Promise<void> {
  // Step 1: Add user_id back (nullable initially)
  await knex.schema.alterTable('categories', (table) => {
    table
      .uuid('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .after('id');
  });

  // Step 2: Restore user_id from the household owner
  if (isMySQL(knex)) {
    await knex.raw(`
      UPDATE categories c
      JOIN household_members hm ON hm.household_id = c.household_id AND hm.role = 'owner'
      SET c.user_id = hm.user_id
    `);
  } else {
    // PostgreSQL / SQLite: use a correlated subquery (JOIN in UPDATE is MySQL-only)
    await knex.raw(`
      UPDATE categories
      SET user_id = (
        SELECT hm.user_id
        FROM household_members hm
        WHERE hm.household_id = categories.household_id
          AND hm.role = 'owner'
      )
    `);
  }

  // Step 3: Make user_id NOT NULL, add index, drop household_id
  await knex.schema.alterTable('categories', (table) => {
    table.uuid('user_id').notNullable().alter();
    table.index('user_id');
  });

  await knex.schema.alterTable('categories', (table) => {
    table.dropForeign(['household_id']);
  });
  await knex.schema.alterTable('categories', (table) => {
    table.dropColumn('household_id');
  });
}
