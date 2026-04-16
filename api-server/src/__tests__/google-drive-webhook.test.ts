/**
 * Google Drive Webhook Integration Tests
 *
 * Tests the webhook receiver and integration route auth guards
 * using Hono's built-in app.request() — no HTTP server needed.
 *
 * Run: npx tsx --test src/__tests__/google-drive-webhook.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

// Use a temporary DB so tests don't touch the real database.
// Must be set BEFORE any app modules are dynamically imported,
// because connection.ts reads DB_PATH at module-evaluation time.
const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-test-'));
process.env.DB_PATH = path.join(testDbDir, 'test.db');

// Dynamic imports — evaluated AFTER DB_PATH is set
const { Hono } = await import('hono');
const { webhooksRouter, integrationsRouter } = await import('../routes/integrations.js');
const { authMiddleware } = await import('../middleware/auth.js');

// ---------------------------------------------------------------------------
// Test app — mirrors the real app's mounting in src/index.ts
// ---------------------------------------------------------------------------

function createTestApp() {
  const app = new Hono();

  // Webhooks: no auth (Google calls directly)
  app.route('/webhooks', webhooksRouter);

  // Integration routes that require auth
  app.use('/integrations/google-drive/connect', authMiddleware);
  app.use('/integrations/status', authMiddleware);
  app.route('/integrations', integrationsRouter);

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Google Drive Webhook', () => {
  let app: ReturnType<typeof createTestApp>;

  before(() => {
    app = createTestApp();
  });

  after(() => {
    // Clean up temp DB
    try {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  // 1. Sync message — Google sends this when a watch channel is first created
  it('should return 200 { ok: true } for sync messages', async () => {
    const res = await app.request('/webhooks/google-drive', {
      method: 'POST',
      headers: {
        'x-goog-resource-state': 'sync',
        'Content-Type': 'application/json',
      },
    });

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.ok, true);
  });

  // 2. Missing channel ID — required for non-sync webhook calls
  it('should return 400 when x-goog-channel-id header is missing', async () => {
    const res = await app.request('/webhooks/google-drive', {
      method: 'POST',
      headers: {
        'x-goog-resource-state': 'change',
        'Content-Type': 'application/json',
      },
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.ok(body.error, 'response should contain an error field');
  });

  // 3. Unknown channel ID — processWebhook finds no matching integration, returns filesProcessed: 0
  it('should return 200 with filesProcessed: 0 for unknown channel', async () => {
    const res = await app.request('/webhooks/google-drive', {
      method: 'POST',
      headers: {
        'x-goog-resource-state': 'change',
        'x-goog-channel-id': 'unknown-channel-id',
        'Content-Type': 'application/json',
      },
    });

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.filesProcessed, 0);
  });

  // 4. OAuth connect requires Bearer token
  it('should reject GET /integrations/google-drive/connect without auth', async () => {
    const res = await app.request('/integrations/google-drive/connect', {
      method: 'GET',
    });

    // Auth middleware returns 401 when no Bearer token is provided
    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  // 5. Status endpoint requires auth
  it('should reject GET /integrations/status without auth', async () => {
    const res = await app.request('/integrations/status', {
      method: 'GET',
    });

    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });
});
