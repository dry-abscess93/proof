import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CronozenApiClient } from './api-client.js';
import {
  registerProofRecord,
  registerProofVerify,
  registerProofChainVerify,
  registerProofGet,
  registerProofExportJsonLD,
  registerProofPublicVerify,
} from './tools/index.js';

export function createMCPServer(apiClient: CronozenApiClient): McpServer {
  const server = new McpServer({
    name: 'cronozen-decision-proof',
    version: '0.1.0',
  });

  registerProofRecord(server, apiClient);
  registerProofVerify(server, apiClient);
  registerProofChainVerify(server, apiClient);
  registerProofGet(server, apiClient);
  registerProofExportJsonLD(server, apiClient);
  registerProofPublicVerify(server, apiClient);

  return server;
}
