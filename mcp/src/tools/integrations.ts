import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { client } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'trigger_simplefin_sync',
    description:
      'Trigger a manual SimpleFIN sync to import the latest bank transactions. ' +
      'Returns when the sync has been initiated (not necessarily completed).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export async function handleTool(name: string): Promise<string> {
  if (name === 'trigger_simplefin_sync') {
    const result = await client.triggerSimplefinSync();
    return result.message ?? 'SimpleFIN sync triggered successfully.';
  }

  throw new Error(`Unknown tool: ${name}`);
}
