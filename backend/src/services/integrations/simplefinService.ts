import { getDatabase } from '@config/database';
import { encryptionService } from '@services/encryption/encryptionService';
import { simplefinApiClient } from './simplefinApiClient';
import { simplefinRepository } from '@repositories/simplefinRepository';
import logger from '@utils/logger';
import { simplefinAccountMappingRepository } from '@repositories/simplefinAccountMappingRepository';
import { simplefinPendingReviewRepository } from '@repositories/simplefinPendingReviewRepository';
import { accountRepository } from '@repositories/accountRepository';
import { accountService } from '@services/core/accountService';
import { transactionRepository } from '@repositories/transactionRepository';
import { AppError } from '@middleware/errorHandler';
import { similarity } from '@utils/similarity';
import { dashboardHintsService } from '@services/core/dashboardHintsService';
import { categorizationRuleService } from '@services/core/categorizationRuleService';
import type {
  SimplefinConnection,
  SimplefinAccountMapping,
  SimplefinPendingReview,
  SyncResult,
  MapAccountData,
  UpdateSimplefinScheduleData,
} from '@typings/core.types';
import type { SimplefinTransaction } from '@typings/simplefin.types';

/** Amount tolerance for fuzzy-match deduplication (within $0.01) */
const AMOUNT_TOLERANCE = 0.01;
/** Minimum payee similarity score to flag as probable duplicate */
const FUZZY_THRESHOLD = 0.7;
/** How many days back to look for fuzzy-match candidates */
const FUZZY_LOOKBACK_DAYS = 14;
/** Safety overlap: re-fetch transactions since (lastSyncAt - 3 days) */
const SYNC_OVERLAP_DAYS = 3;

class SimplefinService {
  private get db() {
    return getDatabase();
  }

  // ─── Connection Management ────────────────────────────────────────────────

  async connect(userId: string, setupToken: string): Promise<SimplefinConnection> {
    // Exchange the one-time setup token for a permanent access URL.
    // We do NOT call fetchAccounts here — the token is one-time-use, so burning it and then
    // failing a validation call would leave the user with no token and no connection.
    // Any connectivity issues will surface on the first sync instead.
    const accessUrl = await simplefinApiClient.claimToken(setupToken);
    const encrypted = encryptionService.encrypt(accessUrl);
    return simplefinRepository.upsertConnection(userId, encrypted);
  }

  async disconnect(userId: string): Promise<void> {
    const existing = await simplefinRepository.findConnectionByUser(userId);
    if (!existing) throw new AppError('No SimpleFIN connection found', 404);
    // Keep account mappings and pending reviews — re-connecting retains history
    await simplefinRepository.deleteConnection(userId);
  }

  async getConnection(userId: string): Promise<SimplefinConnection | null> {
    return simplefinRepository.findConnectionByUser(userId);
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  async sync(userId: string, fullSync = false): Promise<SyncResult> {
    const accessUrlEncrypted = await simplefinRepository.findAccessUrl(userId);
    if (!accessUrlEncrypted) throw new AppError('No SimpleFIN connection found', 404);

    await simplefinRepository.updateSyncStatus(userId, 'pending');

    const result: SyncResult = {
      imported: 0,
      skipped: 0,
      pendingReviews: 0,
      unmappedAccounts: 0,
      total: 0,
    };

    try {
      const plainAccessUrl = encryptionService.decrypt(accessUrlEncrypted);

      // Full sync: pass Unix epoch as start-date so SimpleFIN returns its entire stored history.
      //   SimpleFIN Bridge maintains a per-connection cursor — omitting start-date returns only
      //   transactions *since the last API call*, NOT all history. Sending epoch forces a full dump.
      // Normal sync: use lastSyncAt - SYNC_OVERLAP_DAYS for safety overlap.
      let startDate: Date;
      if (fullSync) {
        startDate = new Date(0); // Unix epoch → all available history
      } else {
        const connection = await simplefinRepository.findConnectionByUser(userId);
        if (connection?.lastSyncAt) {
          startDate = new Date(connection.lastSyncAt);
          startDate.setDate(startDate.getDate() - SYNC_OVERLAP_DAYS);
        } else {
          startDate = new Date(0); // First ever sync — grab everything
        }
      }

      const [apiResponse, discardedIds, existingMappings] = await Promise.all([
        simplefinApiClient.fetchAccounts(plainAccessUrl, startDate),
        simplefinRepository.getDiscardedIds(userId),
        // Pre-fetch all account mappings once to avoid N+1 in the loop below
        simplefinAccountMappingRepository.findAllByUser(userId),
      ]);

      const mappingBySimplefinId = new Map(existingMappings.map((m) => [m.simplefinAccountId, m]));

      for (const sfAccount of apiResponse.accounts) {
        const mapping = mappingBySimplefinId.get(sfAccount.id) ?? null;
        const orgName = sfAccount.org.name;
        const accountName = sfAccount.name;
        const accountType = sfAccount['account-type'] ?? sfAccount.name;

        if (!mapping) {
          // Newly discovered account — record it and ask user to map it
          await simplefinAccountMappingRepository.insert({
            userId,
            simplefinAccountId: sfAccount.id,
            simplefinOrgName: orgName,
            simplefinAccountName: accountName,
            simplefinAccountType: accountType,
          });
          result.unmappedAccounts++;
          continue;
        }

        // Update org/account display info in case it changed on SimpleFIN's side
        await simplefinAccountMappingRepository.updateOrgInfo(
          userId,
          sfAccount.id,
          orgName,
          accountName,
          accountType
        );

        if (!mapping.localAccountId) {
          // Already known but not yet mapped by user (skip if intentionally ignored)
          if (!mapping.ignored) result.unmappedAccounts++;
          continue;
        }

        // Update local account balance from SimpleFIN's reported balance
        const sfBalance = parseFloat(sfAccount.balance);
        if (!isNaN(sfBalance)) {
          await accountRepository.setCurrentBalance(mapping.localAccountId, userId, sfBalance);
        }

        // Import transactions for this mapped account
        result.total += sfAccount.transactions.length;
        const txResult = await this.importTransactions(
          userId,
          mapping.localAccountId,
          sfAccount.transactions,
          discardedIds
        );

        result.imported += txResult.imported;
        result.skipped += txResult.skipped;
        result.pendingReviews += txResult.pendingReviews;
      }

      await simplefinRepository.updateSyncTimestamp(userId);
      await simplefinRepository.updateSyncStatus(userId, 'success');
      void simplefinRepository
        .pruneDiscardedIds(userId)
        .catch((err: unknown) =>
          logger.warn('Failed to prune discarded SimpleFIN IDs', { userId, err })
        );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await simplefinRepository.updateSyncStatus(userId, 'error', message);
      throw err;
    }

    return result;
  }

  private async importTransactions(
    userId: string,
    localAccountId: string,
    sfTransactions: SimplefinTransaction[],
    discardedIds: string[]
  ): Promise<{ imported: number; skipped: number; pendingReviews: number }> {
    const counts = { imported: 0, skipped: 0, pendingReviews: 0 };

    // Collect all candidate IDs upfront for bulk deduplication lookups
    const candidateIds = sfTransactions.map((tx) => tx.id);

    // Load recent existing transactions for fuzzy matching (decrypt payees in memory)
    const [recentTxs, importedIds, pendingIds] = await Promise.all([
      transactionRepository.findRecentForAccount(userId, localAccountId, FUZZY_LOOKBACK_DAYS),
      transactionRepository.findImportedSimplefinIds(userId, candidateIds),
      simplefinPendingReviewRepository.findPendingSimplefinIds(userId, candidateIds),
    ]);

    const discardedSet = new Set(discardedIds);

    for (const sfTx of sfTransactions) {
      // Skip pending transactions — only import posted ones
      if (sfTx.pending) {
        counts.skipped++;
        continue;
      }

      // Skip if explicitly discarded by user
      if (discardedSet.has(sfTx.id)) {
        counts.skipped++;
        continue;
      }

      // Primary deduplication: exact SimpleFIN ID match
      if (importedIds.has(sfTx.id)) {
        counts.skipped++;
        continue;
      }

      // Check if already in pending reviews
      if (pendingIds.has(sfTx.id)) {
        counts.skipped++;
        continue;
      }

      const sfAmount = parseFloat(sfTx.amount);
      if (isNaN(sfAmount)) {
        counts.skipped++;
        continue;
      }

      // Fuzzy match: check recent transactions for same amount and similar payee
      const sfDate = new Date(sfTx.posted * 1000).toISOString().slice(0, 10);
      let bestMatch: { transactionId: string; score: number } | null = null;

      for (const tx of recentTxs) {
        if (Math.abs(Math.abs(tx.amount) - Math.abs(sfAmount)) > AMOUNT_TOLERANCE) continue;

        // Payee is stored encrypted — decrypt for comparison
        const existingPayee = tx.payee ? encryptionService.decrypt(tx.payee) : '';
        const existingDesc = tx.description ? encryptionService.decrypt(tx.description) : '';
        const compareTarget = existingPayee || existingDesc;

        if (!compareTarget) continue;

        const score = similarity(sfTx.description, compareTarget);
        if (score >= FUZZY_THRESHOLD) {
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { transactionId: tx.id, score };
          }
        }
      }

      if (bestMatch) {
        // Probable duplicate — create a pending review
        await simplefinPendingReviewRepository.create({
          userId,
          simplefinTransactionId: sfTx.id,
          rawData: sfTx,
          candidateTransactionId: bestMatch.transactionId,
          localAccountId,
          similarityScore: bestMatch.score,
        });
        counts.pendingReviews++;
        continue;
      }

      // Import as a new transaction
      let importedTxId: string | null = null;
      await this.db.transaction(async (trx) => {
        const created = await transactionRepository.create(
          {
            userId,
            accountId: localAccountId,
            amount: sfAmount,
            payee: encryptionService.encrypt(sfTx.description),
            date: sfDate,
            simplefinTransactionId: sfTx.id,
          },
          trx
        );
        importedTxId = created.id;
        // Balance already updated from SimpleFIN's reported balance — don't double-count
      });

      // Fire-and-forget: apply categorization rule if one matches this payee
      if (importedTxId) {
        void categorizationRuleService
          .applyRuleIfMatch(userId, importedTxId, sfTx.description)
          .catch((e: unknown) => logger.warn('categorizationRule apply failed', String(e)));
      }

      counts.imported++;
    }

    return counts;
  }

  // ─── Account Mapping ──────────────────────────────────────────────────────

  async mapAccount(
    userId: string,
    simplefinAccountId: string,
    data: MapAccountData
  ): Promise<void> {
    const mapping = await simplefinAccountMappingRepository.findBySimplefinId(
      userId,
      simplefinAccountId
    );
    if (!mapping) throw new AppError('SimpleFIN account mapping not found', 404);

    if (data.action === 'link') {
      if (!data.localAccountId) throw new AppError('localAccountId is required for link', 400);
      const account = await accountRepository.findById(data.localAccountId, userId);
      if (!account) throw new AppError('Account not found', 404);

      await accountRepository.setSimplefinAccountId(
        data.localAccountId,
        userId,
        simplefinAccountId
      );
      await simplefinAccountMappingRepository.setLocalAccount(
        userId,
        simplefinAccountId,
        data.localAccountId
      );
    } else {
      // 'create'
      if (!data.newAccount) throw new AppError('newAccount data is required for create', 400);
      const account = await accountService.createAccount(userId, {
        name: data.newAccount.name,
        type: data.newAccount.type,
        isAsset: data.newAccount.isAsset,
        startingBalance: 0,
        currency: data.newAccount.currency,
        color: data.newAccount.color,
        institution: mapping.simplefinOrgName,
      });
      await accountRepository.setSimplefinAccountId(account.id, userId, simplefinAccountId);
      await simplefinAccountMappingRepository.setLocalAccount(
        userId,
        simplefinAccountId,
        account.id
      );
    }
    dashboardHintsService.clearCache(userId);
  }

  async getAllAccounts(userId: string): Promise<SimplefinAccountMapping[]> {
    return simplefinAccountMappingRepository.findAllByUser(userId);
  }

  async ignoreAccount(userId: string, simplefinAccountId: string): Promise<void> {
    const mapping = await simplefinAccountMappingRepository.findBySimplefinId(
      userId,
      simplefinAccountId
    );
    if (!mapping) throw new AppError('SimpleFIN account mapping not found', 404);
    await simplefinAccountMappingRepository.setIgnored(userId, simplefinAccountId, true);
    dashboardHintsService.clearCache(userId);
  }

  async getUnmappedAccounts(userId: string): Promise<SimplefinAccountMapping[]> {
    return simplefinAccountMappingRepository.findUnmapped(userId);
  }

  // ─── Pending Reviews ──────────────────────────────────────────────────────

  async getPendingReviews(userId: string): Promise<SimplefinPendingReview[]> {
    return simplefinPendingReviewRepository.findAllByUser(userId);
  }

  async getPendingReviewCount(userId: string): Promise<number> {
    return simplefinPendingReviewRepository.countByUser(userId);
  }

  async resolveReview(
    userId: string,
    reviewId: string,
    action: 'accept' | 'merge' | 'discard',
    targetTransactionId?: string
  ): Promise<void> {
    const review = await simplefinPendingReviewRepository.findById(userId, reviewId);
    if (!review) throw new AppError('Pending review not found', 404);

    if (action === 'accept') {
      if (!review.localAccountId) {
        throw new AppError('Review is missing account mapping — cannot import', 422);
      }

      const sfTx = review.rawData;
      const sfAmount = parseFloat(sfTx.amount);
      const sfDate = new Date(sfTx.posted * 1000).toISOString().slice(0, 10);

      // Balance is already set from SimpleFIN's reported balance during sync — do not update it here
      const acceptedTx = await transactionRepository.create({
        userId,
        accountId: review.localAccountId,
        amount: sfAmount,
        payee: encryptionService.encrypt(sfTx.description),
        date: sfDate,
        simplefinTransactionId: sfTx.id,
      });
      void categorizationRuleService
        .applyRuleIfMatch(userId, acceptedTx.id, sfTx.description)
        .catch((e: unknown) => logger.warn('categorizationRule apply failed', String(e)));
    } else if (action === 'merge') {
      if (!targetTransactionId) {
        throw new AppError('targetTransactionId is required for merge', 400);
      }
      // Mark the existing transaction as cleared — no new transaction created
      const tx = await transactionRepository.findById(targetTransactionId, userId);
      if (!tx) throw new AppError('Target transaction not found', 404);
      await transactionRepository.update(targetTransactionId, userId, { isCleared: true });
    } else {
      // 'discard' — store ID to prevent re-flagging on next sync
      await simplefinRepository.addDiscardedId(userId, review.simplefinTransactionId);
    }

    await simplefinPendingReviewRepository.delete(userId, reviewId);
  }

  async bulkAcceptReviews(userId: string): Promise<{ accepted: number }> {
    const reviews = await simplefinPendingReviewRepository.findAllByUser(userId);
    let accepted = 0;
    for (const review of reviews) {
      if (!review.localAccountId) continue;
      const sfTx = review.rawData;
      const sfAmount = parseFloat(sfTx.amount);
      if (isNaN(sfAmount)) continue;
      const sfDate = new Date(sfTx.posted * 1000).toISOString().slice(0, 10);
      try {
        const bulkTx = await transactionRepository.create({
          userId,
          accountId: review.localAccountId,
          amount: sfAmount,
          payee: encryptionService.encrypt(sfTx.description),
          date: sfDate,
          simplefinTransactionId: sfTx.id,
        });
        void categorizationRuleService
          .applyRuleIfMatch(userId, bulkTx.id, sfTx.description)
          .catch((e: unknown) => logger.warn('categorizationRule apply failed', String(e)));
        accepted++;
      } catch (err) {
        // Unique constraint violation: already imported — remove the stale review and move on
        logger.warn('bulkAcceptReviews: skipping already-imported review', {
          reviewId: review.id,
          simplefinTxId: sfTx.id,
          err,
        });
      }
      await simplefinPendingReviewRepository.delete(userId, review.id);
    }
    return { accepted };
  }

  // ─── Schedule ─────────────────────────────────────────────────────────────

  async updateSchedule(
    userId: string,
    data: UpdateSimplefinScheduleData
  ): Promise<SimplefinConnection> {
    const existing = await simplefinRepository.findConnectionByUser(userId);
    if (!existing) throw new AppError('No SimpleFIN connection found', 404);
    return simplefinRepository.updateSchedule(userId, data);
  }

  async getSchedule(userId: string): Promise<SimplefinConnection> {
    const connection = await simplefinRepository.findConnectionByUser(userId);
    if (!connection) throw new AppError('No SimpleFIN connection found', 404);
    return connection;
  }
}

export const simplefinService = new SimplefinService();
