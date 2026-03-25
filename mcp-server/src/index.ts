import express from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { loadConfig } from './config.js';
import { extractBearerToken } from './auth.js';
import { CronozenApiClient } from './api-client.js';
import { createMCPServer } from './server.js';

const config = loadConfig();
const app = express();

// CORS — allow external AI clients (Claude Desktop, etc.) to connect
const ALLOWED_ORIGINS = [
  'https://cronozen.com',
  'https://stg.cronozen.com',
  'https://mcp.cronozen.com',
  'https://stg-mcp.cronozen.com',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Only parse JSON on non-MCP routes. The MCP transport handles its own body parsing.
app.use((req, res, next) => {
  if (req.path === '/mcp') return next();
  express.json()(req, res, next);
});

// Session storage for stateful connections
const transports = new Map<string, StreamableHTTPServerTransport>();

// MCP endpoint — handles POST (messages), GET (SSE stream), DELETE (session close)
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    // New session: create transport + server with forwarded auth
    const token = extractBearerToken(req) || config.apiToken;
    const apiClient = new CronozenApiClient(config.apiBaseUrl, token);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) transports.delete(sid);
    };

    const server = createMCPServer(apiClient);
    await server.connect(transport);
    await transport.handleRequest(req, res);

    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }
  } catch (error) {
    console.error('[MCP POST] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(400).json({ error: 'Unknown session. Send an initialize request first.' });
    return;
  }
  await transport.handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(400).json({ error: 'Unknown session' });
    return;
  }
  await transport.handleRequest(req, res);
  transports.delete(sessionId);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'cronozen-decision-proof',
    version: '0.1.0',
    tools: 6,
    transport: 'streamable-http',
    activeSessions: transports.size,
  });
});

app.listen(config.port, () => {
  console.log(`\n  Cronozen MCP Server v0.1.0`);
  console.log(`  Transport: Streamable HTTP`);
  console.log(`  Endpoint:  http://localhost:${config.port}/mcp`);
  console.log(`  Health:    http://localhost:${config.port}/health`);
  console.log(`  API:       ${config.apiBaseUrl}`);
  console.log(`  Tools:     6 (proof_record, proof_verify, proof_chain_verify, proof_get, proof_export_jsonld, proof_public_verify)\n`);
});
