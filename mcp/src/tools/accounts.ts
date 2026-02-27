import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { client } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'list_accounts',
    description: 'List all financial accounts (checking, savings, credit cards, loans, etc.)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_net_worth',
    description: 'Calculate current net worth (total assets minus total liabilities)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export async function handleTool(name: string): Promise<string> {
  const { accounts } = await client.listAccounts();

  if (name === 'list_accounts') {
    if (accounts.length === 0) return 'No accounts found.';
    const lines = accounts.map((a) => {
      const sign = a.isAsset ? '' : '-';
      return `  ${a.name} (${a.type}): ${sign}${formatCurrency(Math.abs(a.balance), a.currency)}`;
    });
    return `Accounts:\n${lines.join('\n')}`;
  }

  if (name === 'get_net_worth') {
    const assets = accounts.filter((a) => a.isAsset);
    const liabilities = accounts.filter((a) => !a.isAsset);
    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const netWorth = totalAssets - totalLiabilities;
    return (
      `Net Worth: ${formatCurrency(netWorth)}\n` +
      `  Total assets:      ${formatCurrency(totalAssets)}\n` +
      `  Total liabilities: ${formatCurrency(totalLiabilities)}`
    );
  }

  throw new Error(`Unknown tool: ${name}`);
}
