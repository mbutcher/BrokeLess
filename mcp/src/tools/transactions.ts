import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { client, type CreateTransactionBody } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'list_transactions',
    description: 'List transactions with optional filters by date range, account, or search term',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        accountId: {
          type: 'string',
          description: 'Filter by account ID',
        },
        search: {
          type: 'string',
          description: 'Search payee or description',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'add_transaction',
    description: 'Add a new transaction (income, expense, or transfer)',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Transaction date in YYYY-MM-DD format',
        },
        payee: {
          type: 'string',
          description: 'Payee name',
        },
        description: {
          type: 'string',
          description: 'Transaction description or memo',
        },
        amount: {
          type: 'number',
          description: 'Transaction amount (always positive; type determines direction)',
        },
        currency: {
          type: 'string',
          description: 'Currency code (e.g., USD)',
        },
        type: {
          type: 'string',
          enum: ['income', 'expense', 'transfer'],
          description: 'Transaction type',
        },
        accountId: {
          type: 'string',
          description: 'Account ID to post the transaction to',
        },
        categoryId: {
          type: 'string',
          description: 'Category ID (optional)',
        },
      },
      required: ['date', 'amount', 'currency', 'type', 'accountId'],
    },
  },
  {
    name: 'get_spending_by_category',
    description: 'Get total spending grouped by category for a date range',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        type: {
          type: 'string',
          enum: ['expense', 'income'],
          description: 'Filter by transaction type (default: expense)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
];

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  if (name === 'list_transactions') {
    const { transactions } = await client.listTransactions({
      startDate: args['startDate'] as string | undefined,
      endDate: args['endDate'] as string | undefined,
      accountId: args['accountId'] as string | undefined,
      search: args['search'] as string | undefined,
      limit: args['limit'] as number | undefined,
    });

    if (transactions.length === 0) return 'No transactions found for the given filters.';

    const lines = transactions.map((t) => {
      const sign = t.type === 'expense' ? '-' : '+';
      const payee = t.payee ?? t.description ?? '(no description)';
      return `  ${t.date}  ${payee.padEnd(30)}  ${sign}${formatCurrency(t.amount, t.currency)}`;
    });
    return `Transactions (${transactions.length}):\n${lines.join('\n')}`;
  }

  if (name === 'add_transaction') {
    const body: CreateTransactionBody = {
      date: args['date'] as string,
      payee: args['payee'] as string | undefined,
      description: args['description'] as string | undefined,
      amount: args['amount'] as number,
      currency: args['currency'] as string,
      type: args['type'] as 'income' | 'expense' | 'transfer',
      accountId: args['accountId'] as string,
      categoryId: args['categoryId'] as string | undefined,
    };
    const { transaction } = await client.createTransaction(body);
    const payee = transaction.payee ?? transaction.description ?? '(no description)';
    return `Transaction added: ${payee} — ${formatCurrency(transaction.amount, transaction.currency)} on ${transaction.date}`;
  }

  if (name === 'get_spending_by_category') {
    const { categories } = await client.getSpendingByCategory(
      args['startDate'] as string,
      args['endDate'] as string,
      args['type'] as string | undefined
    );

    if (categories.length === 0) return 'No spending data found for the given date range.';

    const sorted = [...categories].sort((a, b) => b.total - a.total);
    const lines = sorted.map(
      (c) => `  ${c.categoryName.padEnd(30)}  ${formatCurrency(c.total)}  (${c.count} txns)`
    );
    const total = sorted.reduce((s, c) => s + c.total, 0);
    return `Spending by category (${args['startDate']} – ${args['endDate']}):\n${lines.join('\n')}\n\n  Total: ${formatCurrency(total)}`;
  }

  throw new Error(`Unknown tool: ${name}`);
}
