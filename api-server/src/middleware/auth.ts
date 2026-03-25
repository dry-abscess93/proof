/**
 * API Key 인증 미들웨어
 *
 * Bearer token → SHA-256 → api_keys 테이블 조회
 */

import { createMiddleware } from 'hono/factory';
import { createHash } from 'crypto';
import { getDB } from '../db/connection.js';

export interface AuthContext {
  tenantId: string;
  apiKeyId: string;
  permissions: string[];
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export const authMiddleware = createMiddleware<{
  Variables: { auth: AuthContext };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } },
      401,
    );
  }

  const token = authHeader.slice(7);
  const keyHash = hashApiKey(token);

  const db = getDB();
  const apiKey = db
    .prepare('SELECT id, tenant_id, permissions FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL')
    .get(keyHash) as { id: string; tenant_id: string; permissions: string } | undefined;

  if (!apiKey) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
      401,
    );
  }

  c.set('auth', {
    tenantId: apiKey.tenant_id,
    apiKeyId: apiKey.id,
    permissions: JSON.parse(apiKey.permissions),
  });

  await next();
});

/**
 * 초기 API 키 생성 (설정용)
 */
export function createApiKey(tenantId: string, name: string): { key: string; id: string } {
  const id = crypto.randomUUID();
  const key = `crz_${crypto.randomUUID().replace(/-/g, '')}`;
  const keyHash = hashApiKey(key);

  const db = getDB();
  db.prepare(
    'INSERT INTO api_keys (id, key_hash, tenant_id, name) VALUES (?, ?, ?, ?)',
  ).run(id, keyHash, tenantId, name);

  return { key, id };
}
