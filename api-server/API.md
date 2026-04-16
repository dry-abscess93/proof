# Cronozen Proof Cloud API Reference

**Base URL:** `https://api.cronozen.com`  
**Version:** 0.1.0  
**Storage:** SQLite (MVP) / PostgreSQL (prod)  
**Hash Chain:** SHA-256 via `@cronozen/dpu-core`

---

## Table of Contents

- [Authentication](#authentication)
- [Quota Headers](#quota-headers)
- [Tier Limits](#tier-limits)
- [Endpoints](#endpoints)
  - [Health & Info (Unauthenticated)](#health--info)
  - [Decision Events](#decision-events)
  - [Evidence](#evidence)
  - [Files](#files)
  - [Integrations (Google Drive)](#integrations-google-drive)
  - [Webhooks (Unauthenticated)](#webhooks)
  - [Public Verification (Unauthenticated)](#public-verification)
- [Event Types](#event-types)
- [Source Types](#source-types)
- [Evidence Levels](#evidence-levels)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All endpoints under `/decision-events`, `/evidence`, `/files`, and `/integrations` (except OAuth callback) require a Bearer token.

```
Authorization: Bearer crz_<your_api_key>
```

The API key is hashed with SHA-256 and matched against the `api_keys` table. Revoked keys are rejected.

**Example:**

```bash
curl https://api.cronozen.com/decision-events \
  -H "Authorization: Bearer crz_abc123def456..."
```

**Error on missing/invalid key:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid Authorization header"
  }
}
```

---

## Quota Headers

POST requests to `/decision-events` and `/files` include quota information in response headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Proof-Tier` | Current pricing tier | `proof_free` |
| `X-Proof-Events-Used` | Events used this month | `42` |
| `X-Proof-Events-Limit` | Monthly event limit | `100` or `unlimited` |
| `X-Proof-Events-Remaining` | Remaining events | `58` or `unlimited` |
| `X-Proof-Warning` | Warning state (if applicable) | `approaching-limit` or `limit-exceeded` |

The warning header appears when usage reaches 80% of the limit (`approaching-limit`) or exceeds it (`limit-exceeded`).

**Important:** Quota enforcement is soft-block. Events are always recorded even when the limit is exceeded. The API never returns 429 for quota overages; it only warns via headers and response body.

---

## Tier Limits

| Tier | Monthly Events | File Retention | Max Versions | Storage |
|------|---------------|----------------|--------------|---------|
| `proof_free` | 100 | 30 days | 3 | 500 MB |
| `proof_pro` | 1,000 | 365 days | 10 | 10 GB |
| `proof_business` | Unlimited | Unlimited | Unlimited | 100 GB |
| `proof_enterprise` | Unlimited | Unlimited | Unlimited | Unlimited |

---

## Endpoints

### Health & Info

#### `GET /`

Returns API metadata and available endpoint paths. No authentication required.

```bash
curl https://api.cronozen.com/
```

**Response `200`:**

```json
{
  "name": "Cronozen Proof API",
  "version": "0.1.0",
  "docs": "https://github.com/cronozen/proof",
  "endpoints": {
    "health": "/health",
    "decisions": "/decision-events",
    "evidence": "/evidence/:id",
    "files": "/files/upload",
    "integrations": "/integrations/google-drive/connect",
    "webhooks": "/webhooks/google-drive",
    "verify": "/verify/:id"
  }
}
```

#### `GET /health`

Health check endpoint. No authentication required.

```bash
curl https://api.cronozen.com/health
```

**Response `200`:**

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-04-07T10:00:00.000Z"
}
```

---

### Decision Events

#### `POST /decision-events`

Record a new decision event. Automatically computes a SHA-256 hash chain entry.

**Auth:** Required  
**Quota:** Checked (soft-block)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | One of the 16 [Event Types](#event-types) |
| `sourceType` | string | No | One of the 4 [Source Types](#source-types). Auto-inferred: `ai` if `aiContext` present, otherwise `manual` |
| `actor` | object | Yes | `{ id: string, type?: string, name?: string, metadata?: object }` |
| `action` | object | Yes | `{ type: string, description?: string, input?: object, output?: object, metadata?: object }` |
| `occurredAt` | string (ISO 8601) | No | Defaults to server time |
| `aiContext` | object | No | `{ model, provider, confidence, promptHash, reasoning, tokens: { input, output }, metadata }` |
| `metadata` | object | No | Arbitrary metadata. `metadata.domain` sets the chain domain (default: `"default"`) |
| `tags` | string[] | No | Searchable tags |
| `idempotencyKey` | string | No | Prevents duplicate events for the same key |

**Example:**

```bash
curl -X POST https://api.cronozen.com/decision-events \
  -H "Authorization: Bearer crz_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ai_recommendation",
    "actor": {
      "id": "user-42",
      "type": "human",
      "name": "Jane Kim"
    },
    "action": {
      "type": "APPROVE_BUDGET",
      "description": "Approved Q2 marketing budget based on AI forecast",
      "input": { "budgetAmount": 50000 },
      "output": { "approved": true }
    },
    "aiContext": {
      "model": "gpt-4o",
      "provider": "openai",
      "confidence": 0.92,
      "reasoning": "Historical spend pattern indicates high ROI",
      "tokens": { "input": 1200, "output": 350 }
    },
    "metadata": { "domain": "finance" },
    "tags": ["budget", "q2-2026"],
    "idempotencyKey": "budget-approve-2026-q2-001"
  }'
```

**Response `201`:**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "type": "ai_recommendation",
    "sourceType": "ai",
    "status": "recorded",
    "actor": {
      "id": "user-42",
      "type": "human",
      "name": "Jane Kim"
    },
    "action": {
      "type": "APPROVE_BUDGET",
      "description": "Approved Q2 marketing budget based on AI forecast",
      "input": { "budgetAmount": 50000 },
      "output": { "approved": true }
    },
    "occurredAt": "2026-04-07T10:00:00.000Z",
    "aiContext": {
      "model": "gpt-4o",
      "provider": "openai",
      "confidence": 0.92,
      "reasoning": "Historical spend pattern indicates high ROI",
      "tokens": { "input": 1200, "output": 350 }
    },
    "metadata": { "domain": "finance" },
    "tags": ["budget", "q2-2026"],
    "evidence": {
      "id": "evi_a1b2c3d4e5f6g7h8",
      "status": "pending",
      "chainHash": "8f14e45fceea167a5a36dedd4bea2543...",
      "chainIndex": 0
    },
    "createdAt": "2026-04-07T10:00:00.000Z",
    "updatedAt": "2026-04-07T10:00:00.000Z"
  },
  "quota": {
    "tier": "proof_free",
    "eventsUsed": 43,
    "eventsLimit": 100,
    "eventsRemaining": 57,
    "warning": false,
    "exceeded": false
  }
}
```

**Idempotency:** If `idempotencyKey` matches an existing event for the same tenant, the existing event is returned (no duplicate created).

---

#### `GET /decision-events`

List decision events for the authenticated tenant.

**Auth:** Required

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 20 | Max 100 |
| `offset` | integer | 0 | Pagination offset |
| `type` | string | - | Filter by event type |
| `source_type` | string | - | Filter by source type |
| `status` | string | - | Filter by status (`recorded`, `sealed`, `rejected`) |
| `tag` | string | - | Filter by tag (partial match) |

**Example:**

```bash
curl "https://api.cronozen.com/decision-events?type=ai_recommendation&limit=10" \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "decisionId": "dec_a1b2c3d4e5f6g7h8",
      "type": "ai_recommendation",
      "sourceType": "ai",
      "status": "recorded",
      "actor": { "id": "user-42", "type": "human", "name": "Jane Kim" },
      "action": { "type": "APPROVE_BUDGET" },
      "occurredAt": "2026-04-07T10:00:00.000Z",
      "tags": ["budget"],
      "evidence": {
        "id": "evi_a1b2c3d4e5f6g7h8",
        "status": "pending",
        "chainHash": "8f14e45f...",
        "chainIndex": 0
      },
      "createdAt": "2026-04-07T10:00:00.000Z",
      "updatedAt": "2026-04-07T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### `GET /decision-events/:id`

Get a single decision event by ID or `decisionId`.

**Auth:** Required

```bash
curl https://api.cronozen.com/decision-events/dec_a1b2c3d4e5f6g7h8 \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "type": "ai_recommendation",
    "sourceType": "ai",
    "status": "recorded",
    "actor": { "id": "user-42", "type": "human", "name": "Jane Kim" },
    "action": {
      "type": "APPROVE_BUDGET",
      "description": "Approved Q2 marketing budget",
      "input": { "budgetAmount": 50000 },
      "output": { "approved": true }
    },
    "occurredAt": "2026-04-07T10:00:00.000Z",
    "aiContext": {
      "model": "gpt-4o",
      "provider": "openai",
      "confidence": 0.92
    },
    "tags": ["budget", "q2-2026"],
    "evidence": {
      "id": "evi_a1b2c3d4e5f6g7h8",
      "status": "pending",
      "chainHash": "8f14e45f...",
      "chainIndex": 0
    },
    "createdAt": "2026-04-07T10:00:00.000Z",
    "updatedAt": "2026-04-07T10:00:00.000Z"
  }
}
```

**Response `404`:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Decision event not found"
  }
}
```

---

#### `POST /decision-events/:id/approvals`

Approve or reject a decision event. Approved events are sealed (evidence level elevated to `AUDIT_READY`, `sealed_at` timestamp set).

**Auth:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `approver` | object | Yes | `{ id: string, type?: string, name?: string }` |
| `result` | string | Yes | `"approved"` or `"rejected"` |
| `reason` | string | No | Approval/rejection reason |
| `approvedAt` | string (ISO 8601) | No | Defaults to server time |

**Example:**

```bash
curl -X POST https://api.cronozen.com/decision-events/dec_a1b2c3d4e5f6g7h8/approvals \
  -H "Authorization: Bearer crz_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "approver": {
      "id": "manager-7",
      "type": "human",
      "name": "Park Seongjin"
    },
    "result": "approved",
    "reason": "Budget within Q2 allocation"
  }'
```

**Response `200` (approved):**

```json
{
  "data": {
    "approvalId": "apr_x9y8z7w6v5u4t3s2",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "approver": {
      "id": "manager-7",
      "type": "human",
      "name": "Park Seongjin"
    },
    "result": "approved",
    "reason": "Budget within Q2 allocation",
    "evidenceLevel": "AUDIT_READY",
    "sealedHash": "8f14e45fceea167a5a36dedd4bea2543...",
    "sealedAt": "2026-04-07T10:05:00.000Z",
    "createdAt": "2026-04-07T10:05:00.000Z"
  }
}
```

**Response `200` (rejected):**

```json
{
  "data": {
    "approvalId": "apr_x9y8z7w6v5u4t3s2",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "approver": { "id": "manager-7", "type": "human" },
    "result": "rejected",
    "reason": "Exceeds quarterly budget cap",
    "evidenceLevel": "DRAFT",
    "createdAt": "2026-04-07T10:05:00.000Z"
  }
}
```

**Response `409` (already sealed):**

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Decision is already sealed"
  }
}
```

---

### Evidence

#### `GET /evidence/:id`

Get sealed evidence details. Accepts `evidence_id`, event `id`, or `decision_id` as the `:id` parameter.

**Auth:** Required

```bash
curl https://api.cronozen.com/evidence/evi_a1b2c3d4e5f6g7h8 \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": {
    "id": "evi_a1b2c3d4e5f6g7h8",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "status": "sealed",
    "evidenceLevel": "AUDIT_READY",
    "event": {
      "type": "ai_recommendation",
      "actor": { "id": "user-42", "type": "human", "name": "Jane Kim" },
      "action": {
        "type": "APPROVE_BUDGET",
        "description": "Approved Q2 marketing budget"
      },
      "occurredAt": "2026-04-07T10:00:00.000Z",
      "aiContext": {
        "model": "gpt-4o",
        "provider": "openai",
        "confidence": 0.92
      }
    },
    "approval": {
      "approver": { "id": "manager-7", "type": "human", "name": "Park Seongjin" },
      "result": "approved",
      "reason": "Budget within Q2 allocation",
      "approvedAt": "2026-04-07T10:05:00.000Z"
    },
    "chain": {
      "hash": "8f14e45fceea167a5a36dedd4bea2543...",
      "index": 0,
      "previousHash": null,
      "domain": "finance"
    },
    "sealedAt": "2026-04-07T10:05:00.000Z",
    "createdAt": "2026-04-07T10:00:00.000Z"
  }
}
```

---

#### `GET /evidence/:id/export`

Export evidence as JSON-LD (Decision Proof Unit v2 format). Suitable for external auditors and compliance systems.

**Auth:** Required

```bash
curl https://api.cronozen.com/evidence/evi_a1b2c3d4e5f6g7h8/export \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "@context": "https://schema.cronozen.com/decision-proof/v2",
  "@type": "DecisionProofUnit",
  "version": "2.0",
  "exportedAt": "2026-04-07T12:00:00.000Z",
  "evidence": {
    "id": "evi_a1b2c3d4e5f6g7h8",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "status": "sealed",
    "evidenceLevel": "AUDIT_READY",
    "event": {
      "type": "ai_recommendation",
      "actor": { "id": "user-42", "type": "human" },
      "action": {
        "type": "APPROVE_BUDGET",
        "description": "Approved Q2 marketing budget"
      },
      "occurredAt": "2026-04-07T10:00:00.000Z"
    },
    "chain": {
      "hash": "8f14e45fceea167a5a36dedd4bea2543...",
      "index": 0,
      "previousHash": null,
      "domain": "finance"
    },
    "sealedAt": "2026-04-07T10:05:00.000Z",
    "createdAt": "2026-04-07T10:00:00.000Z"
  },
  "verification": {
    "hashAlgorithm": "SHA-256",
    "chainDomain": "finance",
    "chainIndex": 0,
    "chainHash": "8f14e45fceea167a5a36dedd4bea2543...",
    "previousHash": null,
    "verifyUrl": "https://api.cronozen.com/verify/evi_a1b2c3d4e5f6g7h8"
  }
}
```

---

### Files

#### `POST /files/upload`

Upload a file and automatically create a `file_change` DPU event. Computes SHA-256 file hash, detects duplicates, tracks versions by filename.

**Auth:** Required  
**Quota:** Checked (soft-block for events, hard-block for storage limit)  
**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The file to upload |
| `domain` | string | No | Chain domain (default: `"default"`) |
| `description` | string | No | Human-readable description for the DPU event |

**Example:**

```bash
curl -X POST https://api.cronozen.com/files/upload \
  -H "Authorization: Bearer crz_abc123..." \
  -F "file=@report-q2.pdf" \
  -F "domain=finance" \
  -F "description=Q2 financial report final version"
```

**Response `201`:**

```json
{
  "data": {
    "file": {
      "id": "f1a2b3c4-...",
      "filename": "report-q2.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 245760,
      "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "version": 1,
      "parentFileId": null,
      "diffSummary": null
    },
    "proof": {
      "decisionId": "dec_x1y2z3w4v5u6t7s8",
      "evidenceId": "evi_x1y2z3w4v5u6t7s8",
      "chainHash": "a1b2c3d4e5f6...",
      "chainIndex": 5,
      "previousHash": "9f8e7d6c5b4a...",
      "domain": "finance",
      "type": "file_change",
      "sourceType": "manual"
    }
  },
  "quota": {
    "tier": "proof_free",
    "eventsUsed": 44,
    "eventsLimit": 100,
    "eventsRemaining": 56,
    "warning": false,
    "exceeded": false
  }
}
```

**Response `200` (duplicate file):**

If a file with the identical SHA-256 hash already exists for the tenant, no new record is created:

```json
{
  "data": {
    "fileId": "f1a2b3c4-...",
    "duplicate": true,
    "message": "Identical file already exists",
    "decisionEventId": "a1b2c3d4-..."
  }
}
```

**Response `413` (storage limit exceeded):**

```json
{
  "error": {
    "code": "STORAGE_LIMIT_EXCEEDED",
    "message": "Storage limit exceeded (498MB / 500MB)"
  },
  "storage": {
    "allowed": false,
    "usedMB": 498,
    "limitMB": 500,
    "remainingMB": 2
  }
}
```

**Version Tracking:** When uploading a file with the same filename, the version number auto-increments and a `diffSummary` is included showing the previous and current file hashes.

---

#### `GET /files`

List uploaded files for the authenticated tenant.

**Auth:** Required

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 20 | Max 100 |
| `offset` | integer | 0 | Pagination offset |
| `filename` | string | - | Filter by exact filename |

**Example:**

```bash
curl "https://api.cronozen.com/files?filename=report-q2.pdf" \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": [
    {
      "id": "f1a2b3c4-...",
      "tenant_id": "tenant-1",
      "decision_event_id": "a1b2c3d4-...",
      "filename": "report-q2.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 245760,
      "file_hash": "e3b0c44298fc1c...",
      "parent_file_id": null,
      "version_number": 1,
      "storage_path": "tenant-1/f1a2b3c4.pdf",
      "storage_type": "local",
      "expires_at": "2026-05-07T10:00:00.000Z",
      "created_at": "2026-04-07T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

#### `GET /files/:id`

Get file metadata and its associated proof (DPU event).

**Auth:** Required

```bash
curl https://api.cronozen.com/files/f1a2b3c4-... \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": {
    "file": {
      "id": "f1a2b3c4-...",
      "tenant_id": "tenant-1",
      "filename": "report-q2.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 245760,
      "file_hash": "e3b0c44298fc1c...",
      "version_number": 1,
      "created_at": "2026-04-07T10:00:00.000Z"
    },
    "proof": {
      "decision_id": "dec_x1y2z3w4v5u6t7s8",
      "chain_hash": "a1b2c3d4e5f6...",
      "chain_index": 5,
      "evidence_level": "DRAFT",
      "status": "recorded"
    }
  }
}
```

---

### Integrations (Google Drive)

#### `GET /integrations/google-drive/connect`

Initiates Google Drive OAuth flow. Redirects the user to Google's consent screen.

**Auth:** Required

```bash
curl -L https://api.cronozen.com/integrations/google-drive/connect \
  -H "Authorization: Bearer crz_abc123..."
```

**Response:** `302` redirect to Google OAuth URL.

---

#### `GET /integrations/google-drive/callback`

OAuth callback endpoint. Google redirects here after user consent. **No authentication required** (Google initiates this redirect).

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `code` | string | OAuth authorization code from Google |
| `state` | string | Tenant ID (passed during connect) |

**Response:** `302` redirect to `{APP_URL}/onboarding/drive-connected?integration={integrationId}`.

**Error `400`:**

```json
{
  "error": {
    "code": "INVALID_CALLBACK",
    "message": "Missing code or state"
  }
}
```

---

#### `GET /integrations/google-drive/folders`

List Google Drive folders for the connected account.

**Auth:** Required

```bash
curl https://api.cronozen.com/integrations/google-drive/folders \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": [
    { "id": "1abc...", "name": "Finance Reports", "mimeType": "application/vnd.google-apps.folder" }
  ]
}
```

**Response `404` (not connected):**

```json
{
  "error": {
    "code": "NOT_CONNECTED",
    "message": "Google Drive not connected. Use /integrations/google-drive/connect first."
  }
}
```

---

#### `POST /integrations/google-drive/watch`

Set a Google Drive folder to watch for file changes. Changes are received via the webhook endpoint and automatically create DPU events.

**Auth:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `folderId` | string | Yes | Google Drive folder ID |
| `domain` | string | No | Chain domain for generated events (default: `"default"`) |

**Example:**

```bash
curl -X POST https://api.cronozen.com/integrations/google-drive/watch \
  -H "Authorization: Bearer crz_abc123..." \
  -H "Content-Type: application/json" \
  -d '{ "folderId": "1abc...", "domain": "contracts" }'
```

**Response `200`:**

```json
{
  "data": {
    "message": "Watching folder for changes",
    "folderId": "1abc...",
    "channelId": "ch_...",
    "domain": "contracts"
  }
}
```

---

#### `POST /integrations/google-drive/disconnect`

Disconnect the Google Drive integration. Sets the integration status to `revoked`.

**Auth:** Required

```bash
curl -X POST https://api.cronozen.com/integrations/google-drive/disconnect \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": {
    "message": "Google Drive disconnected"
  }
}
```

---

#### `GET /integrations/status`

Get all integration statuses for the authenticated tenant.

**Auth:** Required

```bash
curl https://api.cronozen.com/integrations/status \
  -H "Authorization: Bearer crz_abc123..."
```

**Response `200`:**

```json
{
  "data": [
    {
      "id": "int-1",
      "provider": "google_drive",
      "status": "active",
      "watch_folder_id": "1abc...",
      "watch_folder_name": "Finance Reports",
      "watch_expires_at": "2026-04-14T10:00:00.000Z",
      "chain_domain": "finance",
      "created_at": "2026-04-01T10:00:00.000Z"
    }
  ]
}
```

---

### Webhooks

#### `POST /webhooks/google-drive`

Receives Google Drive push notifications. **No authentication required** (called directly by Google).

Google sends a `sync` notification on initial setup (ignored), then `change` notifications when files are modified in watched folders.

**Headers (set by Google):**

| Header | Description |
|--------|-------------|
| `x-goog-channel-id` | Channel ID from the watch setup |
| `x-goog-resource-state` | `sync` (initial) or `change` |

**Response `200`:**

```json
{ "ok": true }
```

Note: This endpoint always returns `200` even on processing errors, because Google retries on non-200 responses.

---

### Public Verification

#### `GET /verify/:id`

Publicly verify an evidence record by `evidence_id` or event `id`. **No authentication required.** This is the URL embedded in exported JSON-LD documents.

```bash
curl https://api.cronozen.com/verify/evi_a1b2c3d4e5f6g7h8
```

**Response `200` (verified/sealed):**

```json
{
  "verified": true,
  "evidence": {
    "id": "evi_a1b2c3d4e5f6g7h8",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "evidenceLevel": "AUDIT_READY",
    "chain": {
      "hash": "8f14e45fceea167a5a36dedd4bea2543...",
      "index": 0,
      "previousHash": null,
      "domain": "finance"
    },
    "sealedAt": "2026-04-07T10:05:00.000Z"
  }
}
```

**Response `200` (not yet sealed):**

```json
{
  "verified": false,
  "evidence": {
    "id": "evi_a1b2c3d4e5f6g7h8",
    "decisionId": "dec_a1b2c3d4e5f6g7h8",
    "evidenceLevel": "DRAFT",
    "chain": {
      "hash": "8f14e45f...",
      "index": 0,
      "previousHash": null,
      "domain": "default"
    },
    "sealedAt": null
  }
}
```

**Response `404`:**

```json
{
  "verified": false,
  "error": "Evidence not found"
}
```

---

## Event Types

All 16 `DecisionEventType` values (use as the `type` field in decision events):

### AI-originated

| Value | Description |
|-------|-------------|
| `agent_execution` | AI agent performed an autonomous action |
| `workflow_step` | Step within an AI/automated workflow |
| `human_approval` | Human approved/rejected an AI recommendation |
| `ai_recommendation` | AI generated a recommendation for human review |
| `automated_action` | System executed an automated rule/trigger |
| `policy_decision` | Decision made based on policy engine evaluation |
| `escalation` | Issue escalated to higher authority |

### Harness-originated

| Value | Description |
|-------|-------------|
| `file_change` | File uploaded, modified, or deleted |
| `approval` | General approval event (non-AI context) |
| `access` | Access granted, revoked, or modified |
| `import` | Data imported from external source |
| `export` | Data exported to external destination |
| `integration` | Third-party integration event |

### Universal

| Value | Description |
|-------|-------------|
| `system` | Internal system event (chain verification, maintenance) |
| `custom` | Custom event type for domain-specific use cases |

---

## Source Types

All 4 `EventSourceType` values (use as the `sourceType` field):

| Value | Description |
|-------|-------------|
| `ai` | AI agent (MCP, SDK auto-invocation). Auto-inferred when `aiContext` is present. |
| `harness` | Customer business system (ERP, CRM, spreadsheet integration) |
| `manual` | User direct input (upload, form submission). Default when no `sourceType` or `aiContext`. |
| `system` | Cronozen internal auto-generation (scheduled jobs, chain verification) |

---

## Evidence Levels

| Level | Description |
|-------|-------------|
| `DRAFT` | Initial recording. Can be modified. |
| `PARTIAL` | Partially documented. Some required fields missing. |
| `AUDIT_READY` | Fully sealed. Chain hash locked. Approved by human. Immutable. |

Evidence progresses from `DRAFT` to `AUDIT_READY` upon approval. Once sealed, the chain hash is locked and any modification would break the hash chain.

---

## Error Codes

All errors follow a consistent envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing, invalid, or revoked API key |
| `VALIDATION_ERROR` | 400 | Required fields missing or invalid request body |
| `NOT_FOUND` | 404 | Decision event, evidence, or file not found |
| `CONFLICT` | 409 | Decision is already sealed (cannot re-approve) |
| `STORAGE_LIMIT_EXCEEDED` | 413 | File upload exceeds tenant storage quota |
| `NOT_CONNECTED` | 404 | Integration not connected (e.g., Google Drive) |
| `INVALID_CALLBACK` | 400 | OAuth callback missing required parameters |
| `OAUTH_FAILED` | 500 | OAuth token exchange failed |
| `DRIVE_ERROR` | 500 | Google Drive API operation failed |
| `WATCH_FAILED` | 500 | Failed to set up Google Drive folder watch |

---

## Rate Limiting

The current MVP does not enforce HTTP-level rate limiting (no `429` responses). Quota enforcement is **soft-block only**:

- Events are always recorded regardless of quota status.
- When monthly event usage reaches 80% of the tier limit, the `X-Proof-Warning: approaching-limit` header is set.
- When usage exceeds the limit, the `X-Proof-Warning: limit-exceeded` header is set.
- Storage limits for file uploads are **hard-block** -- uploads that would exceed the storage quota return `413`.

For production deployments, consider adding a reverse proxy (e.g., Nginx, Cloudflare) with rate limiting rules.
