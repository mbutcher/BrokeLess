import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { SimplefinAccountMapping } from '@typings/core.types';

function rowToMapping(row: Record<string, unknown>): SimplefinAccountMapping {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    simplefinAccountId: row['simplefin_account_id'] as string,
    simplefinOrgName: row['simplefin_org_name'] as string,
    simplefinAccountName: row['simplefin_account_name'] as string,
    simplefinAccountType: row['simplefin_account_type'] as string,
    localAccountId: row['local_account_id'] ? String(row['local_account_id']) : null,
    ignored: Boolean(row['ignored']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class SimplefinAccountMappingRepository {
  private get db() {
    return getDatabase();
  }

  async findBySimplefinId(
    userId: string,
    simplefinAccountId: string
  ): Promise<SimplefinAccountMapping | null> {
    const row: unknown = await this.db('simplefin_account_mappings')
      .where({ user_id: userId, simplefin_account_id: simplefinAccountId })
      .first();
    return row ? rowToMapping(row as Record<string, unknown>) : null;
  }

  async findAllByUser(userId: string): Promise<SimplefinAccountMapping[]> {
    const rows = await this.db('simplefin_account_mappings')
      .where({ user_id: userId })
      .orderBy('simplefin_org_name', 'asc');
    return rows.map(rowToMapping);
  }

  async findUnmapped(userId: string): Promise<SimplefinAccountMapping[]> {
    const rows = await this.db('simplefin_account_mappings')
      .where({ user_id: userId })
      .whereNull('local_account_id')
      .orderBy('simplefin_org_name', 'asc');
    return rows.map(rowToMapping);
  }

  /**
   * Insert a brand-new mapping row (no prior-existence check).
   * Use during sync for accounts discovered for the first time.
   */
  async insert(data: {
    userId: string;
    simplefinAccountId: string;
    simplefinOrgName: string;
    simplefinAccountName: string;
    simplefinAccountType: string;
  }): Promise<void> {
    const id = randomUUID();
    await this.db('simplefin_account_mappings').insert({
      id,
      user_id: data.userId,
      simplefin_account_id: data.simplefinAccountId,
      simplefin_org_name: data.simplefinOrgName,
      simplefin_account_name: data.simplefinAccountName,
      simplefin_account_type: data.simplefinAccountType,
      local_account_id: null,
    });
  }

  /**
   * Update only the display fields (org name, account name, account type) for an
   * existing mapping. Does not touch local_account_id or ignored.
   * Use during sync to keep the display info fresh without extra SELECTs.
   */
  async updateOrgInfo(
    userId: string,
    simplefinAccountId: string,
    orgName: string,
    accountName: string,
    accountType: string
  ): Promise<void> {
    await this.db('simplefin_account_mappings')
      .where({ user_id: userId, simplefin_account_id: simplefinAccountId })
      .update({
        simplefin_org_name: orgName,
        simplefin_account_name: accountName,
        simplefin_account_type: accountType,
        updated_at: new Date(),
      });
  }

  async upsert(data: {
    userId: string;
    simplefinAccountId: string;
    simplefinOrgName: string;
    simplefinAccountName: string;
    simplefinAccountType: string;
    localAccountId?: string | null;
  }): Promise<SimplefinAccountMapping> {
    const existing = await this.findBySimplefinId(data.userId, data.simplefinAccountId);

    if (existing) {
      // Update org name and account name in case they changed on SimpleFIN's side
      await this.db('simplefin_account_mappings')
        .where({ user_id: data.userId, simplefin_account_id: data.simplefinAccountId })
        .update({
          simplefin_org_name: data.simplefinOrgName,
          simplefin_account_name: data.simplefinAccountName,
          simplefin_account_type: data.simplefinAccountType,
          ...(data.localAccountId !== undefined && { local_account_id: data.localAccountId }),
        });
      const updated = await this.findBySimplefinId(data.userId, data.simplefinAccountId);
      return updated!;
    }

    const id = randomUUID();
    await this.db('simplefin_account_mappings').insert({
      id,
      user_id: data.userId,
      simplefin_account_id: data.simplefinAccountId,
      simplefin_org_name: data.simplefinOrgName,
      simplefin_account_name: data.simplefinAccountName,
      simplefin_account_type: data.simplefinAccountType,
      local_account_id: data.localAccountId ?? null,
    });
    const created: unknown = await this.db('simplefin_account_mappings').where({ id }).first();
    return rowToMapping(created as Record<string, unknown>);
  }

  async setLocalAccount(
    userId: string,
    simplefinAccountId: string,
    localAccountId: string
  ): Promise<void> {
    await this.db('simplefin_account_mappings')
      .where({ user_id: userId, simplefin_account_id: simplefinAccountId })
      .update({ local_account_id: localAccountId, ignored: false });
  }

  async setIgnored(userId: string, simplefinAccountId: string, ignored: boolean): Promise<void> {
    await this.db('simplefin_account_mappings')
      .where({ user_id: userId, simplefin_account_id: simplefinAccountId })
      .update({ ignored });
  }

  async countUnlinkedActive(userId: string): Promise<number> {
    const result = await this.db('simplefin_account_mappings')
      .where({ user_id: userId, ignored: false })
      .whereNull('local_account_id')
      .count('id as count')
      .first();
    return Number(result?.['count'] ?? 0);
  }
}

export const simplefinAccountMappingRepository = new SimplefinAccountMappingRepository();
