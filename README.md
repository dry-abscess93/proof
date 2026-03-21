# @cronozen/mcp-server

[![Smithery](https://smithery.ai/badge/cronozen/proof)](https://smithery.ai/servers/cronozen/proof)
[![npm](https://img.shields.io/npm/v/cronozen)](https://www.npmjs.com/package/cronozen)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Tamper-proof audit trail for AI decisions. Record, verify, and export cryptographic proof chains via MCP.

## Overview

This MCP server exposes 6 tools for AI decision provenance — recording decisions, verifying cryptographic integrity, and exporting audit-ready evidence. AI clients such as Claude Desktop connect over **Streamable HTTP** transport and interact with decision proofs through a standard MCP interface.

- **Transport**: Streamable HTTP (not SSE, not stdio)
- **Session model**: Stateful per-session transport with UUID session IDs
- **Auth forwarding**: Per-request Bearer token is forwarded to the underlying API

## Tools

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `proof_record` | Records an AI execution as a DPU. Creates a cryptographically chained proof record with SHA-256 hash chain. | `domain` (string), `purpose` (string), `final_action` (string) | `evidence_level` (DRAFT \| PARTIAL \| AUDIT_READY), `reviewed_by`, `reviewer_role`, `approved` (boolean), `tags` (string[]), `reference_type`, `reference_id` |
| `proof_verify` | Verifies a specific proof record's cryptographic integrity. Checks hash consistency. | `proofId` (string) | `data` (Record\<string, unknown\>) |
| `proof_chain_verify` | Verifies the entire SHA-256 hash chain for a domain. Reports the first broken index if tampering is detected. | `domain` (string) | `fromIndex` (number), `toIndex` (number), `batchSize` (number) |
| `proof_get` | Retrieves a DPU by ID with full details including hash chain position, evidence level, and compliance info. | `id` (string) | -- |
| `proof_export_jsonld` | Exports a DPU as a JSON-LD v2.0 document conforming to Cronozen Evidence Ontology. Includes 6W extraction and policy snapshot. | `id` (string) | -- |
| `proof_public_verify` | Publicly verifies a DPU's cryptographic integrity without authentication. Checks hash validity and chain link integrity. | `id` (string) | -- |

## Quick Start

### Install via Smithery (Recommended)

```bash
smithery mcp add cronozen/proof
```

Or connect directly: `https://proof.cronozen.com`

### Self-hosted

#### Prerequisites

- Node.js 18+
- A running Cronozen API endpoint

#### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env` and set `CRONOZEN_API_TOKEN` to a valid JWT token.

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t cronozen-mcp-server .
docker run -p 3100:3100 \
  -e CRONOZEN_API_URL=https://mcp.cronozen.com \
  -e CRONOZEN_API_TOKEN=your-token \
  cronozen-mcp-server
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CRONOZEN_API_URL` | Base URL of the Cronozen API | `http://localhost:3000` |
| `CRONOZEN_API_TOKEN` | JWT Bearer token for API authentication | (none -- required) |
| `MCP_PORT` | Port the MCP server listens on | `3100` |

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "cronozen-proof": {
      "url": "https://mcp.cronozen.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

## Health Check

```
GET /health
```

```json
{
  "status": "ok",
  "server": "cronozen-decision-proof",
  "version": "0.1.0",
  "tools": 6,
  "transport": "streamable-http",
  "activeSessions": 0
}
```

## Authentication

The server supports two authentication modes:

1. **Per-session Bearer token** — Clients send an `Authorization: Bearer <token>` header on the initial MCP request. The token is forwarded to all subsequent API calls for that session.
2. **Fallback to environment variable** — If no Bearer token is provided in the request, the server uses the `CRONOZEN_API_TOKEN` environment variable.

The `proof_public_verify` tool calls the public verification endpoint which does not require authentication.

## How It Works

```
Claude Desktop / AI Client
    |  HTTPS + Bearer token
    v
Cronozen MCP Server (Streamable HTTP)
    |  HTTP + Bearer forwarding
    v
Cronozen Decision Proof API
    |  SHA-256 hash chain
    v
Tamper-proof Evidence Store
```

Every AI decision is:
1. **Recorded** with structured metadata (domain, purpose, action, evidence level)
2. **Chained** via SHA-256 hash linking to the previous record
3. **Verifiable** — any record or entire chain can be cryptographically verified
4. **Exportable** as JSON-LD v2.0 for audit compliance

## Use Cases

- **AI Agent Audit Trail** — Track every decision an AI agent makes in production
- **Compliance Documentation** — Auto-generate tamper-proof evidence for SOC2, EU AI Act, Korea AI Basic Act
- **Decision Provenance** — Answer "why did the AI do this?" with cryptographic proof
- **Human-in-the-Loop Evidence** — Record human approval/rejection alongside AI decisions

## License

Apache-2.0
