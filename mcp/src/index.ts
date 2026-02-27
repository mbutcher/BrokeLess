import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { toolDefinitions as accountTools, handleTool as handleAccount } from './tools/accounts.js';
import {
  toolDefinitions as transactionTools,
  handleTool as handleTransaction,
} from './tools/transactions.js';
import { toolDefinitions as budgetTools, handleTool as handleBudget } from './tools/budget.js';
import { toolDefinitions as reportTools, handleTool as handleReport } from './tools/reports.js';
import {
  toolDefinitions as integrationTools,
  handleTool as handleIntegration,
} from './tools/integrations.js';

const allTools = [
  ...accountTools,
  ...transactionTools,
  ...budgetTools,
  ...reportTools,
  ...integrationTools,
];

const accountToolNames = new Set(accountTools.map((t) => t.name));
const transactionToolNames = new Set(transactionTools.map((t) => t.name));
const budgetToolNames = new Set(budgetTools.map((t) => t.name));
const reportToolNames = new Set(reportTools.map((t) => t.name));
const integrationToolNames = new Set(integrationTools.map((t) => t.name));

const server = new Server(
  { name: 'budget-app', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const safeArgs = (args ?? {}) as Record<string, unknown>;

  try {
    let text: string;

    if (accountToolNames.has(name)) {
      text = await handleAccount(name);
    } else if (transactionToolNames.has(name)) {
      text = await handleTransaction(name, safeArgs);
    } else if (budgetToolNames.has(name)) {
      text = await handleBudget(name, safeArgs);
    } else if (reportToolNames.has(name)) {
      text = await handleReport(name, safeArgs);
    } else if (integrationToolNames.has(name)) {
      text = await handleIntegration(name);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return { content: [{ type: 'text', text }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('BudgetApp MCP server running\n');
