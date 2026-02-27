import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { client } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'get_budget_view',
    description: 'Get the budget view showing budgeted vs actual spending for a date range',
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
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_pay_period',
    description: 'Get the current pay period dates and days remaining',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_upcoming_expenses',
    description: 'Get upcoming scheduled expenses for a date range',
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
      },
      required: ['startDate', 'endDate'],
    },
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  if (name === 'get_budget_view') {
    const data = await client.getBudgetView(
      args['startDate'] as string,
      args['endDate'] as string
    );

    if (!data.lines || data.lines.length === 0) return 'No budget lines found.';

    const lines = data.lines.map((l) => {
      const pct =
        l.budgeted > 0 ? Math.round((l.spent / l.budgeted) * 100) : 0;
      const status = pct >= 100 ? '⚠ OVER' : `${pct}%`;
      return (
        `  ${l.name.padEnd(30)}  ` +
        `Budgeted: ${formatCurrency(l.budgeted)}  ` +
        `Spent: ${formatCurrency(l.spent)}  ` +
        `Remaining: ${formatCurrency(l.remaining)}  [${status}]`
      );
    });

    return (
      `Budget View (${args['startDate']} – ${args['endDate']}):\n${lines.join('\n')}\n\n` +
      `  Total budgeted: ${formatCurrency(data.totalBudgeted)}\n` +
      `  Total spent:    ${formatCurrency(data.totalSpent)}\n` +
      `  Remaining:      ${formatCurrency(data.totalBudgeted - data.totalSpent)}`
    );
  }

  if (name === 'get_pay_period') {
    const data = await client.getPayPeriod();
    return (
      `Current Pay Period:\n` +
      `  Start: ${data.start}\n` +
      `  End:   ${data.end}\n` +
      `  Days remaining: ${data.daysRemaining}`
    );
  }

  if (name === 'get_upcoming_expenses') {
    const { expenses } = await client.getUpcomingExpenses(
      args['startDate'] as string,
      args['endDate'] as string
    );

    if (expenses.length === 0) return 'No upcoming expenses found for the given date range.';

    const lines = expenses.map(
      (e) => `  ${e.dueDate}  ${e.name.padEnd(30)}  ${formatCurrency(e.amount)}`
    );
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return (
      `Upcoming Expenses (${args['startDate']} – ${args['endDate']}):\n${lines.join('\n')}\n\n` +
      `  Total: ${formatCurrency(total)}`
    );
  }

  throw new Error(`Unknown tool: ${name}`);
}
