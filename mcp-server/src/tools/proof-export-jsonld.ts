import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CronozenApiClient } from '../api-client.js';

export function registerProofExportJsonLD(
  server: McpServer,
  apiClient: CronozenApiClient,
) {
  server.tool(
    'proof_export_jsonld',
    'Exports a Decision Proof Unit as a JSON-LD v2.0 proof document conforming to Cronozen Evidence Ontology. Includes compliance status, 6W extraction (Who/What/Where/When/How/Why), hash chain info, and policy snapshot.',
    {
      id: z.string().describe('The DPU ID to export as JSON-LD'),
    },
    async ({ id }) => {
      try {
        const jsonld = await apiClient.exportDPUJsonLD(id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(jsonld, null, 2),
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
