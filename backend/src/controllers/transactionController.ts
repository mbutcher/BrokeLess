import type { Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { transactionService } from '@services/core/transactionService';
import { transactionTagRepository } from '@repositories/transactionTagRepository';
import type {
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  LinkType,
} from '@typings/core.types';

class TransactionController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string | undefined>;
    const filters: TransactionFilters = {
      accountId: query['accountId'],
      categoryId: query['categoryId'],
      budgetLineId: query['budgetLineId'],
      startDate: query['startDate'],
      endDate: query['endDate'],
      isTransfer: query['isTransfer'] !== undefined ? query['isTransfer'] === 'true' : undefined,
      q: query['q']?.trim() || undefined,
      tag: query['tag']?.trim().toLowerCase() || undefined,
      page: query['page'] ? parseInt(query['page'], 10) : 1,
      limit: query['limit'] ? Math.min(parseInt(query['limit'], 10), 100) : 50,
    };
    const result = await transactionService.listTransactions(req.user!.id, filters);
    res.json({ status: 'success', data: result });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const tx = await transactionService.getTransaction(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: { transaction: tx } });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as Omit<CreateTransactionData, 'userId'>;
    const result = await transactionService.createTransaction(req.user!.id, input);
    res.status(201).json({ status: 'success', data: result });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateTransactionData;
    const tx = await transactionService.updateTransaction(req.user!.id, req.params['id']!, input);
    res.json({ status: 'success', data: { transaction: tx } });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await transactionService.deleteTransaction(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });

  getCandidates = asyncHandler(async (req: Request, res: Response) => {
    const candidates = await transactionService.getTransferCandidates(
      req.user!.id,
      req.params['id']!
    );
    res.json({ status: 'success', data: { candidates } });
  });

  link = asyncHandler(async (req: Request, res: Response) => {
    const { targetTransactionId, linkType } = req.body as {
      targetTransactionId: string;
      linkType?: LinkType;
    };
    await transactionService.linkTransactions(
      req.user!.id,
      req.params['id']!,
      targetTransactionId,
      linkType
    );
    res.json({ status: 'success', data: null });
  });

  unlink = asyncHandler(async (req: Request, res: Response) => {
    await transactionService.unlinkTransactions(req.user!.id, req.params['id']!);
    res.json({ status: 'success', data: null });
  });

  listTags = asyncHandler(async (req: Request, res: Response) => {
    const tags = await transactionTagRepository.findAllForUser(req.user!.id);
    res.json({ status: 'success', data: { tags } });
  });

  similar = asyncHandler(async (req: Request, res: Response) => {
    const transactions = await transactionService.getSimilarTransactions(
      req.user!.id,
      req.params['id']!
    );
    res.json({ status: 'success', data: { transactions } });
  });

  bulkCategorize = asyncHandler(async (req: Request, res: Response) => {
    const { transactionIds, categoryId, budgetLineId } = req.body as {
      transactionIds: string[];
      categoryId?: string | null;
      budgetLineId?: string | null;
    };
    const updated = await transactionService.bulkCategorize(
      req.user!.id,
      transactionIds,
      categoryId,
      budgetLineId
    );
    res.json({ status: 'success', data: { updated } });
  });
}

export const transactionController = new TransactionController();
