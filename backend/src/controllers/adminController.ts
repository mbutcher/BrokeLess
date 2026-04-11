import * as path from 'path';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { getDatabase } from '@config/database';
import { env } from '@config/env';
import { logger } from '@utils/logger';

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function seedsDirectory(): string {
  // Prod build runs from /app/dist; dev runs from /app/src.
  return env.isProduction || env.isStaging
    ? path.join(__dirname, '..', 'database', 'seeds')
    : path.join(__dirname, '..', '..', 'src', 'database', 'seeds');
}

export const adminController = {
  async resetSeeds(req: Request, res: Response): Promise<Response> {
    const provided = (req.header('x-reset-token') ?? '').trim();
    if (!env.reset.token || !provided || !constantTimeEqual(provided, env.reset.token)) {
      logger.warn('reset-seeds: token mismatch', { ip: req.ip });
      return res.status(401).json({ status: 'error', error: 'Unauthorized' });
    }

    const db = getDatabase();
    const t0 = Date.now();
    try {
      const t1 = Date.now();
      await db.migrate.rollback(undefined, true);
      const rollbackMs = Date.now() - t1;

      const t2 = Date.now();
      await db.migrate.latest();
      const migrateMs = Date.now() - t2;

      const ext = env.isProduction || env.isStaging ? 'js' : 'ts';
      const t3 = Date.now();
      await db.seed.run({
        directory: seedsDirectory(),
        extension: ext,
        loadExtensions: [`.${ext}`],
      });
      const seedMs = Date.now() - t3;
      const totalMs = Date.now() - t0;

      const timings = { rollbackMs, migrateMs, seedMs, totalMs };
      logger.info('reset-seeds: success', timings);
      return res.status(200).json({ status: 'success', data: { timings } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('reset-seeds: failed', { error: message });
      return res.status(500).json({ status: 'error', error: message });
    }
  },
};
