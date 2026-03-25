/**
 * Evidence API
 *
 * GET /evidence/:id        — Get sealed evidence
 * GET /evidence/:id/export — Export as JSON-LD
 */

import { Hono } from 'hono';
import { getDB } from '../db/connection.js';
import type { AuthContext } from '../middleware/auth.js';

type Env = { Variables: { auth: AuthContext } };

export const evidenceRouter = new Hono<Env>();

// ─── GET /evidence/:id ─────────────────────────────────────────────

evidenceRouter.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const db = getDB();
  const row = db
    .prepare('SELECT * FROM decision_events WHERE (evidence_id = ? OR id = ? OR decision_id = ?) AND tenant_id = ?')
    .get(id, id, id, auth.tenantId) as Record<string, unknown> | undefined;

  if (!row) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Evidence not found' } }, 404);
  }

  return c.json({
    data: {
      id: row.evidence_id || row.id,
      decisionId: row.decision_id,
      status: row.sealed_at ? 'sealed' : 'pending',
      evidenceLevel: row.evidence_level,
      event: {
        type: row.type,
        actor: {
          id: row.actor_id,
          type: row.actor_type,
          name: row.actor_name || undefined,
        },
        action: {
          type: row.action_type,
          description: row.action_description || undefined,
        },
        occurredAt: row.occurred_at,
        aiContext: row.ai_model ? {
          model: row.ai_model,
          provider: row.ai_provider || undefined,
          confidence: row.ai_confidence || undefined,
        } : undefined,
      },
      approval: row.approver_id ? {
        approver: {
          id: row.approver_id,
          type: row.approver_type || 'human',
          name: row.approver_name || undefined,
        },
        result: row.approval_result,
        reason: row.approval_reason || undefined,
        approvedAt: row.approved_at,
      } : undefined,
      chain: {
        hash: row.chain_hash,
        index: row.chain_index,
        previousHash: row.previous_hash,
        domain: row.chain_domain || 'default',
      },
      sealedAt: row.sealed_at || undefined,
      createdAt: row.created_at,
    },
  });
});

// ─── GET /evidence/:id/export ──────────────────────────────────────

evidenceRouter.get('/:id/export', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const db = getDB();
  const row = db
    .prepare('SELECT * FROM decision_events WHERE (evidence_id = ? OR id = ? OR decision_id = ?) AND tenant_id = ?')
    .get(id, id, id, auth.tenantId) as Record<string, unknown> | undefined;

  if (!row) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Evidence not found' } }, 404);
  }

  const baseUrl = process.env.PUBLIC_URL || 'https://api.cronozen.com';

  return c.json({
    '@context': 'https://schema.cronozen.com/decision-proof/v2',
    '@type': 'DecisionProofUnit',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    evidence: {
      id: row.evidence_id || row.id,
      decisionId: row.decision_id,
      status: row.sealed_at ? 'sealed' : 'pending',
      evidenceLevel: row.evidence_level,
      event: {
        type: row.type,
        actor: { id: row.actor_id, type: row.actor_type },
        action: { type: row.action_type, description: row.action_description },
        occurredAt: row.occurred_at,
      },
      chain: {
        hash: row.chain_hash,
        index: row.chain_index,
        previousHash: row.previous_hash,
        domain: row.chain_domain,
      },
      sealedAt: row.sealed_at,
      createdAt: row.created_at,
    },
    verification: {
      hashAlgorithm: 'SHA-256',
      chainDomain: row.chain_domain || 'default',
      chainIndex: row.chain_index,
      chainHash: row.chain_hash,
      previousHash: row.previous_hash,
      verifyUrl: `${baseUrl}/verify/${row.evidence_id || row.id}`,
    },
  });
});
