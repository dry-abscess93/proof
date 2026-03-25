import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CronozenApiClient } from '../api-client.js';

export function registerProofVerify(
  server: McpServer,
  apiClient: CronozenApiClient,
) {
  server.tool(
    'proof_verify',
    'Verifies a specific proof record\'s cryptographic integrity. Checks hash consistency and returns verification status.',
    {
      proofId: z.string().describe('The proof ID to verify'),
      data: z
        .record(z.unknown())
        .optional()
        .describe('Optional original data for re-verification of hash'),
    },
    async ({ proofId, data }) => {
      try {
        const result = await apiClient.verifyProof(proofId, data as Record<string, unknown> | undefined);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  verified: result.verified,
                  proof: result.proof,
                  errors: result.errors,
                },
                null,
                2,
              ),
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
