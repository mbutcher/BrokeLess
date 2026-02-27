import { getDatabase } from '@config/database';
import { transactionRepository } from '@repositories/transactionRepository';
import { transactionLinkRepository } from '@repositories/transactionLinkRepository';
import { transactionSearchRepository } from '@repositories/transactionSearchRepository';
import { accountRepository } from '@repositories/accountRepository';
import { encryptionService } from '@services/encryption/encryptionService';
import { debtService } from '@services/core/debtService';
import { AppError } from '@middleware/errorHandler';
import { tokenize, extractSearchTokens } from '@utils/searchTokens';
import { logger } from '@utils/logger';
import type {
  PublicTransaction,
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  TransferCandidate,
  LinkType,
} from '@typings/core.types';

export interface PaginatedPublicTransactions {
  data: PublicTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTransactionResult {
  transaction: PublicTransaction;
  transferCandidates: TransferCandidate[];
}

function decryptTransaction(tx: Transaction): PublicTransaction {
  return {
    ...tx,
    description: tx.description ? encryptionService.decrypt(tx.description) : null,
    payee: tx.payee ? encryptionService.decrypt(tx.payee) : null,
    notes: tx.notes ? encryptionService.decrypt(tx.notes) : null,
  };
}

/** Fire-and-forget: build search index for a transaction from plaintext payee/description. */
function indexTransaction(
  transactionId: string,
  userId: string,
  payee: string | null,
  description: string | null
): void {
  const tokens = extractSearchTokens(payee, description);
  const hashes = tokens.map((t) => encryptionService.hash(t));
  void transactionSearchRepository.index(transactionId, userId, hashes).catch((err: unknown) => {
    logger.warn('Failed to index transaction for search', { transactionId, err });
  });
}

class TransactionService {
  private get db() {
    return getDatabase();
  }

  async listTransactions(
    userId: string,
    filters: TransactionFilters
  ): Promise<PaginatedPublicTransactions> {
    const q = filters.q?.trim();

    if (q) {
      const tokens = tokenize(q);
      // Query with no recognisable tokens — treat as no-match rather than returning everything
      if (tokens.length === 0) {
        return { data: [], total: 0, page: filters.page, limit: filters.limit };
      }
      const tokenHashes = tokens.map((t) => encryptionService.hash(t));
      const allowedIds = await transactionSearchRepository.findMatchingIds(userId, tokenHashes);
      const result = await transactionRepository.findAll(userId, { ...filters, allowedIds });
      return { ...result, data: result.data.map(decryptTransaction) };
    }

    const result = await transactionRepository.findAll(userId, filters);
    return {
      ...result,
      data: result.data.map(decryptTransaction),
    };
  }

  async getTransaction(userId: string, id: string): Promise<PublicTransaction> {
    const tx = await transactionRepository.findById(id, userId);
    if (!tx) throw new AppError('Transaction not found', 404);
    return decryptTransaction(tx);
  }

  /**
   * Creates a transaction, atomically updates the account balance, and
   * detects potential transfer candidates (returned for the client to confirm).
   */
  async createTransaction(
    userId: string,
    input: Omit<CreateTransactionData, 'userId'>
  ): Promise<CreateTransactionResult> {
    const account = await accountRepository.findById(input.accountId, userId);
    if (!account) throw new AppError('Account not found', 404);

    // Encrypt sensitive fields before storage
    const data: CreateTransactionData = {
      ...input,
      userId,
      description: input.description ? encryptionService.encrypt(input.description) : undefined,
      payee: input.payee ? encryptionService.encrypt(input.payee) : undefined,
      notes: input.notes ? encryptionService.encrypt(input.notes) : undefined,
    };

    let createdTx: Transaction;

    await this.db.transaction(async (trx) => {
      createdTx = await transactionRepository.create(data, trx);
      await accountRepository.updateBalance(input.accountId, input.amount, trx);
    });

    const publicTx = decryptTransaction(createdTx!);

    // Auto-split payment into principal/interest for loan/mortgage/credit_card accounts
    const debtAccountTypes = ['loan', 'mortgage', 'credit_card'];
    if (debtAccountTypes.includes(account.type) && input.amount < 0) {
      // Fire-and-forget — failure is logged inside debtService but must not reject the response
      void debtService.autoSplitPayment(createdTx!.id, input.accountId, userId, input.amount);
    }

    // Fire-and-forget: index plaintext payee + description for full-text search
    indexTransaction(createdTx!.id, userId, input.payee ?? null, input.description ?? null);

    // Candidate detection is outside the DB transaction — it's a read-only suggestion
    const candidateRows = await transactionRepository.findTransferCandidates(createdTx!);
    const transferCandidates: TransferCandidate[] = candidateRows.map((c) => ({
      transaction: decryptTransaction(c.transaction),
      account: c.account,
    }));

    return { transaction: publicTx, transferCandidates };
  }

  /**
   * Updates a transaction and adjusts the account balance delta atomically.
   * Handles account changes (reverse old, apply new).
   */
  async updateTransaction(
    userId: string,
    id: string,
    input: UpdateTransactionData
  ): Promise<PublicTransaction> {
    const existing = await transactionRepository.findById(id, userId);
    if (!existing) throw new AppError('Transaction not found', 404);

    const encryptedInput: UpdateTransactionData = { ...input };
    if (input.description !== undefined) {
      encryptedInput.description = input.description
        ? encryptionService.encrypt(input.description)
        : null;
    }
    if (input.payee !== undefined) {
      encryptedInput.payee = input.payee ? encryptionService.encrypt(input.payee) : null;
    }
    if (input.notes !== undefined) {
      encryptedInput.notes = input.notes ? encryptionService.encrypt(input.notes) : null;
    }

    await this.db.transaction(async (trx) => {
      const newAccountId = input.accountId ?? existing.accountId;
      const newAmount = input.amount ?? existing.amount;

      if (input.accountId && input.accountId !== existing.accountId) {
        // Moved to a different account — reverse old, apply new
        await accountRepository.updateBalance(existing.accountId, -existing.amount, trx);
        await accountRepository.updateBalance(newAccountId, newAmount, trx);
      } else if (input.amount !== undefined && input.amount !== existing.amount) {
        // Same account, amount changed — apply the delta
        const delta = newAmount - existing.amount;
        await accountRepository.updateBalance(existing.accountId, delta, trx);
      }

      await transactionRepository.update(id, userId, encryptedInput, trx);
    });

    const updated = await transactionRepository.findById(id, userId);

    // Re-index if payee or description changed
    if (input.payee !== undefined || input.description !== undefined) {
      const newPayee = input.payee !== undefined ? input.payee : decryptTransaction(existing).payee;
      const newDesc =
        input.description !== undefined
          ? input.description
          : decryptTransaction(existing).description;
      indexTransaction(id, userId, newPayee, newDesc);
    }

    return decryptTransaction(updated!);
  }

  /**
   * Deletes a transaction, reverses the balance impact, and removes any transfer link.
   * The search index rows are cleaned up automatically via ON DELETE CASCADE.
   */
  async deleteTransaction(userId: string, id: string): Promise<void> {
    const existing = await transactionRepository.findById(id, userId);
    if (!existing) throw new AppError('Transaction not found', 404);

    // Find linked transaction before we delete anything
    const link = await transactionLinkRepository.findByTransactionId(id);
    const linkedTxId = link
      ? link.fromTransactionId === id
        ? link.toTransactionId
        : link.fromTransactionId
      : null;

    await this.db.transaction(async (trx) => {
      // Reverse the balance impact
      await accountRepository.updateBalance(existing.accountId, -existing.amount, trx);

      // Remove the link and unmark the partner transaction
      if (linkedTxId) {
        await transactionLinkRepository.deleteByTransactionId(id, trx);
        await transactionRepository.setIsTransfer(linkedTxId, false, trx);
      }

      await transactionRepository.delete(id, userId, trx);
    });
  }

  async getTransferCandidates(userId: string, id: string): Promise<TransferCandidate[]> {
    const tx = await transactionRepository.findById(id, userId);
    if (!tx) throw new AppError('Transaction not found', 404);

    const candidateRows = await transactionRepository.findTransferCandidates(tx);
    return candidateRows.map((c) => ({
      transaction: decryptTransaction(c.transaction),
      account: c.account,
    }));
  }

  /**
   * Confirms a transfer link between two transactions.
   * Validates: both belong to user, amounts are equal and opposite, not already linked.
   */
  async linkTransactions(
    userId: string,
    txId: string,
    targetId: string,
    linkType: LinkType = 'transfer'
  ): Promise<void> {
    if (txId === targetId) throw new AppError('Cannot link a transaction to itself', 400);

    const [tx, target] = await Promise.all([
      transactionRepository.findById(txId, userId),
      transactionRepository.findById(targetId, userId),
    ]);

    if (!tx) throw new AppError('Transaction not found', 404);
    if (!target) throw new AppError('Target transaction not found', 404);

    if (tx.amount + target.amount !== 0) {
      throw new AppError('Transactions must have equal and opposite amounts to be linked', 422);
    }

    const existingLink = await transactionLinkRepository.findByTransactionId(txId);
    if (existingLink) throw new AppError('Transaction is already linked', 409);

    await this.db.transaction(async (trx) => {
      await transactionLinkRepository.create(txId, targetId, linkType, trx);
      await transactionRepository.setIsTransfer(txId, true, trx);
      await transactionRepository.setIsTransfer(targetId, true, trx);
    });
  }

  /**
   * Removes the transfer link between transactions and clears the is_transfer flag on both.
   */
  async unlinkTransactions(userId: string, txId: string): Promise<void> {
    const tx = await transactionRepository.findById(txId, userId);
    if (!tx) throw new AppError('Transaction not found', 404);

    const link = await transactionLinkRepository.findByTransactionId(txId);
    if (!link) throw new AppError('Transaction is not linked', 409);

    const linkedTxId =
      link.fromTransactionId === txId ? link.toTransactionId : link.fromTransactionId;

    await this.db.transaction(async (trx) => {
      await transactionLinkRepository.deleteByTransactionId(txId, trx);
      await transactionRepository.setIsTransfer(txId, false, trx);
      await transactionRepository.setIsTransfer(linkedTxId, false, trx);
    });
  }
}

export const transactionService = new TransactionService();
