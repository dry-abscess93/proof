import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CronozenApiClient } from '../api-client.js';

export function registerProofChainVerify(
  server: McpServer,
  apiClient: CronozenApiClient,
) {
  server.tool(
    'proof_chain_verify',
    'Verifies the entire SHA-256 hash chain integrity for a domain. Performs O(n) sequential verification of all Decision Proof Units and reports the first broken index if tampering is detected.',
    {
      domain: z.string().describe('The domain to verify (e.g. rehab_care, market, edu)'),
      fromIndex: z.number().optional().describe('Start verification from this chain index'),
      toIndex: z.number().optional().describe('End verification at this chain index'),
      batchSize: z.number().optional().describe('Number of DPUs to process per batch'),
    },
    async ({ domain, fromIndex, toIndex, batchSize }) => {
      try {
        const result = await apiClient.verifyChain(domain, {
          fromIndex,
          toIndex,
          batchSize,
        });
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
