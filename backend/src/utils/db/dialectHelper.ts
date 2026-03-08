/**
 * dialectHelper.ts
 *
 * Provides dialect-aware SQL helpers for SQLite, MySQL/MariaDB, and PostgreSQL.
 * All raw SQL that differs between dialects should go through this utility.
 *
 * Consumers import the singleton `dialectHelper` and call its methods.
 */

import type { Knex } from 'knex';
import { env } from '@config/env';

export type DbClient = 'sqlite3' | 'mysql2' | 'pg';

/** Returns true if running against MySQL / MariaDB */
export function isMySQL(knex: Knex): boolean {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  const c: string = (knex as any).client?.config?.client ?? '';
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  return c === 'mysql' || c === 'mysql2';
}

/** Returns true if running against PostgreSQL */
export function isPostgres(knex: Knex): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  return (knex as any).client?.config?.client === 'pg';
}

/** Returns true if running against SQLite (better-sqlite3) */
export function isSQLite(knex: Knex): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  return (knex as any).client?.config?.client === 'better-sqlite3';
}

// ─── SQL fragment helpers (return plain strings for embedding in raw blocks) ──

class DialectHelper {
  private readonly client: DbClient;

  constructor(client: DbClient) {
    this.client = client;
  }

  // ─── String-returning helpers (for interpolation in large raw SQL blocks) ──

  /**
   * Returns a SQL fragment that formats a date column as 'YYYY-MM'.
   * Safe to embed in a larger raw SQL string — `col` must be a trusted column expression.
   */
  formatMonthSQL(col: string): string {
    switch (this.client) {
      case 'sqlite3':
        return `strftime('%Y-%m', ${col})`;
      case 'pg':
        return `TO_CHAR(${col}, 'YYYY-MM')`;
      default:
        return `DATE_FORMAT(${col}, '%Y-%m')`;
    }
  }

  /**
   * Returns a SQL fragment for "a specific date expression minus N units".
   * `colExpr` is a trusted column/expression (e.g. `'t2.date'` or `'?'`).
   * The caller is responsible for providing bound parameters when using `'?'`.
   */
  dateSubSQL(colExpr: string, n: number, unit: 'MONTH' | 'DAY'): string {
    const unitLower = unit.toLowerCase() + 's'; // 'months' | 'days'
    switch (this.client) {
      case 'sqlite3':
        return `DATE(${colExpr}, '-${n} ${unitLower}')`;
      case 'pg':
        return `(${colExpr} - INTERVAL '${n} ${unitLower}')`;
      default:
        return `DATE_SUB(${colExpr}, INTERVAL ${n} ${unit})`;
    }
  }

  /**
   * Returns a SQL fragment for "current date/time minus N units".
   * Used in WHERE clauses like `.where('date', '>=', helper.nowMinusIntervalSQL(6, 'MONTH'))`.
   */
  nowMinusIntervalSQL(n: number, unit: 'MONTH' | 'DAY'): string {
    const unitLower = unit.toLowerCase() + 's';
    switch (this.client) {
      case 'sqlite3':
        return `DATE('now', '-${n} ${unitLower}')`;
      case 'pg':
        return `(CURRENT_DATE - INTERVAL '${n} ${unitLower}')`;
      default:
        // Use CURDATE() for date-only, NOW() for datetime
        return unit === 'DAY'
          ? `DATE_SUB(NOW(), INTERVAL ${n} ${unit})`
          : `DATE_SUB(CURDATE(), INTERVAL ${n} ${unit})`;
    }
  }

  /**
   * Returns a SQL expression for ABS difference in days between two date columns.
   * Used in .whereRaw() — `colA` and `colB` must be trusted column/parameter expressions.
   */
  datediffAbsSQL(colA: string, colB: string): string {
    switch (this.client) {
      case 'sqlite3':
        return `ABS(CAST(julianday(${colA}) - julianday(${colB}) AS INTEGER))`;
      case 'pg':
        return `ABS(${colA}::date - ${colB}::date)`;
      default:
        return `ABS(DATEDIFF(${colA}, ${colB}))`;
    }
  }

  // ─── Knex.Raw helpers (for direct use in query builder) ───────────────────

  /**
   * Returns a Knex.Raw expression for "current date/time minus N units".
   * Use this in `.where('col', '>=', dialectHelper.nowMinusInterval(db, n, unit))`.
   */
  nowMinusInterval(db: Knex, n: number, unit: 'MONTH' | 'DAY'): Knex.Raw {
    return db.raw(this.nowMinusIntervalSQL(n, unit));
  }

  /**
   * Returns a Knex.Raw expression for formatting a date column as 'YYYY-MM'.
   */
  formatMonth(db: Knex, col: string): Knex.Raw {
    return db.raw(this.formatMonthSQL(col));
  }

  /**
   * Extracts the row array from the result of a `db.raw()` call.
   * Each database driver returns raw results in a different shape:
   *   - pg:           `{ rows: T[] }`
   *   - mysql2:       `[T[], FieldPacket[]]`
   *   - better-sqlite3: `T[]`
   */
  rawRows<T>(result: unknown): T[] {
    switch (this.client) {
      case 'pg':
        return (result as { rows: T[] }).rows ?? [];
      case 'sqlite3':
        return (result as T[]) ?? [];
      default:
        return (result as [T[], unknown])[0] ?? [];
    }
  }

  // ─── Async operation helpers ───────────────────────────────────────────────

  /**
   * Bulk upsert rows into budget_categories using the dialect-appropriate syntax.
   * The budget_categories table has a UNIQUE(budget_id, category_id) constraint.
   */
  async upsertBudgetCategories(
    db: Knex,
    rows: Array<{ budget_id: string; category_id: string; allocated_amount: number }>
  ): Promise<void> {
    if (rows.length === 0) return;
    const placeholders = rows.map(() => '(?, ?, ?)').join(', ');
    const values = rows.flatMap((r) => [r.budget_id, r.category_id, r.allocated_amount]);

    if (this.client === 'mysql2') {
      await db.raw(
        `INSERT INTO budget_categories (budget_id, category_id, allocated_amount)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE allocated_amount = VALUES(allocated_amount), updated_at = NOW()`,
        values
      );
    } else {
      // PostgreSQL (3.24+) and SQLite (3.24+) both support ON CONFLICT ... DO UPDATE
      await db.raw(
        `INSERT INTO budget_categories (budget_id, category_id, allocated_amount)
         VALUES ${placeholders}
         ON CONFLICT (budget_id, category_id) DO UPDATE SET
           allocated_amount = EXCLUDED.allocated_amount,
           updated_at = CURRENT_TIMESTAMP`,
        values
      );
    }
  }

  /**
   * Insert a single row, silently ignoring duplicate-key violations.
   * `table` must be a trusted internal table name (not user input).
   */
  async insertIgnore(db: Knex, table: string, data: Record<string, unknown>): Promise<void> {
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = cols.map(() => '?').join(', ');

    if (this.client === 'sqlite3') {
      await db.raw(
        `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        vals
      );
    } else if (this.client === 'pg') {
      await db.raw(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        vals
      );
    } else {
      await db.raw(
        `INSERT IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        vals
      );
    }
  }

  /**
   * Disable foreign key constraint enforcement.
   * Call before bulk truncation/seeding; always pair with enableForeignKeyChecks().
   */
  async disableForeignKeyChecks(db: Knex): Promise<void> {
    switch (this.client) {
      case 'sqlite3':
        await db.raw('PRAGMA foreign_keys = OFF');
        break;
      case 'pg':
        await db.raw("SET session_replication_role = 'replica'");
        break;
      default:
        await db.raw('SET FOREIGN_KEY_CHECKS = 0');
    }
  }

  /**
   * Re-enable foreign key constraint enforcement.
   */
  async enableForeignKeyChecks(db: Knex): Promise<void> {
    switch (this.client) {
      case 'sqlite3':
        await db.raw('PRAGMA foreign_keys = ON');
        break;
      case 'pg':
        await db.raw("SET session_replication_role = 'origin'");
        break;
      default:
        await db.raw('SET FOREIGN_KEY_CHECKS = 1');
    }
  }
}

// Singleton — initialised from env at module load time
export const dialectHelper = new DialectHelper(env.db.client);
