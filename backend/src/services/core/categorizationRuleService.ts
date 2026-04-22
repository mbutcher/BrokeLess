import { encryptionService } from '@services/encryption/encryptionService';
import { categorizationRuleRepository } from '@repositories/categorizationRuleRepository';
import { transactionRepository } from '@repositories/transactionRepository';
import { tokenize } from '@utils/searchTokens';
import { AppError } from '@middleware/errorHandler';
import type { CategorizationRule, CreateCategorizationRuleData } from '@typings/core.types';

function rowToRule(row: {
  id: string;
  user_id: string;
  payee_encrypted: string;
  budget_line_id: string | null;
  created_at: string;
  updated_at: string;
}): CategorizationRule {
  return {
    id: row.id,
    userId: row.user_id,
    payee: encryptionService.decrypt(row.payee_encrypted),
    budgetLineId: row.budget_line_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

class CategorizationRuleService {
  async listRules(userId: string): Promise<CategorizationRule[]> {
    const rows = await categorizationRuleRepository.findByUser(userId);
    return rows.map(rowToRule);
  }

  async createRule(
    userId: string,
    data: Omit<CreateCategorizationRuleData, 'userId'>
  ): Promise<CategorizationRule> {
    if (!data.payee?.trim()) throw new AppError('Payee is required', 400);
    const payeeEncrypted = encryptionService.encrypt(data.payee.trim());
    const tokenHashes = tokenize(data.payee.trim()).map((t) => encryptionService.hash(t));
    if (tokenHashes.length === 0) throw new AppError('Payee contains no indexable tokens', 400);
    const row = await categorizationRuleRepository.create(
      userId,
      payeeEncrypted,
      tokenHashes,
      null,
      data.budgetLineId ?? null
    );
    return rowToRule(row);
  }

  async deleteRule(userId: string, ruleId: string): Promise<void> {
    await categorizationRuleRepository.delete(ruleId, userId);
  }

  /**
   * Checks if a plaintext payee matches any saved rule for this user.
   * If a match is found and the transaction has no category/budget line, applies the rule.
   * Fire-and-forget safe (errors are swallowed).
   */
  async applyRuleIfMatch(
    userId: string,
    transactionId: string,
    payee: string | null
  ): Promise<void> {
    if (!payee) return;
    const tokens = tokenize(payee);
    if (tokens.length === 0) return;
    const tokenHashes = tokens.map((t) => encryptionService.hash(t));
    const rule = await categorizationRuleRepository.findMatchingRule(userId, tokenHashes);
    if (!rule) return;
    await transactionRepository.bulkCategorize(
      userId,
      [transactionId],
      rule.budget_line_id
    );
  }
}

export const categorizationRuleService = new CategorizationRuleService();
