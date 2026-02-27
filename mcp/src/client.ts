/**
 * BudgetAppClient — typed fetch wrapper using X-API-Key authentication.
 * Unwraps the standard { status, data } response envelope.
 */

const BASE_URL = process.env['BUDGET_APP_URL'] ?? 'http://localhost:3001/api/v1';
const API_KEY = process.env['BUDGET_APP_API_KEY'] ?? '';

if (!API_KEY) {
  process.stderr.write('BUDGET_APP_API_KEY environment variable is required\n');
  process.exit(1);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`BudgetApp API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { status: string; data: T };
  return json.data;
}

// ─── Account types ────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  isAsset: boolean;
}

// ─── Transaction types ────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  date: string;
  payee: string | null;
  description: string | null;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  categoryId: string | null;
}

export interface ListTransactionsParams {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionBody {
  date: string;
  payee?: string;
  description?: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  categoryId?: string;
}

// ─── Budget types ─────────────────────────────────────────────────────────────

export interface BudgetViewData {
  lines: Array<{
    id: string;
    name: string;
    budgeted: number;
    spent: number;
    remaining: number;
  }>;
  totalBudgeted: number;
  totalSpent: number;
}

export interface PayPeriodData {
  start: string;
  end: string;
  daysRemaining: number;
}

export interface UpcomingExpense {
  name: string;
  amount: number;
  dueDate: string;
}

// ─── Report types ─────────────────────────────────────────────────────────────

export interface MonthlySummaryItem {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ForecastItem {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedNet: number;
}

export interface SpendingByCategoryItem {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
}

// ─── Client methods ───────────────────────────────────────────────────────────

export const client = {
  listAccounts(): Promise<{ accounts: Account[] }> {
    return request<{ accounts: Account[] }>('GET', '/accounts');
  },

  listTransactions(params: ListTransactionsParams = {}): Promise<{ transactions: Transaction[] }> {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ transactions: Transaction[] }>('GET', `/transactions${qs ? `?${qs}` : ''}`);
  },

  createTransaction(body: CreateTransactionBody): Promise<{ transaction: Transaction }> {
    return request<{ transaction: Transaction }>('POST', '/transactions', body);
  },

  getBudgetView(start: string, end: string): Promise<BudgetViewData> {
    return request<BudgetViewData>('GET', `/budget-view?start=${start}&end=${end}`);
  },

  getPayPeriod(): Promise<PayPeriodData> {
    return request<PayPeriodData>('GET', '/budget-view/pay-period');
  },

  getUpcomingExpenses(start: string, end: string): Promise<{ expenses: UpcomingExpense[] }> {
    return request<{ expenses: UpcomingExpense[] }>(
      'GET',
      `/budget-view/upcoming?start=${start}&end=${end}`
    );
  },

  getMonthlySummary(months = 6): Promise<{ summary: MonthlySummaryItem[] }> {
    return request<{ summary: MonthlySummaryItem[] }>(
      'GET',
      `/reports/monthly-summary?months=${months}`
    );
  },

  getForecast(months = 3): Promise<{ forecast: ForecastItem[] }> {
    return request<{ forecast: ForecastItem[] }>('GET', `/reports/forecast?months=${months}`);
  },

  getSpendingByCategory(
    start: string,
    end: string,
    type?: string
  ): Promise<{ categories: SpendingByCategoryItem[] }> {
    const qs = type
      ? `?start=${start}&end=${end}&type=${type}`
      : `?start=${start}&end=${end}`;
    return request<{ categories: SpendingByCategoryItem[] }>(
      'GET',
      `/reports/spending-by-category${qs}`
    );
  },

  triggerSimplefinSync(): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/simplefin/sync');
  },
};
