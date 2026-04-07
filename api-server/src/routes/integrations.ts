/**
 * Integration Routes
 *
 * Google Drive 연동 플로우:
 *   1. GET  /integrations/google-drive/connect   → OAuth 인증 URL 리다이렉트
 *   2. GET  /integrations/google-drive/callback   → OAuth callback → tokens 저장
 *   3. GET  /integrations/google-drive/folders     → 폴더 목록 조회
 *   4. POST /integrations/google-drive/watch       → 감시 폴더 설정
 *   5. GET  /integrations/status                   → 현재 연동 상태
 *   6. POST /integrations/google-drive/disconnect  → 연동 해제
 *
 * Webhook (인증 불필요):
 *   POST /webhooks/google-drive  → Google Drive push notification 수신
 */

import { Hono } from 'hono';
import { getDB } from '../db/connection.js';
import type { AuthContext } from '../middleware/auth.js';
import {
  getAuthUrl,
  handleCallback,
  watchFolder,
  processWebhook,
  listFolders,
} from '../services/google-drive.js';

type Env = { Variables: { auth: AuthContext } };

export const integrationsRouter = new Hono<Env>();
export const webhooksRouter = new Hono();

// ============================================================================
// Google Drive OAuth
// ============================================================================

// 1. OAuth 인증 시작
integrationsRouter.get('/google-drive/connect', async (c) => {
  const auth = c.get('auth');
  const url = getAuthUrl(auth.tenantId);
  return c.redirect(url);
});

// 2. OAuth callback (Google → 크로노젠)
// 이 라우트는 인증 불필요 (Google이 리다이렉트)
integrationsRouter.get('/google-drive/callback', async (c) => {
  const code = c.req.query('code');
  const tenantId = c.req.query('state');

  if (!code || !tenantId) {
    return c.json({ error: { code: 'INVALID_CALLBACK', message: 'Missing code or state' } }, 400);
  }

  try {
    const result = await handleCallback(code, tenantId);

    // 성공 후 온보딩 페이지로 리다이렉트
    const baseUrl = process.env.APP_URL || 'https://cronozen.com';
    return c.redirect(`${baseUrl}/onboarding/drive-connected?integration=${result.integrationId}`);
  } catch (err) {
    return c.json({
      error: {
        code: 'OAUTH_FAILED',
        message: err instanceof Error ? err.message : 'OAuth failed',
      },
    }, 500);
  }
});

// 3. 폴더 목록 조회
integrationsRouter.get('/google-drive/folders', async (c) => {
  const auth = c.get('auth');

  const db = getDB();
  const integration = db
    .prepare("SELECT id FROM integrations WHERE tenant_id = ? AND provider = 'google_drive' AND status = 'active'")
    .get(auth.tenantId) as { id: string } | undefined;

  if (!integration) {
    return c.json({ error: { code: 'NOT_CONNECTED', message: 'Google Drive not connected. Use /integrations/google-drive/connect first.' } }, 404);
  }

  try {
    const result = await listFolders(integration.id);
    return c.json({ data: result });
  } catch (err) {
    return c.json({
      error: {
        code: 'DRIVE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to list folders',
      },
    }, 500);
  }
});

// 4. 감시 폴더 설정
integrationsRouter.post('/google-drive/watch', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const { folderId, domain } = body;

  if (!folderId) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'folderId is required' } }, 400);
  }

  const db = getDB();
  const integration = db
    .prepare("SELECT id FROM integrations WHERE tenant_id = ? AND provider = 'google_drive' AND status = 'active'")
    .get(auth.tenantId) as { id: string } | undefined;

  if (!integration) {
    return c.json({ error: { code: 'NOT_CONNECTED', message: 'Google Drive not connected' } }, 404);
  }

  try {
    const result = await watchFolder(integration.id, folderId, domain);
    return c.json({
      data: {
        message: 'Watching folder for changes',
        ...result,
        domain: domain || 'default',
      },
    });
  } catch (err) {
    return c.json({
      error: {
        code: 'WATCH_FAILED',
        message: err instanceof Error ? err.message : 'Failed to set up watch',
      },
    }, 500);
  }
});

// 5. 현재 연동 상태
integrationsRouter.get('/status', async (c) => {
  const auth = c.get('auth');

  const db = getDB();
  const integrations = db
    .prepare('SELECT id, provider, status, watch_folder_id, watch_folder_name, watch_expires_at, chain_domain, created_at FROM integrations WHERE tenant_id = ?')
    .all(auth.tenantId);

  return c.json({ data: integrations });
});

// 6. 연동 해제
integrationsRouter.post('/google-drive/disconnect', async (c) => {
  const auth = c.get('auth');

  const db = getDB();
  db.prepare("UPDATE integrations SET status = 'revoked', updated_at = ? WHERE tenant_id = ? AND provider = 'google_drive'")
    .run(new Date().toISOString(), auth.tenantId);

  return c.json({ data: { message: 'Google Drive disconnected' } });
});

// ============================================================================
// Webhook (인증 불필요 — Google이 직접 호출)
// ============================================================================

webhooksRouter.post('/google-drive', async (c) => {
  // Google Drive push notification 헤더
  const channelId = c.req.header('x-goog-channel-id');
  const resourceState = c.req.header('x-goog-resource-state');

  // sync 메시지는 무시 (초기 설정 확인용)
  if (resourceState === 'sync') {
    return c.json({ ok: true });
  }

  if (!channelId) {
    return c.json({ error: 'Missing channel ID' }, 400);
  }

  try {
    const result = await processWebhook(channelId);
    return c.json({ ok: true, ...result });
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Google은 200이 아니면 재시도하므로 에러여도 200 반환
    return c.json({ ok: false, error: String(err) });
  }
});
