/**
 * Proof Quota Middleware
 *
 * POST /decision-events 에서 월별 이벤트 수를 체크.
 * Soft block: 한도 초과 시 경고 헤더 + 응답에 quota 정보 포함.
 * Hard block은 하지 않음 — "기록은 무료" 원칙 유지.
 *
 * 티어 정보는 api_keys 테이블의 metadata에서 가져옴.
 */

import type { Context, Next } from 'hono';
import { getDB } from '../db/connection.js';
import type { AuthContext } from './auth.js';

// Proof 티어별 월 이벤트 한도 (SSOT는 thearound-ops, 여기는 경량 미러)
const TIER_EVENT_LIMITS: Record<string, number> = {
  proof_free: 100,
  proof_pro: 1000,
  proof_business: -1, // unlimited
  proof_enterprise: -1,
};

const WARN_THRESHOLD = 0.8;

export interface QuotaInfo {
  tier: string;
  eventsUsed: number;
  eventsLimit: number | 'unlimited';
  eventsRemaining: number | 'unlimited';
  warning: boolean;
  exceeded: boolean;
}

/**
 * 현재 테넌트의 월별 이벤트 사용량 조회
 */
function getMonthlyEventCount(tenantId: string): number {
  const db = getDB();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const result = db
    .prepare('SELECT COUNT(*) as count FROM decision_events WHERE tenant_id = ? AND created_at >= ?')
    .get(tenantId, monthStart) as { count: number };

  return result.count;
}

/**
 * 테넌트의 Proof 티어 조회
 * api_keys.permissions에서 tier 정보를 가져옴.
 * 없으면 기본 free.
 */
function getTenantTier(tenantId: string): string {
  const db = getDB();

  // api_keys 테이블에서 해당 tenant의 첫 번째 활성 키를 찾아 permissions에서 tier 추출
  const key = db
    .prepare('SELECT permissions FROM api_keys WHERE tenant_id = ? AND revoked_at IS NULL LIMIT 1')
    .get(tenantId) as { permissions: string } | undefined;

  if (!key) return 'proof_free';

  try {
    const permissions = JSON.parse(key.permissions);
    // permissions에 tier가 있으면 사용, 없으면 free
    if (typeof permissions === 'object' && !Array.isArray(permissions) && permissions.tier) {
      return permissions.tier;
    }
    // 기존 배열 형태 permissions는 free로 간주
    return 'proof_free';
  } catch {
    return 'proof_free';
  }
}

/**
 * 쿼타 정보 계산
 */
export function calculateQuota(tenantId: string): QuotaInfo {
  const tier = getTenantTier(tenantId);
  const limit = TIER_EVENT_LIMITS[tier] ?? 100;
  const used = getMonthlyEventCount(tenantId);

  if (limit === -1) {
    return {
      tier,
      eventsUsed: used,
      eventsLimit: 'unlimited',
      eventsRemaining: 'unlimited',
      warning: false,
      exceeded: false,
    };
  }

  const remaining = Math.max(0, limit - used);
  const percentage = used / limit;

  return {
    tier,
    eventsUsed: used,
    eventsLimit: limit,
    eventsRemaining: remaining,
    warning: percentage >= WARN_THRESHOLD && percentage < 1,
    exceeded: used >= limit,
  };
}

/**
 * Quota 미들웨어
 *
 * POST 요청에만 적용.
 * 한도 초과해도 기록은 허용 (soft block).
 * 응답 헤더에 쿼타 정보 포함.
 */
export function quotaMiddleware() {
  return async (c: Context, next: Next) => {
    // GET 요청은 쿼타 체크 안 함
    if (c.req.method !== 'POST') {
      await next();
      return;
    }

    const auth = c.get('auth') as AuthContext | undefined;
    if (!auth) {
      await next();
      return;
    }

    const quota = calculateQuota(auth.tenantId);

    // 헤더에 쿼타 정보 포함
    c.header('X-Proof-Tier', quota.tier);
    c.header('X-Proof-Events-Used', String(quota.eventsUsed));
    c.header('X-Proof-Events-Limit', String(quota.eventsLimit));
    c.header('X-Proof-Events-Remaining', String(quota.eventsRemaining));

    if (quota.warning) {
      c.header('X-Proof-Warning', 'approaching-limit');
    }

    if (quota.exceeded) {
      c.header('X-Proof-Warning', 'limit-exceeded');
      // Soft block: 기록은 허용하되 경고
      // Hard block이 필요하면 여기서 return c.json({...}, 429)
    }

    // 쿼타 정보를 context에 저장 (decisions route에서 응답에 포함)
    c.set('quota', quota);

    await next();
  };
}
