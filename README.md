# Cronozen Proof

[![Smithery](https://smithery.ai/badge/cronozen/proof)](https://smithery.ai/servers/cronozen/proof)
[![npm](https://img.shields.io/npm/v/@cronozen/dpu-core)](https://www.npmjs.com/package/@cronozen/dpu-core)
[![npm](https://img.shields.io/npm/v/cronozen)](https://www.npmjs.com/package/cronozen)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**Tamper-proof audit trail for AI decisions.**
Record, verify, and export cryptographic proof chains — via MCP, SDK, or REST API.

> Every AI decision is chained via SHA-256, verifiable by anyone, and exportable as JSON-LD for audit compliance.

---

## Why Cronozen Proof?

AI agents are making real decisions in production — approvals, classifications, workflow executions.
But when something goes wrong, can you **prove** what happened?

Cronozen Proof gives you:
- **Immutable hash chain** — SHA-256 linked records that can't be tampered with
- **Public verification** — Anyone can verify a proof without authentication
- **Audit-ready export** — JSON-LD v2.0 evidence documents
- **3 integration paths** — MCP Server, Node SDK, REST API

### Built for compliance

- EU AI Act — Human oversight & auditability requirements
- Korea AI Basic Act (2026) — AI decision documentation mandates
- SOC 2 — Audit trail evidence generation

---

## Quick Start

### Option 1: npm SDK (Recommended)

```bash
npm install cronozen
```

```typescript
import { Cronozen } from 'cronozen';

const client = new Cronozen({ apiKey: 'your-api-key' });

// Record an AI decision
const decision = await client.decisions.record({
  domain: 'loan-approval',
  purpose: 'AI evaluated credit risk for application #1234',
  finalAction: 'Approved with conditions',
  evidenceLevel: 'AUDIT_READY',
});

// Verify integrity
const verification = await client.decisions.verify(decision.id);
console.log(verification.integrity.hash_valid); // true
```

### Option 2: MCP Server (for AI clients)

Connect Claude Desktop, Cursor, or any MCP-compatible client:

```json
{
  "mcpServers": {
    "cronozen-proof": {
      "url": "https://mcp.cronozen.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Or install via Smithery:

```bash
smithery mcp add cronozen/proof
```

**Available MCP Tools:**

| Tool | Description |
|------|-------------|
| `proof_record` | Record an AI decision with SHA-256 hash chain |
| `proof_verify` | Verify a proof record's cryptographic integrity |
| `proof_chain_verify` | Verify an entire domain's hash chain |
| `proof_get` | Retrieve a proof with full details |
| `proof_export_jsonld` | Export as JSON-LD v2.0 evidence document |
| `proof_public_verify` | Public verification (no auth required) |

### Option 3: DPU Core (Self-hosted library)

For maximum control, use the core hash chain library directly:

```bash
npm install @cronozen/dpu-core
```

```typescript
import { computeChainHash, createDPUEnvelope } from '@cronozen/dpu-core';

// Create a hash chain link
const hash = computeChainHash(content, previousHash, timestamp);

// Create a full DPU envelope
const envelope = createDPUEnvelope({ content, previousHash, timestamp });
```

Zero dependencies. Pure cryptographic functions. Run anywhere.

---

## Packages

This monorepo contains the open-source Cronozen Proof ecosystem:

| Package | npm | Description |
|---------|-----|-------------|
| [`@cronozen/dpu-core`](./packages/dpu-core) | [![npm](https://img.shields.io/npm/v/@cronozen/dpu-core)](https://www.npmjs.com/package/@cronozen/dpu-core) | Core hash chain engine — zero dependencies, pure crypto |
| [`@cronozen/dp-schema-public`](./packages/dp-schema-public) | [![npm](https://img.shields.io/npm/v/@cronozen/dp-schema-public)](https://www.npmjs.com/package/@cronozen/dp-schema-public) | Shared types, enums, JSON-LD schema definitions |
| [`cronozen`](./packages/cronozen-sdk) | [![npm](https://img.shields.io/npm/v/cronozen)](https://www.npmjs.com/package/cronozen) | High-level SDK — `decision.record()` / `decision.verify()` |
| [`@cronozen/mcp-server`](./mcp-server) | — | MCP Server for AI client integration |

---

## Architecture

```
Your Application / AI Agent
    │
    ├─── cronozen SDK ──────► Cronozen Cloud API
    │    (npm install cronozen)     │
    │                               ▼
    ├─── MCP Server ────────► Decision Proof Store
    │    (Streamable HTTP)          │
    │                               ▼
    └─── @cronozen/dpu-core ─► SHA-256 Hash Chain
         (self-hosted)         │
                               ▼
                          Tamper-proof Evidence
                          (JSON-LD v2.0 export)
```

**Hash Chain**: Every decision record contains a SHA-256 hash computed from its content + the previous record's hash + timestamp. This creates an append-only chain — tampering with any record breaks the chain for all subsequent records.

---

## Self-Hosted Deployment

### Docker

```bash
cd mcp-server
docker build -t cronozen-mcp .
docker run -p 3100:3100 \
  -e CRONOZEN_API_URL=https://mcp.cronozen.com \
  -e CRONOZEN_API_TOKEN=your-token \
  cronozen-mcp
```

### From Source

```bash
git clone https://github.com/cronozen/proof.git
cd proof/mcp-server
npm install
cp .env.example .env  # Configure your API endpoint
npm run dev
```

---

## Cronozen Cloud

Don't want to self-host? **Cronozen Cloud** handles hosting, security, backups, and updates for you.

| | Self-Hosted | Cloud Pro | Cloud Business | Enterprise |
|---|:---:|:---:|:---:|:---:|
| **Price** | Free | $99/mo | $299/mo | Custom |
| **Events** | Unlimited | 1,000/mo | Unlimited | Unlimited |
| **Source Code** | Full access | — | — | — |
| **Support** | Community | Email | Priority | Dedicated |
| **SSO** | — | — | ✓ | ✓ |
| **SLA** | — | — | 99.9% | Custom |
| **On-premise** | ✓ (DIY) | — | — | ✓ (Managed) |

**[View pricing →](https://cronozen.com/proof#pricing)**

---

## How It Works

1. **Record** — Your app sends a decision event (domain, purpose, action, evidence level)
2. **Chain** — The event is hashed with SHA-256, linked to the previous record
3. **Verify** — Anyone can verify a single record or the entire chain
4. **Export** — Generate JSON-LD v2.0 evidence documents for auditors

```
Genesis ──► Record #1 ──► Record #2 ──► Record #3
  │            │              │              │
  hash₀       hash₁          hash₂          hash₃
               │              │              │
          SHA-256(         SHA-256(      SHA-256(
            content₁,       content₂,     content₃,
            hash₀,          hash₁,        hash₂,
            timestamp₁)     timestamp₂)   timestamp₃)
```

---

## Use Cases

- **AI Agent Audit Trail** — Track every decision an AI agent makes in production
- **Compliance Documentation** — Auto-generate tamper-proof evidence for SOC2, EU AI Act, Korea AI Basic Act
- **Decision Provenance** — Answer "why did the AI do this?" with cryptographic proof
- **Human-in-the-Loop Evidence** — Record human approval/rejection alongside AI decisions
- **Settlement Proof** — Immutable records for financial transactions and approvals

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/cronozen/proof.git
cd mcp-server
npm install
npm run build
```

---

## License

Apache-2.0 — See [LICENSE](LICENSE) for details.

**Cronozen Proof Enterprise** (governance, compliance engine, advanced chain verification) is available under a commercial license. [Contact us →](mailto:proof@cronozen.com)

---

<p align="center">
  <a href="https://cronozen.com/proof">cronozen.com/proof</a> ·
  <a href="https://smithery.ai/servers/cronozen/proof">Smithery</a> ·
  <a href="https://www.npmjs.com/package/cronozen">npm</a>
</p>
