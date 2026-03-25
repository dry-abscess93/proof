import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CronozenApiClient } from '../api-client.js';

export function registerProofRecord(
  server: McpServer,
  apiClient: CronozenApiClient,
) {
  server.tool(
    'proof_record',
    'Records an AI execution as a Decision Proof Unit (DPU). Creates a cryptographically chained proof record with SHA-256 hash chain. Returns the created DPU with decision_id and chain hash.',
    {
      domain: z.string().describe('Business domain (e.g. rehab_care, market, edu, mentor, welfare)'),
      purpose: z.string().describe('Purpose/reason for the decision'),
      final_action: z.string().describe('The action that was taken (e.g. CREATE, UPDATE, APPROVE)'),
      evidence_level: z
        .enum(['DRAFT', 'PARTIAL', 'AUDIT_READY'])
        .optional()
        .describe('Evidence level. Default: AUDIT_READY'),
      reviewed_by: z.string().optional().describe('Human reviewer identifier'),
      reviewer_role: z.string().optional().describe('Role of the reviewer (e.g. operator, admin)'),
      approved: z.boolean().optional().describe('Whether the decision was approved'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      reference_type: z.string().optional().describe('Type of referenced entity'),
      reference_id: z.string().optional().describe('ID of referenced entity'),
    },
    async (args) => {
      try {
        const result = await apiClient.createDPU(args);
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
