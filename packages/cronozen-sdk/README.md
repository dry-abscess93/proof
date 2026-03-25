# Cronozen

Immutable decision evidence for AI-powered operations.

Record what your AI agents did, get human approval, and produce tamper-proof audit trails — all with a single SDK.

```bash
npm install cronozen
```

## Why Cronozen?

When AI agents make decisions in production, you need to answer:
**"Why did this happen? Who approved it? Can we prove it?"**

Cronozen gives you:
- **Decision recording** — capture what the AI did, with full context
- **Human approval** — attach sign-off before it becomes permanent
- **Immutable evidence** — SHA-256 hash chain, append-only, tamper-evident
- **Audit export** — JSON-LD documents with verification URLs

## Quick Start

```typescript
import { Cronozen } from 'cronozen';

const cz = new Cronozen({
  apiKey: process.env.CRONOZEN_API_KEY!,
  baseUrl: 'https://your-domain.com/api/v1',
});

// 1. Record what the AI did
const event = await cz.decision.record({
  type: 'agent_execution',
  actor: { id: 'support_agent', type: 'ai_agent' },
  action: {
    type: 'refund_approved',
    input: { orderId: 'ORD-1234', amount: 45000 },
  },
  aiContext: { model: 'gpt-4', confidence: 0.87 },
});

// 2. Human approves → sealed with SHA-256 chain hash
const approval = await cz.decision.approve(event.id, {
  approver: { id: 'manager_kim', type: 'human', name: 'Kim' },
  result: 'approved',
  reason: 'Within refund policy limits',
});

console.log(approval.sealedHash);
// → "9943798c6313e9dd2cffa71686176d4125a65777..."

// 3. Retrieve sealed evidence
const evidence = await cz.evidence.get(event.id);

console.log(evidence.chain);
// → { hash: "9943798c...", index: 1, previousHash: null, domain: "proof" }

// 4. Export for audit
const exported = await cz.evidence.export(event.id);
// → JSON-LD document with verification URL
```

## How It Works

```
record()          approve()         evidence.get()
   │                  │                  │
   ▼                  ▼                  ▼
┌─────────┐     ┌──────────┐     ┌──────────────┐
│  DRAFT  │ ──▶ │  SEALED  │ ──▶ │ AUDIT_READY  │
│         │     │ sha256:… │     │ chain: #1    │
└─────────┘     └──────────┘     └──────────────┘
```

Each approval seals the decision with a SHA-256 hash that links to the previous record, forming an append-only chain. Once sealed, the evidence cannot be modified without breaking the chain.

## API Reference

### Constructor

```typescript
const cz = new Cronozen({
  apiKey: string,     // Required. Your API key
  baseUrl: string,    // Required. Proof API base URL
  timeout?: number,   // Request timeout in ms (default: 10000)
  fetch?: typeof fetch // Custom fetch implementation
});
```

### `cz.decision`

#### `record(request): Promise<DecisionEventResponse>`

Record a new decision event. Creates a DRAFT evidence record linked to the hash chain.

```typescript
const event = await cz.decision.record({
  type: 'agent_execution',          // Event type (see below)
  actor: {
    id: 'my_agent',                 // Who/what made the decision
    type: 'ai_agent',               // 'human' | 'ai_agent' | 'system' | 'service'
    name: 'Recommendation Engine',  // Optional display name
  },
  action: {
    type: 'order_classified',       // What happened
    description: 'Classified order as high-priority',
    input: { orderId: 'ORD-5678' }, // Action inputs
    output: { priority: 'high' },   // Action outputs
  },
  aiContext: {                       // Optional AI metadata
    model: 'gpt-4',
    provider: 'openai',
    confidence: 0.92,
    reasoning: 'Based on order value and customer tier',
  },
  tags: ['orders', 'classification'],
  idempotencyKey: 'unique-key-123', // Prevents duplicates
});
```

**Event types:** `agent_execution` | `workflow_step` | `human_approval` | `ai_recommendation` | `automated_action` | `policy_decision` | `escalation` | `custom`

#### `approve(id, request): Promise<ApprovalResponse>`

Approve or reject a decision. If approved, the evidence is sealed with a SHA-256 chain hash.

```typescript
const approval = await cz.decision.approve(event.id, {
  approver: {
    id: 'reviewer_01',
    type: 'human',          // 'human' | 'system'
    name: 'Jane Park',
  },
  result: 'approved',       // 'approved' | 'rejected'
  reason: 'Verified against policy',
});

// approval.sealedHash  → "sha256:..." (only if approved)
// approval.sealedAt    → "2026-03-12T13:09:29.446Z"
// approval.evidenceLevel → "AUDIT_READY"
```

> Calling `approve()` on an already-sealed decision throws `ConflictError`.

#### `get(id): Promise<DecisionEventResponse>`

Retrieve a single decision event by ID.

```typescript
const event = await cz.decision.get('cmmnhiobs0002bfi9mlu8eof4');
```

#### `list(options?): Promise<DecisionEventListResponse>`

List decision events with optional filters.

```typescript
const { data, pagination } = await cz.decision.list({
  type: 'agent_execution',  // Filter by event type
  status: 'sealed',         // Filter by status
  tag: 'settlement',        // Filter by tag
  limit: 50,                // 1-100 (default: 20)
  offset: 0,                // Pagination offset
});
```

### `cz.evidence`

#### `get(id): Promise<EvidenceResponse>`

Get sealed evidence for a decision event. Includes the full hash chain position.

```typescript
const evidence = await cz.evidence.get(event.id);

// evidence.status        → "sealed"
// evidence.evidenceLevel → "AUDIT_READY"
// evidence.chain.hash    → "9943798c..."
// evidence.chain.index   → 1
// evidence.chain.previousHash → null (genesis) or "abc123..."
// evidence.approval.result → "approved"
```

> Throws `NotFoundError` if the decision hasn't been sealed yet.

#### `export(id): Promise<EvidenceExportResponse>`

Export evidence as a verifiable JSON-LD document.

```typescript
const exported = await cz.evidence.export(event.id);

// exported['@context']               → "https://schema.cronozen.com/proof/v1"
// exported.verification.hashAlgorithm → "SHA-256"
// exported.verification.verifyUrl     → "https://proof.cronozen.com/verify/..."
```

## Error Handling

All API errors throw typed exceptions with `code`, `status`, and `details`:

```typescript
import { Cronozen, ConflictError, NotFoundError, CronozenError } from 'cronozen';

try {
  await cz.decision.approve(id, request);
} catch (error) {
  if (error instanceof ConflictError) {
    // 409 — Already sealed. Safe to ignore for idempotent workflows.
    console.log('Already sealed:', error.message);
  } else if (error instanceof NotFoundError) {
    // 404 — Decision event not found
  } else if (error instanceof CronozenError) {
    // Any other API error
    console.error(error.code, error.status, error.details);
  }
}
```

| Class | HTTP | When |
|-------|------|------|
| `AuthenticationError` | 401 | Invalid or expired API key |
| `ForbiddenError` | 403 | API key lacks required scope |
| `ValidationError` | 422 | Invalid request body |
| `NotFoundError` | 404 | Decision or evidence not found |
| `ConflictError` | 409 | Decision already sealed |
| `RateLimitError` | 429 | Rate limit exceeded |
| `BadRequestError` | 400 | Malformed request |
| `TimeoutError` | — | Request exceeded timeout |
| `NetworkError` | — | Connection failed |

## Use Cases

**AI Agent Oversight** — Record every agent execution and require human sign-off before it counts.

**Automated Workflow Audit** — Track automated actions (refunds, approvals, classifications) with immutable evidence.

**Compliance Evidence** — Export sealed decision records as JSON-LD for auditors, regulators, or legal teams.

**AI Liability Shield** — Prove that a human reviewed and approved an AI-driven decision, with cryptographic evidence.

## Requirements

- Node.js 18+
- TypeScript 5.0+ (optional, but recommended)

## License

Apache-2.0
