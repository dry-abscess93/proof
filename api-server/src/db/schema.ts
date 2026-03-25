/**
 * Cronozen Proof API — SQLite Schema (MVP)
 *
 * 프로덕션에서는 PostgreSQL로 전환.
 * MVP에서는 SQLite로 빠르게 검증.
 */

export const SCHEMA_SQL = `
-- 의사결정 이벤트
CREATE TABLE IF NOT EXISTS decision_events (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded',

  -- Actor
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'human',
  actor_name TEXT,
  actor_metadata TEXT, -- JSON

  -- Action
  action_type TEXT NOT NULL,
  action_description TEXT,
  action_input TEXT, -- JSON
  action_output TEXT, -- JSON
  action_metadata TEXT, -- JSON

  -- AI Context
  ai_model TEXT,
  ai_provider TEXT,
  ai_confidence REAL,
  ai_prompt_hash TEXT,
  ai_reasoning TEXT,
  ai_tokens_input INTEGER,
  ai_tokens_output INTEGER,
  ai_metadata TEXT, -- JSON

  -- Evidence & Chain
  evidence_id TEXT,
  evidence_level TEXT DEFAULT 'DRAFT',
  chain_hash TEXT,
  chain_index INTEGER,
  previous_hash TEXT,
  chain_domain TEXT DEFAULT 'default',

  -- Approval
  approver_id TEXT,
  approver_type TEXT,
  approver_name TEXT,
  approval_result TEXT,
  approval_reason TEXT,
  approved_at TEXT,

  -- Metadata
  occurred_at TEXT NOT NULL,
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON
  idempotency_key TEXT UNIQUE,
  sealed_at TEXT,

  -- Tenant
  tenant_id TEXT NOT NULL DEFAULT 'default',
  api_key_id TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_decision_events_tenant ON decision_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_type ON decision_events(type);
CREATE INDEX IF NOT EXISTS idx_decision_events_status ON decision_events(status);
CREATE INDEX IF NOT EXISTS idx_decision_events_chain ON decision_events(chain_domain, chain_index);
CREATE INDEX IF NOT EXISTS idx_decision_events_idempotency ON decision_events(idempotency_key);

-- API 키
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  name TEXT,
  permissions TEXT NOT NULL DEFAULT '["read","write"]', -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
`;
