import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CronozenApiClient } from '../api-client.js';

export function registerProofPublicVerify(
  server: McpServer,
  apiClient: CronozenApiClient,
) {
  server.tool(
    'proof_public_verify',
    'Publicly verifies a DPU\'s cryptographic integrity without authentication. Checks SHA-256 hash validity, previous/next chain link integrity, and returns verification status. Anyone can verify — no credentials required.',
    {
      id: z.string().describe('The DPU ID to publicly verify'),
    },
    async ({ id }) => {
      try {
        const result = await apiClient.publicVerifyDPU(id);
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
