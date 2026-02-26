/**
 * One-time backfill script: populates the transaction_search_index table for all
 * existing transactions.  Safe to re-run — index() does DELETE + INSERT per row.
 *
 * Usage:
 *   cd backend && npm run search:backfill
 */
import { initializeDatabase, closeDatabase } from '@config/database';
import { logger } from '@utils/logger';
import { encryptionService } from '@services/encryption/encryptionService';
import { extractSearchTokens } from '@utils/searchTokens';
import { transactionSearchRepository } from '@repositories/transactionSearchRepository';

const BATCH_SIZE = 500;

interface TxRow {
  id: string;
  user_id: string;
  payee: string | null;
  description: string | null;
}

async function run(): Promise<void> {
  const db = await initializeDatabase();

  logger.info('Starting search index backfill…');

  let offset = 0;
  let totalProcessed = 0;

  for (;;) {
    const batch = (await db('transactions')
      .select('id', 'user_id', 'payee', 'description')
      .orderBy('created_at', 'asc')
      .limit(BATCH_SIZE)
      .offset(offset)) as TxRow[];

    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        const plainPayee = row.payee ? encryptionService.decrypt(row.payee) : null;
        const plainDesc = row.description ? encryptionService.decrypt(row.description) : null;
        const tokens = extractSearchTokens(plainPayee, plainDesc);
        const hashes = tokens.map((t) => encryptionService.hash(t));
        await transactionSearchRepository.index(row.id, row.user_id, hashes);
        totalProcessed++;
      } catch (err) {
        logger.warn('Skipping transaction during backfill (decrypt error)', {
          transactionId: row.id,
          err,
        });
      }
    }

    logger.info(`Processed ${totalProcessed} transactions so far…`);
    offset += BATCH_SIZE;

    if (batch.length < BATCH_SIZE) break;
  }

  logger.info(`Backfill complete. Total transactions indexed: ${totalProcessed}`);
  await closeDatabase();
}

run().catch((err: unknown) => {
  logger.error('Backfill failed', { err });
  process.exit(1);
});
