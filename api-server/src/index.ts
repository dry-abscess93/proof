/**
 * Cronozen Proof Cloud API — MVP
 *
 * SDK가 연결하는 최소 API 서버.
 *
 * Endpoints:
 *   POST   /decision-events
 *   GET    /decision-events
 *   GET    /decision-events/:id
 *   POST   /decision-events/:id/approvals
 *   GET    /evidence/:id
 *   GET    /evidence/:id/export
 *
 * Auth: Bearer token (API key)
 * Storage: SQLite (MVP) → PostgreSQL (prod)
 * Hash Chain: @cronozen/dpu-core
 *
 * @version 0.1.0
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { authMiddleware, createApiKey } from './middleware/auth.js';
import { quotaMiddleware } from './middleware/quota.js';
import { decisionsRouter } from './routes/decisions.js';
import { evidenceRouter } from './routes/evidence.js';
import { filesRouter } from './routes/files.js';
import { integrationsRouter, webhooksRouter } from './routes/integrations.js';
import { getDB } from './db/connection.js';

const app = new Hono();

// ─── Global Middleware ─────────────────────────────────────────────

app.use('*', cors());
app.use('*', logger());

// ─── Root + Health Check (unauthenticated) ─────────────────────────

app.get('/', (c) => {
  return c.json({
    name: 'Cronozen Proof API',
    version: '0.1.0',
    docs: 'https://github.com/cronozen/proof',
    endpoints: {
      health: '/health',
      decisions: '/decision-events',
      evidence: '/evidence/:id',
      files: '/files/upload',
      integrations: '/integrations/google-drive/connect',
      webhooks: '/webhooks/google-drive',
      verify: '/verify/:id',
    },
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Webhooks (unauthenticated — external services call directly) ──

app.route('/webhooks', webhooksRouter);

// ─── Public Verification (unauthenticated) ─────────────────────────

app.get('/verify/:id', (c) => {
  const id = c.req.param('id');
  const db = getDB();

  const row = db
    .prepare('SELECT evidence_id, decision_id, chain_hash, chain_index, previous_hash, chain_domain, sealed_at, evidence_level FROM decision_events WHERE evidence_id = ? OR id = ?')
    .get(id, id) as Record<string, unknown> | undefined;

  if (!row) {
    return c.json({ verified: false, error: 'Evidence not found' }, 404);
  }

  return c.json({
    verified: !!row.sealed_at,
    evidence: {
      id: row.evidence_id || id,
      decisionId: row.decision_id,
      evidenceLevel: row.evidence_level,
      chain: {
        hash: row.chain_hash,
        index: row.chain_index,
        previousHash: row.previous_hash,
        domain: row.chain_domain,
      },
      sealedAt: row.sealed_at || null,
    },
  });
});

// ─── Authenticated Routes ──────────────────────────────────────────

app.use('/decision-events/*', authMiddleware);
app.use('/decision-events/*', quotaMiddleware());
app.use('/evidence/*', authMiddleware);
app.use('/files/*', authMiddleware);
app.use('/files/*', quotaMiddleware());
// OAuth callback은 인증 불필요 (Google이 리다이렉트) — 나머지는 인증 필요
app.use('/integrations/google-drive/connect', authMiddleware);
app.use('/integrations/google-drive/folders', authMiddleware);
app.use('/integrations/google-drive/watch', authMiddleware);
app.use('/integrations/google-drive/disconnect', authMiddleware);
app.use('/integrations/status', authMiddleware);

app.route('/decision-events', decisionsRouter);
app.route('/evidence', evidenceRouter);
app.route('/files', filesRouter);
app.route('/integrations', integrationsRouter);

// ─── Bootstrap ─────────────────────────────────────────────────────

const port = parseInt(process.env.PORT || '3200');

// DB 초기화 + 기본 API 키 생성
const db = getDB();
const hasKeys = db.prepare('SELECT COUNT(*) as count FROM api_keys').get() as { count: number };

if (hasKeys.count === 0) {
  const { key } = createApiKey('default', 'Default API Key');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Cronozen Proof API — Initial Setup');
  console.log('═══════════════════════════════════════════');
  console.log(`  API Key: ${key}`);
  console.log('  Save this key — it won\'t be shown again.');
  console.log('═══════════════════════════════════════════');
  console.log('');
}

serve({ fetch: app.fetch, port }, () => {
  console.log(`Cronozen Proof API running on http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/health`);
});

export default app;
