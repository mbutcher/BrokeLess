import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { CategorizationRuleRow } from '@typings/core.types';

class CategorizationRuleRepository {
  private get db() {
    return getDatabase();
  }

  async findByUser(userId: string): Promise<CategorizationRuleRow[]> {
    return this.db('categorization_rules')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .select('*') as Promise<CategorizationRuleRow[]>;
  }

  async create(
    userId: string,
    payeeEncrypted: string,
    tokenHashes: string[],
    categoryId: string | null,
    budgetLineId: string | null
  ): Promise<CategorizationRuleRow> {
    const now = new Date().toISOString();
    const id = randomUUID();
    await this.db('categorization_rules').insert({
      id,
      user_id: userId,
      payee_encrypted: payeeEncrypted,
      token_hashes: JSON.stringify(tokenHashes),
      category_id: categoryId ?? null,
      budget_line_id: budgetLineId ?? null,
      created_at: now,
      updated_at: now,
    });
    const row = await this.db('categorization_rules').where({ id }).first<CategorizationRuleRow>();
    return row;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db('categorization_rules').where({ id, user_id: userId }).delete();
  }

  /**
   * Finds the most recent rule for this user whose stored token hashes overlap
   * with the provided token hashes (any match = eligible). Returns null if none.
   */
  async findMatchingRule(
    userId: string,
    tokenHashes: string[]
  ): Promise<CategorizationRuleRow | null> {
    if (tokenHashes.length === 0) return null;
    const rules = await this.findByUser(userId);
    const tokenSet = new Set(tokenHashes);
    for (const rule of rules) {
      let ruleTokens: string[] = [];
      try {
        ruleTokens = JSON.parse(rule.token_hashes) as string[];
      } catch {
        continue;
      }
      const hasOverlap = ruleTokens.some((t) => tokenSet.has(t));
      if (hasOverlap) return rule;
    }
    return null;
  }
}

export const categorizationRuleRepository = new CategorizationRuleRepository();
