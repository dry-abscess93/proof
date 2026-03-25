import { describe, it, expect, vi } from 'vitest';
import { Cronozen } from '../index';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  TimeoutError,
  NetworkError,
} from '../errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  }) as unknown as typeof globalThis.fetch;
}

function createClient(fetchFn: typeof globalThis.fetch) {
  return new Cronozen({
    apiKey: 'cz_test_key',
    baseUrl: 'https://api.example.com/api/v1',
    fetch: fetchFn,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Cronozen SDK', () => {
  describe('constructor', () => {
    it('throws if apiKey is missing', () => {
      expect(
        () => new Cronozen({ apiKey: '', baseUrl: 'https://x.com' }),
      ).toThrow('apiKey is required');
    });

    it('throws if baseUrl is missing', () => {
      expect(
        () => new Cronozen({ apiKey: 'key', baseUrl: '' }),
      ).toThrow('baseUrl is required');
    });
  });

  describe('decision.record', () => {
    it('sends POST and returns the event', async () => {
      const event = {
        id: 'dpu-123',
        decisionId: 'evt-001',
        type: 'agent_execution',
        status: 'recorded',
        actor: { id: 'agent-1', type: 'ai_agent' },
        action: { type: 'refund' },
        occurredAt: '2026-03-12T10:00:00Z',
        tags: [],
        createdAt: '2026-03-12T10:00:00Z',
        updatedAt: '2026-03-12T10:00:00Z',
      };
      const fetch = mockFetch(201, { data: event });
      const cz = createClient(fetch);

      const result = await cz.decision.record({
        type: 'agent_execution',
        actor: { id: 'agent-1', type: 'ai_agent' },
        action: { type: 'refund', input: { orderId: 'ORD-1' } },
        aiContext: { model: 'gpt-4', confidence: 0.9 },
      });

      expect(result).toEqual(event);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/decision-events',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer cz_test_key',
          }),
        }),
      );
    });
  });

  describe('decision.approve', () => {
    it('sends POST and returns approval with sealedHash', async () => {
      const approval = {
        approvalId: 'apr-123',
        decisionId: 'evt-001',
        approver: { id: 'mgr-1', type: 'human', name: 'Kim' },
        result: 'approved',
        reason: 'OK',
        evidenceLevel: 'AUDIT_READY',
        sealedHash: 'sha256:abc123',
        sealedAt: '2026-03-12T11:00:00Z',
        createdAt: '2026-03-12T11:00:00Z',
      };
      const fetch = mockFetch(201, { data: approval });
      const cz = createClient(fetch);

      const result = await cz.decision.approve('dpu-123', {
        approver: { id: 'mgr-1', type: 'human', name: 'Kim' },
        result: 'approved',
        reason: 'OK',
      });

      expect(result.sealedHash).toBe('sha256:abc123');
      expect(result.evidenceLevel).toBe('AUDIT_READY');
    });

    it('throws ConflictError on 409', async () => {
      const fetch = mockFetch(409, {
        error: {
          code: 'CONFLICT',
          message: 'Already sealed',
        },
      });
      const cz = createClient(fetch);

      await expect(
        cz.decision.approve('dpu-123', {
          approver: { id: 'mgr-1', type: 'human' },
          result: 'approved',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('decision.get', () => {
    it('returns a single event', async () => {
      const event = {
        id: 'dpu-123',
        decisionId: 'evt-001',
        type: 'agent_execution',
        status: 'sealed',
        actor: { id: 'agent-1', type: 'ai_agent' },
        action: { type: 'refund' },
        occurredAt: '2026-03-12T10:00:00Z',
        tags: ['critical'],
        evidence: {
          id: 'dpu-123',
          status: 'sealed',
          chainHash: 'sha256:abc',
          chainIndex: 5,
        },
        createdAt: '2026-03-12T10:00:00Z',
        updatedAt: '2026-03-12T11:00:00Z',
      };
      const fetch = mockFetch(200, { data: event });
      const cz = createClient(fetch);

      const result = await cz.decision.get('dpu-123');
      expect(result.status).toBe('sealed');
      expect(result.evidence?.chainHash).toBe('sha256:abc');
    });

    it('throws NotFoundError on 404', async () => {
      const fetch = mockFetch(404, {
        error: { code: 'NOT_FOUND', message: 'Not found' },
      });
      const cz = createClient(fetch);

      await expect(cz.decision.get('nope')).rejects.toThrow(NotFoundError);
    });
  });

  describe('decision.list', () => {
    it('returns paginated list', async () => {
      const listResp = {
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      };
      const fetch = mockFetch(200, listResp);
      const cz = createClient(fetch);

      const result = await cz.decision.list({ type: 'agent_execution', limit: 10 });
      expect(result.pagination).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=agent_execution'),
        expect.anything(),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything(),
      );
    });
  });

  describe('evidence.get', () => {
    it('returns sealed evidence', async () => {
      const evidence = {
        id: 'dpu-123',
        decisionId: 'evt-001',
        status: 'sealed',
        evidenceLevel: 'AUDIT_READY',
        event: {
          type: 'agent_execution',
          actor: { id: 'agent-1', type: 'ai_agent' },
          action: { type: 'refund' },
          occurredAt: '2026-03-12T10:00:00Z',
        },
        approval: {
          approver: { id: 'mgr-1', type: 'human' },
          result: 'approved',
          reason: 'OK',
          approvedAt: '2026-03-12T11:00:00Z',
        },
        chain: {
          hash: 'sha256:abc',
          index: 5,
          previousHash: 'sha256:prev',
          domain: 'proof',
        },
        sealedAt: '2026-03-12T11:00:00Z',
        createdAt: '2026-03-12T10:00:00Z',
      };
      const fetch = mockFetch(200, { data: evidence });
      const cz = createClient(fetch);

      const result = await cz.evidence.get('dpu-123');
      expect(result.chain.hash).toBe('sha256:abc');
      expect(result.approval?.result).toBe('approved');
    });
  });

  describe('evidence.export', () => {
    it('returns JSON-LD export', async () => {
      const exportData = {
        '@context': 'https://schema.cronozen.com/proof/v1',
        '@type': 'DecisionEvidence',
        version: '1.0',
        exportedAt: '2026-03-12T12:00:00Z',
        evidence: { id: 'dpu-123' },
        verification: {
          hashAlgorithm: 'SHA-256',
          chainDomain: 'proof',
          chainIndex: 5,
          chainHash: 'sha256:abc',
          previousHash: 'sha256:prev',
          verifyUrl: 'https://proof.cronozen.com/verify/dpu-123',
        },
      };
      const fetch = mockFetch(200, exportData);
      const cz = createClient(fetch);

      const result = await cz.evidence.export('dpu-123');
      expect(result['@context']).toBe('https://schema.cronozen.com/proof/v1');
      expect(result.verification.hashAlgorithm).toBe('SHA-256');
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationError on 401', async () => {
      const fetch = mockFetch(401, {
        error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      });
      const cz = createClient(fetch);

      await expect(cz.decision.list()).rejects.toThrow(AuthenticationError);
    });

    it('throws ValidationError on 422', async () => {
      const fetch = mockFetch(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: { field: 'type' },
        },
      });
      const cz = createClient(fetch);

      await expect(
        cz.decision.record({
          type: 'invalid' as any,
          actor: { id: 'a', type: 'human' },
          action: { type: 'x' },
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws NetworkError on fetch failure', async () => {
      const fetch = vi
        .fn()
        .mockRejectedValue(new Error('DNS resolution failed')) as unknown as typeof globalThis.fetch;
      const cz = createClient(fetch);

      await expect(cz.decision.list()).rejects.toThrow(NetworkError);
    });

    it('preserves error details', async () => {
      const fetch = mockFetch(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bad',
          details: { fields: ['type', 'actor'] },
        },
      });
      const cz = createClient(fetch);

      try {
        await cz.decision.list();
      } catch (e: any) {
        expect(e.details).toEqual({ fields: ['type', 'actor'] });
        expect(e.code).toBe('VALIDATION_ERROR');
        expect(e.status).toBe(422);
      }
    });
  });

  describe('URL construction', () => {
    it('strips trailing slash from baseUrl', async () => {
      const fetch = mockFetch(200, { data: [] , pagination: { total: 0, limit: 20, offset: 0, hasMore: false } });
      const cz = new Cronozen({
        apiKey: 'key',
        baseUrl: 'https://api.example.com/api/v1/',
        fetch,
      });

      await cz.decision.list();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/decision-events'),
        expect.anything(),
      );
    });

    it('encodes special characters in IDs', async () => {
      const fetch = mockFetch(200, { data: { id: 'x' } });
      const cz = createClient(fetch);

      await cz.decision.get('id/with/slash');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('id%2Fwith%2Fslash'),
        expect.anything(),
      );
    });
  });
});
