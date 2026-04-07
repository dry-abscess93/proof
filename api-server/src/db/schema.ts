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

  -- Source (4-layer architecture: ai | harness | manual | system)
  source_type TEXT NOT NULL DEFAULT 'manual',

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
CREATE INDEX IF NOT EXISTS idx_decision_events_source ON decision_events(source_type);
CREATE INDEX IF NOT EXISTS idx_decision_events_status ON decision_events(status);
CREATE INDEX IF NOT EXISTS idx_decision_events_chain ON decision_events(chain_domain, chain_index);
CREATE INDEX IF NOT EXISTS idx_decision_events_idempotency ON decision_events(idempotency_key);

-- 파일 증빙 (업로드형 하네스)
CREATE TABLE IF NOT EXISTS proof_files (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  decision_event_id TEXT,

  -- File metadata
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL,
  file_hash TEXT NOT NULL,        -- SHA-256 of file content

  -- Version tracking
  parent_file_id TEXT,            -- 이전 버전의 proof_files.id (null = 최초)
  version_number INTEGER NOT NULL DEFAULT 1,
  diff_summary TEXT,              -- 이전 버전과의 차이 요약 (JSON)

  -- Storage
  storage_path TEXT NOT NULL,     -- 로컬 또는 S3 경로
  storage_type TEXT NOT NULL DEFAULT 'local', -- local | s3

  -- Retention
  expires_at TEXT,                -- 보관 만료일 (null = 무제한)

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proof_files_tenant ON proof_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proof_files_hash ON proof_files(file_hash, tenant_id);
CREATE INDEX IF NOT EXISTS idx_proof_files_parent ON proof_files(parent_file_id);
CREATE INDEX IF NOT EXISTS idx_proof_files_event ON proof_files(decision_event_id);
CREATE INDEX IF NOT EXISTS idx_proof_files_expires ON proof_files(expires_at);

-- 외부 연동 (Google Drive, OneDrive 등)
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,           -- google_drive | onedrive | sharepoint
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | revoked

  -- OAuth tokens (암호화 필요 — MVP에서는 평문)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,

  -- 감시 설정
  watch_folder_id TEXT,             -- Drive 폴더 ID
  watch_folder_name TEXT,           -- 표시용 이름
  watch_channel_id TEXT,            -- Drive push notification channel
  watch_resource_id TEXT,           -- Drive resource ID (webhook 해제용)
  watch_expires_at TEXT,            -- Channel 만료 (최대 24시간, 자동 갱신)
  page_token TEXT,                  -- Drive Changes API start page token

  -- 매핑
  chain_domain TEXT NOT NULL DEFAULT 'default', -- DPU 이벤트를 기록할 도메인

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_channel ON integrations(watch_channel_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(tenant_id, provider, watch_folder_id);

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
