import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CronozenApiClient } from '../api-client.js';

export function registerProofGet(
  server: McpServer,
  apiClient: CronozenApiClient,
) {
  server.tool(
    'proof_get',
    'Retrieves a Decision Proof Unit by ID with full details including hash chain position, AI involvement, human control, evidence level, and compliance information.',
    {
      id: z.string().describe('The DPU ID to retrieve'),
    },
    async ({ id }) => {
      try {
        const result = await apiClient.getDPU(id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
