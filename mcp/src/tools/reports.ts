import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { client } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'get_monthly_summary',
    description: 'Get monthly income vs expenses summary for the last N months',
    inputSchema: {
      type: 'object',
      properties: {
        months: {
          type: 'number',
          description: 'Number of months to include (default 6)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_forecast',
    description: 'Get projected income and expense forecast for the next N months',
    inputSchema: {
      type: 'object',
      properties: {
        months: {
          type: 'number',
          description: 'Number of months to forecast (default 3)',
        },
      },
      required: [],
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
  if (name === 'get_monthly_summary') {
    const months = (args['months'] as number | undefined) ?? 6;
    const { summary } = await client.getMonthlySummary(months);

    if (summary.length === 0) return 'No monthly summary data available.';

    const lines = summary.map((m) => {
      const net = m.net >= 0 ? `+${formatCurrency(m.net)}` : formatCurrency(m.net);
      return (
        `  ${m.month}  ` +
        `Income: ${formatCurrency(m.income).padStart(12)}  ` +
        `Expenses: ${formatCurrency(m.expenses).padStart(12)}  ` +
        `Net: ${net.padStart(12)}`
      );
    });

    return `Monthly Summary (last ${months} months):\n${lines.join('\n')}`;
  }

  if (name === 'get_forecast') {
    const months = (args['months'] as number | undefined) ?? 3;
    const { forecast } = await client.getForecast(months);

    if (forecast.length === 0) return 'No forecast data available.';

    const lines = forecast.map((m) => {
      const net = m.projectedNet >= 0
        ? `+${formatCurrency(m.projectedNet)}`
        : formatCurrency(m.projectedNet);
      return (
        `  ${m.month}  ` +
        `Income: ${formatCurrency(m.projectedIncome).padStart(12)}  ` +
        `Expenses: ${formatCurrency(m.projectedExpenses).padStart(12)}  ` +
        `Net: ${net.padStart(12)}`
      );
    });

    return `Forecast (next ${months} months):\n${lines.join('\n')}`;
  }

  throw new Error(`Unknown tool: ${name}`);
}
