/**
 * Cronozen Proof SDK — E2E DX Validation
 *
 * Usage:
 *   CRONOZEN_API_KEY=cz_test_xxx CRONOZEN_BASE_URL=http://localhost:3000/api/v1 \
 *     npx tsx examples/e2e-flow.ts
 *
 * This script exercises the full SDK flow:
 *   record → approve → evidence.get → evidence.export
 *
 * It also validates error handling (duplicate approval → 409).
 */

import { Cronozen, ConflictError, NotFoundError } from '../src/index';

const apiKey = process.env.CRONOZEN_API_KEY;
const baseUrl = process.env.CRONOZEN_BASE_URL ?? 'http://localhost:3000/api/v1';

if (!apiKey) {
  console.error('❌ CRONOZEN_API_KEY 환경변수가 필요합니다.');
  console.error('   api_keys 테이블에서 proof:* 스코프의 키를 발급하세요.');
  process.exit(1);
}

const cz = new Cronozen({ apiKey, baseUrl });

async function main() {
  console.log('\n🔷 Cronozen Proof SDK — E2E Flow\n');
  console.log(`  baseUrl: ${baseUrl}`);
  console.log(`  apiKey:  ${apiKey!.slice(0, 10)}...`);

  // ── Step 1: Record ─────────────────────────────────────────────────────
  console.log('\n── Step 1: decision.record()');

  const event = await cz.decision.record({
    type: 'agent_execution',
    actor: {
      id: 'settlement_agent',
      type: 'ai_agent',
      name: 'Settlement Calculator',
    },
    action: {
      type: 'settlement_calculated',
      description: '3월 정산금 자동 계산',
      input: {
        instructorId: 'inst-001',
        periodMonth: '2026-03',
        sessions: 12,
      },
      output: {
        totalAmount: 1_440_000,
        unitPrice: 120_000,
      },
    },
    aiContext: {
      model: 'internal-v1',
      confidence: 0.95,
      reasoning: '완료된 세션 12건 × 단가 120,000원',
    },
    tags: ['settlement', 'test'],
    idempotencyKey: `sdk-e2e-${Date.now()}`,
  });

  console.log(`  ✅ id:         ${event.id}`);
  console.log(`  ✅ decisionId: ${event.decisionId}`);
  console.log(`  ✅ status:     ${event.status}`);
  console.log(`  ✅ type:       ${event.type}`);

  // ── Step 2: Get (before approval) ──────────────────────────────────────
  console.log('\n── Step 2: decision.get() (before approval)');

  const fetched = await cz.decision.get(event.id);
  console.log(`  ✅ status:     ${fetched.status}`);
  console.log(`  ✅ tags:       ${fetched.tags.join(', ')}`);

  // ── Step 3: List ───────────────────────────────────────────────────────
  console.log('\n── Step 3: decision.list()');

  const list = await cz.decision.list({ type: 'agent_execution', limit: 5 });
  console.log(`  ✅ total:      ${list.pagination.total}`);
  console.log(`  ✅ returned:   ${list.data.length}`);
  console.log(`  ✅ hasMore:    ${list.pagination.hasMore}`);

  // ── Step 4: Approve ────────────────────────────────────────────────────
  console.log('\n── Step 4: decision.approve()');

  const approval = await cz.decision.approve(event.id, {
    approver: {
      id: 'director_park',
      type: 'human',
      name: '박원장',
    },
    result: 'approved',
    reason: '세션 수 확인 완료, 정산 승인',
  });

  console.log(`  ✅ approvalId:    ${approval.approvalId}`);
  console.log(`  ✅ evidenceLevel: ${approval.evidenceLevel}`);
  console.log(`  ✅ sealedHash:    ${approval.sealedHash}`);
  console.log(`  ✅ sealedAt:      ${approval.sealedAt}`);

  // ── Step 5: Duplicate approval → 409 ───────────────────────────────────
  console.log('\n── Step 5: duplicate approve → ConflictError');

  try {
    await cz.decision.approve(event.id, {
      approver: { id: 'another_mgr', type: 'human' },
      result: 'approved',
    });
    console.log('  ❌ Should have thrown ConflictError!');
  } catch (error) {
    if (error instanceof ConflictError) {
      console.log(`  ✅ ConflictError caught: "${error.message}"`);
      console.log(`  ✅ error.code:   ${error.code}`);
      console.log(`  ✅ error.status:  ${error.status}`);
    } else {
      throw error;
    }
  }

  // ── Step 6: Evidence ───────────────────────────────────────────────────
  console.log('\n── Step 6: evidence.get()');

  const evidence = await cz.evidence.get(event.id);
  console.log(`  ✅ status:         ${evidence.status}`);
  console.log(`  ✅ evidenceLevel:  ${evidence.evidenceLevel}`);
  console.log(`  ✅ chain.hash:     ${evidence.chain.hash}`);
  console.log(`  ✅ chain.index:    ${evidence.chain.index}`);
  console.log(`  ✅ chain.domain:   ${evidence.chain.domain}`);
  console.log(`  ✅ approval:       ${evidence.approval?.result}`);

  // ── Step 7: Export ─────────────────────────────────────────────────────
  console.log('\n── Step 7: evidence.export()');

  const exported = await cz.evidence.export(event.id);
  console.log(`  ✅ @context:       ${exported['@context']}`);
  console.log(`  ✅ version:        ${exported.version}`);
  console.log(`  ✅ hashAlgorithm:  ${exported.verification.hashAlgorithm}`);
  console.log(`  ✅ verifyUrl:      ${exported.verification.verifyUrl}`);

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅ E2E flow complete!');
  console.log('');
  console.log(`  Decision:  ${event.decisionId}`);
  console.log(`  Sealed:    ${approval.sealedHash}`);
  console.log(`  Chain:     #${evidence.chain.index} → ${evidence.chain.hash}`);
  console.log(`  Export:    ${exported.verification.verifyUrl}`);
  console.log('═'.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('\n❌ E2E failed:', error);
  process.exit(1);
});
