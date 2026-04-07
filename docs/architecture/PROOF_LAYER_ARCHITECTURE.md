# Cronozen Proof Layer Architecture

## 4-Layer Architecture

```
Layer 1: Harness (Customer Systems)
  +-- Excel / ERP / CRM
  +-- AI Agent (Claude, Cursor, VS Code)
  +-- Custom Applications
        |
        |  MCP / SDK / REST API / Webhook
        v
Layer 2: Event Collection Layer
  +-- MCP Server (mcp.cronozen.com)      <- AI agent path    [source_type: ai]
  +-- REST API (api.cronozen.com)         <- Backend path     [source_type: varies]
  +-- Webhook Receiver                    <- Integration path [source_type: harness]
  +-- Upload API                          <- Manual path      [source_type: manual]
        |
        v
Layer 3: DPU Engine
  +-- Hash Generation (SHA-256)
  +-- Chain Linking (previous_hash -> chain_hash)
  +-- Governance Validation (5-level)
  +-- Evidence Level Promotion (DRAFT -> PARTIAL -> AUDIT_READY)
        |
        v
Layer 4: View / Output
  +-- Calendar View (time-based)
  +-- Table View (operational)
  +-- Reports (PDF / JSON-LD v2)
  +-- Public Verification Page
```

## Event Classification

### Event Types (DecisionEventType)

| Category | Type | Description |
|----------|------|-------------|
| AI | `agent_execution` | AI agent performed an action |
| AI | `workflow_step` | Step within an automated workflow |
| AI | `human_approval` | Human approved an AI decision |
| AI | `ai_recommendation` | AI generated a recommendation |
| AI | `automated_action` | System executed an automated action |
| AI | `policy_decision` | Decision based on policy rules |
| AI | `escalation` | Issue escalated to higher authority |
| Harness | `file_change` | File created, modified, or deleted |
| Harness | `approval` | Approval or sign-off in business system |
| Harness | `access` | Document/data viewed or downloaded |
| Harness | `import` | External data imported |
| Harness | `export` | Report or data exported |
| Harness | `integration` | ERP/CRM/external system event |
| Universal | `system` | Auto-generated system event |
| Universal | `custom` | User-defined event type |

### Source Types (EventSourceType)

| Source | Path | Auto-detection |
|--------|------|----------------|
| `ai` | MCP Server | Always `ai` when called via MCP |
| `harness` | Webhook / Integration API | Set by integration connector |
| `manual` | Upload API / Web form | Default when no AI context |
| `system` | Internal scheduler / chain verify | Set by system processes |

**Auto-detection rule**: If `sourceType` is not explicitly set:
- `aiContext` present -> `ai`
- Otherwise -> `manual`

## SSOT Locations

| Definition | Package | File |
|-----------|---------|------|
| `DecisionEventType` enum | `@cronozen/dp-schema-public` | `src/enums.ts` |
| `EventSourceType` enum | `@cronozen/dp-schema-public` | `src/enums.ts` |
| Event type metadata (labels, colors) | `@cronozen/dp-schema-public` | `src/event-type-metadata.ts` |
| SDK types (API contract) | `cronozen` (npm) | `src/types.ts` |
| ops-side DTO | `thearound-ops` | `src/lib/proof-api/types.ts` |

## File Upload Flow (Harness MVP)

```
Client                         API Server
  |                               |
  |  POST /files/upload           |
  |  (multipart/form-data)        |
  |------------------------------>|
  |                               |-- SHA-256 hash
  |                               |-- Duplicate check (same hash → skip)
  |                               |-- Version linking (same filename → version++)
  |                               |-- Storage limit check (tier-based)
  |                               |-- Save file to disk/S3
  |                               |-- Create file_change DPU event
  |                               |-- Chain hash computation
  |                               |
  |  201 { file, proof, quota }   |
  |<------------------------------|
```

### Storage Policy (per tier)

| Tier | Retention | Max Versions | Storage |
|------|-----------|--------------|---------|
| Free | 30 days | 3 per file | 500 MB |
| Pro | 1 year | 10 per file | 10 GB |
| Business | Unlimited | Unlimited | 100 GB |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Google Drive Integration Flow

```
Customer                  Cronozen                     Google Drive
  |                          |                              |
  |  "Connect Google Drive"  |                              |
  |------------------------->|                              |
  |                          |  OAuth2 redirect             |
  |                          |----------------------------->|
  |                          |                              |
  |                          |  callback (code + tokens)    |
  |                          |<-----------------------------|
  |                          |                              |
  |  "Watch this folder"     |                              |
  |------------------------->|  changes.watch()             |
  |                          |----------------------------->|
  |                          |                              |
  |                          |  (file saved by customer)    |
  |                          |                              |
  |                          |  webhook notification        |
  |                          |<-----------------------------|
  |                          |                              |
  |                          |  changes.list() → download   |
  |                          |----------------------------->|
  |                          |                              |
  |                          |-- SHA-256 hash               |
  |                          |-- duplicate check            |
  |                          |-- version linking            |
  |                          |-- DPU event (source: harness)|
  |                          |-- chain hash                 |
  |                          |                              |
  |  (auto-recorded in       |                              |
  |   calendar/table view)   |                              |
```

### Customer onboarding (3 steps):
1. Connect: OAuth2 → select Google account
2. Select folder: Pick the folder to watch
3. Done: Files auto-recorded as DPU events

### Technical constraints:
- Drive webhook = change notification only (no file content, no diff)
- Cronozen downloads file, computes hash, compares with previous version
- Channel expires every 24 hours → auto-renewed via cron
- Google Docs native formats not supported (export needed) — files only

## Pricing Tier Integration

| Tier | Events/mo | Team | Reports | Chain Verify | Storage |
|------|-----------|------|---------|--------------|---------|
| Free | 100 | 1 | - | Last 10 | 30 days |
| Pro ($99) | 1,000 | 5 | JSON-LD export | Full | 1 year |
| Business ($299) | Unlimited | Unlimited | Custom schema | Full + API | Unlimited |
| Enterprise | Custom | Custom | Custom | Custom | Custom |

## Design Principles

1. **Harness stays**: Customer systems are not replaced, only observed
2. **Zero input**: Users don't create events manually; systems generate them
3. **Source tagging**: Every event knows where it came from (Layer 1 identification)
4. **One-way upgrade**: Evidence levels only go up, never down
5. **Chain integrity**: Hash chain is append-only, sealed records are immutable
