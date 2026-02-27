import type { Request, Response, NextFunction } from 'express';
import { reportController } from '@controllers/reportController';

jest.mock('@services/encryption/encryptionService', () => ({
  encryptionService: { decrypt: jest.fn((v: string) => `dec:${v}`) },
}));
import { encryptionService } from '@services/encryption/encryptionService';
const mockDecrypt = encryptionService.decrypt as jest.MockedFunction<
  typeof encryptionService.decrypt
>;

jest.mock('@config/database');
import { getDatabase } from '@config/database';
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

// Build a Knex-like query chain where each method returns the same chain,
// and .orderBy() returns a Promise resolving to `rows` (the final awaited call).
function buildDbMock(rows: unknown[]): ReturnType<typeof getDatabase> {
  const chain: Record<string, jest.Mock> = {};
  for (const m of ['where', 'select', 'sum', 'groupBy']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain['orderBy'] = jest.fn().mockResolvedValue(rows);

  const mockRaw = jest.fn();
  const mockDb = Object.assign(jest.fn().mockReturnValue(chain), { raw: mockRaw });
  return mockDb as unknown as ReturnType<typeof getDatabase>;
}

// Build a Knex chain where .select() is the terminal promise (for topPayees).
function buildSelectMock(rows: unknown[]): ReturnType<typeof getDatabase> {
  const chain: Record<string, jest.Mock> = {};
  for (const m of ['where', 'whereNotNull', 'whereRaw']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain['select'] = jest.fn().mockResolvedValue(rows);

  const mockRaw = jest.fn();
  const mockDb = Object.assign(jest.fn().mockReturnValue(chain), { raw: mockRaw });
  return mockDb as unknown as ReturnType<typeof getDatabase>;
}

function makeReq(query: Record<string, string> = {}): Request {
  return {
    query,
    user: { id: 'user-123' },
  } as unknown as Request;
}

function makeRes(): { res: Response; json: jest.Mock } {
  const json = jest.fn();
  return { res: { json } as unknown as Response, json };
}

const next = jest.fn() as NextFunction;

describe('reportController.monthlySummary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns monthly summary rows converted to numbers', async () => {
    const dbRows = [
      { month: '2025-09', income: '500.00', expenses: '300.00' },
      { month: '2025-10', income: '600.00', expenses: '400.00' },
    ];
    mockGetDatabase.mockReturnValue(buildDbMock(dbRows));

    const { res, json } = makeRes();
    await reportController.monthlySummary(makeReq(), res, next);

    expect(json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        summary: [
          { month: '2025-09', income: 500, expenses: 300 },
          { month: '2025-10', income: 600, expenses: 400 },
        ],
      },
    });
  });

  it('returns empty summary when no transactions match', async () => {
    mockGetDatabase.mockReturnValue(buildDbMock([]));

    const { res, json } = makeRes();
    await reportController.monthlySummary(makeReq(), res, next);

    expect(json).toHaveBeenCalledWith({ status: 'success', data: { summary: [] } });
  });

  it('defaults months to 6 when query param is absent', async () => {
    const db = buildDbMock([]);
    mockGetDatabase.mockReturnValue(db);

    await reportController.monthlySummary(makeReq(), makeRes().res, next);

    // raw() should have been called with the default 6
    const rawMock = (db as unknown as Record<string, jest.Mock>)['raw'];
    expect(rawMock).toHaveBeenCalledWith('DATE_SUB(CURDATE(), INTERVAL ? MONTH)', [6]);
  });

  it('clamps months above 24 down to 24', async () => {
    const db = buildDbMock([]);
    mockGetDatabase.mockReturnValue(db);

    await reportController.monthlySummary(makeReq({ months: '999' }), makeRes().res, next);

    const rawMock = (db as unknown as Record<string, jest.Mock>)['raw'];
    expect(rawMock).toHaveBeenCalledWith('DATE_SUB(CURDATE(), INTERVAL ? MONTH)', [24]);
  });

  it('treats months=0 as invalid and uses the default 6', async () => {
    const db = buildDbMock([]);
    mockGetDatabase.mockReturnValue(db);

    await reportController.monthlySummary(makeReq({ months: '0' }), makeRes().res, next);

    // 0 is falsy so `parseInt('0') || 6` evaluates to 6
    const rawMock = (db as unknown as Record<string, jest.Mock>)['raw'];
    expect(rawMock).toHaveBeenCalledWith('DATE_SUB(CURDATE(), INTERVAL ? MONTH)', [6]);
  });

  it('converts string income and expenses to numbers', async () => {
    mockGetDatabase.mockReturnValue(
      buildDbMock([{ month: '2026-01', income: '1234.56', expenses: '789.00' }])
    );

    const { res, json } = makeRes();
    await reportController.monthlySummary(makeReq({ months: '3' }), res, next);

    const result = json.mock.calls[0][0] as {
      data: { summary: Array<{ income: unknown; expenses: unknown }> };
    };
    expect(typeof result.data.summary[0]?.income).toBe('number');
    expect(typeof result.data.summary[0]?.expenses).toBe('number');
    expect(result.data.summary[0]?.income).toBe(1234.56);
    expect(result.data.summary[0]?.expenses).toBe(789);
  });
});

describe('reportController.topPayees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: decrypt returns the value prefixed with "dec:"
    mockDecrypt.mockImplementation((v: string) => `dec:${v}`);
  });

  it('aggregates, sorts, and returns top payees with percentages', async () => {
    const dbRows = [
      { payee: 'enc:groceries', amount: '-50.00' },
      { payee: 'enc:groceries', amount: '-30.00' },
      { payee: 'enc:gas', amount: '-40.00' },
    ];
    mockGetDatabase.mockReturnValue(buildSelectMock(dbRows));
    mockDecrypt.mockImplementation((v: string) => v.replace('enc:', ''));

    const { res, json } = makeRes();
    await reportController.topPayees(
      makeReq({ start: '2025-01-01', end: '2025-01-31' }),
      res,
      next
    );

    const result = json.mock.calls[0][0] as {
      status: string;
      data: {
        total: number;
        payees: Array<{ payee: string; totalAmount: number; percentage: number }>;
      };
    };
    expect(result.status).toBe('success');
    expect(result.data.total).toBeCloseTo(120);
    // groceries ($80) should come first
    expect(result.data.payees[0]?.payee).toBe('groceries');
    expect(result.data.payees[0]?.totalAmount).toBeCloseTo(80);
    expect(result.data.payees[0]?.percentage).toBeCloseTo(66.7);
    // gas ($40) second
    expect(result.data.payees[1]?.payee).toBe('gas');
    expect(result.data.payees[1]?.totalAmount).toBeCloseTo(40);
  });

  it('returns empty payees array when no transactions match', async () => {
    mockGetDatabase.mockReturnValue(buildSelectMock([]));

    const { res, json } = makeRes();
    await reportController.topPayees(
      makeReq({ start: '2025-01-01', end: '2025-01-31' }),
      res,
      next
    );

    const result = json.mock.calls[0][0] as { data: { total: number; payees: unknown[] } };
    expect(result.data.total).toBe(0);
    expect(result.data.payees).toHaveLength(0);
  });

  it('throws 400 when start is missing', async () => {
    const { res } = makeRes();
    await reportController.topPayees(makeReq({ end: '2025-01-31' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('throws 400 when end is missing', async () => {
    const { res } = makeRes();
    await reportController.topPayees(makeReq({ start: '2025-01-01' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('throws 400 when type is invalid', async () => {
    const { res } = makeRes();
    await reportController.topPayees(
      makeReq({ start: '2025-01-01', end: '2025-01-31', type: 'invalid' }),
      res,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('respects the limit parameter', async () => {
    // 5 distinct payees, limit=3
    const dbRows = Array.from({ length: 5 }, (_, i) => ({
      payee: `enc:payee${i}`,
      amount: `-${(5 - i) * 10}`,
    }));
    mockGetDatabase.mockReturnValue(buildSelectMock(dbRows));
    mockDecrypt.mockImplementation((v: string) => v.replace('enc:', ''));

    const { res, json } = makeRes();
    await reportController.topPayees(
      makeReq({ start: '2025-01-01', end: '2025-01-31', limit: '3' }),
      res,
      next
    );

    const result = json.mock.calls[0][0] as { data: { payees: unknown[] } };
    expect(result.data.payees).toHaveLength(3);
  });
});
