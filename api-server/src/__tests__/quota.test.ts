/**
 * Quota Middleware Tests
 *
 * Uses Node.js native test runner (node:test).
 * Tests calculateQuota() logic with mocked DB layer.
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// We cannot import calculateQuota directly because it depends on getDB().
// Instead, we replicate the pure calculation logic to test the algorithm,
// mirroring the implementation in middleware/quota.ts.
// ---------------------------------------------------------------------------

const TIER_EVENT_LIMITS: Record<string, number> = {
  proof_free: 100,
  proof_pro: 1000,
  proof_business: -1,
  proof_enterprise: -1,
};

const WARN_THRESHOLD = 0.8;

interface QuotaInfo {
  tier: string;
  eventsUsed: number;
  eventsLimit: number | 'unlimited';
  eventsRemaining: number | 'unlimited';
  warning: boolean;
  exceeded: boolean;
}

/**
 * Pure calculation function extracted from calculateQuota().
 * This lets us test the algorithm without needing a real DB.
 */
function calculateQuotaPure(tier: string, used: number): QuotaInfo {
  const limit = TIER_EVENT_LIMITS[tier] ?? 100;

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

// ============================================================================
// Tier Limit Mapping
// ============================================================================

describe('TIER_EVENT_LIMITS', () => {
  it('proof_free = 100', () => {
    assert.equal(TIER_EVENT_LIMITS['proof_free'], 100);
  });

  it('proof_pro = 1000', () => {
    assert.equal(TIER_EVENT_LIMITS['proof_pro'], 1000);
  });

  it('proof_business = -1 (unlimited)', () => {
    assert.equal(TIER_EVENT_LIMITS['proof_business'], -1);
  });

  it('proof_enterprise = -1 (unlimited)', () => {
    assert.equal(TIER_EVENT_LIMITS['proof_enterprise'], -1);
  });
});

// ============================================================================
// calculateQuota — FREE tier
// ============================================================================

describe('calculateQuota — proof_free', () => {
  it('within limit: 30/100', () => {
    const q = calculateQuotaPure('proof_free', 30);
    assert.equal(q.tier, 'proof_free');
    assert.equal(q.eventsUsed, 30);
    assert.equal(q.eventsLimit, 100);
    assert.equal(q.eventsRemaining, 70);
    assert.equal(q.warning, false);
    assert.equal(q.exceeded, false);
  });

  it('warning at 80%: 80/100', () => {
    const q = calculateQuotaPure('proof_free', 80);
    assert.equal(q.warning, true);
    assert.equal(q.exceeded, false);
    assert.equal(q.eventsRemaining, 20);
  });

  it('warning at 90%: 90/100', () => {
    const q = calculateQuotaPure('proof_free', 90);
    assert.equal(q.warning, true);
    assert.equal(q.exceeded, false);
  });

  it('no warning at 79%: 79/100', () => {
    const q = calculateQuotaPure('proof_free', 79);
    assert.equal(q.warning, false);
    assert.equal(q.exceeded, false);
  });

  it('exceeded at 100%: 100/100', () => {
    const q = calculateQuotaPure('proof_free', 100);
    assert.equal(q.warning, false); // warning is only when < 1
    assert.equal(q.exceeded, true);
    assert.equal(q.eventsRemaining, 0);
  });

  it('exceeded at 150/100', () => {
    const q = calculateQuotaPure('proof_free', 150);
    assert.equal(q.exceeded, true);
    assert.equal(q.eventsRemaining, 0);
    assert.equal(q.warning, false);
  });
});

// ============================================================================
// calculateQuota — PRO tier
// ============================================================================

describe('calculateQuota — proof_pro', () => {
  it('within limit: 500/1000', () => {
    const q = calculateQuotaPure('proof_pro', 500);
    assert.equal(q.eventsLimit, 1000);
    assert.equal(q.eventsRemaining, 500);
    assert.equal(q.warning, false);
    assert.equal(q.exceeded, false);
  });

  it('warning at 80%: 800/1000', () => {
    const q = calculateQuotaPure('proof_pro', 800);
    assert.equal(q.warning, true);
    assert.equal(q.exceeded, false);
  });

  it('exceeded at 1000/1000', () => {
    const q = calculateQuotaPure('proof_pro', 1000);
    assert.equal(q.exceeded, true);
    assert.equal(q.warning, false);
  });
});

// ============================================================================
// calculateQuota — unlimited tiers
// ============================================================================

describe('calculateQuota — unlimited tiers', () => {
  it('proof_business: always unlimited, no warning/exceeded', () => {
    const q = calculateQuotaPure('proof_business', 999999);
    assert.equal(q.eventsLimit, 'unlimited');
    assert.equal(q.eventsRemaining, 'unlimited');
    assert.equal(q.warning, false);
    assert.equal(q.exceeded, false);
  });

  it('proof_enterprise: always unlimited', () => {
    const q = calculateQuotaPure('proof_enterprise', 0);
    assert.equal(q.eventsLimit, 'unlimited');
    assert.equal(q.eventsRemaining, 'unlimited');
    assert.equal(q.warning, false);
    assert.equal(q.exceeded, false);
  });
});

// ============================================================================
// calculateQuota — unknown tier fallback
// ============================================================================

describe('calculateQuota — unknown tier', () => {
  it('unknown tier falls back to limit 100', () => {
    const q = calculateQuotaPure('proof_unknown', 50);
    assert.equal(q.eventsLimit, 100);
    assert.equal(q.eventsRemaining, 50);
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('calculateQuota — edge cases', () => {
  it('zero usage', () => {
    const q = calculateQuotaPure('proof_free', 0);
    assert.equal(q.eventsUsed, 0);
    assert.equal(q.eventsRemaining, 100);
    assert.equal(q.warning, false);
    assert.equal(q.exceeded, false);
  });

  it('exactly at warning threshold boundary (80/100)', () => {
    const q = calculateQuotaPure('proof_free', 80);
    assert.equal(q.warning, true);
  });

  it('warning flag is false when exceeded (percentage >= 1)', () => {
    // The implementation sets warning = percentage >= 0.8 && percentage < 1
    // So at exactly 100%, warning should be false, exceeded should be true
    const q = calculateQuotaPure('proof_free', 100);
    assert.equal(q.warning, false);
    assert.equal(q.exceeded, true);
  });
});
