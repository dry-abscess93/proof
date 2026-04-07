// ─── Enums ───────────────────────────────────────────────────────────────────
// DecisionEventType, EventSourceType SSOT: @cronozen/dp-schema-public
// SDK는 string union으로 재정의하여 dp-schema-public 의존 없이도 사용 가능

export type DecisionEventType =
  // AI-originated
  | 'agent_execution'
  | 'workflow_step'
  | 'human_approval'
  | 'ai_recommendation'
  | 'automated_action'
  | 'policy_decision'
  | 'escalation'
  // Harness-originated
  | 'file_change'
  | 'approval'
  | 'access'
  | 'import'
  | 'export'
  | 'integration'
  // Universal
  | 'system'
  | 'custom';

export type EventSourceType = 'ai' | 'harness' | 'manual' | 'system';

export type DecisionEventStatus =
  | 'recorded'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sealed';

export type EvidenceStatus = 'pending' | 'sealed' | 'verified';

export type ApprovalResult = 'approved' | 'rejected';

export type ActorType = 'human' | 'ai_agent' | 'system' | 'service';

export type ApproverType = 'human' | 'system';

// ─── Core Objects ────────────────────────────────────────────────────────────

export interface DecisionActor {
  id: string;
  type: ActorType;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface DecisionAction {
  type: string;
  description?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AIContext {
  model?: string;
  provider?: string;
  confidence?: number;
  promptHash?: string;
  reasoning?: string;
  tokens?: { input?: number; output?: number };
  metadata?: Record<string, unknown>;
}

export interface ApprovalActor {
  id: string;
  type: ApproverType;
  name?: string;
}

// ─── Request Types ───────────────────────────────────────────────────────────

export interface RecordDecisionRequest {
  type: DecisionEventType;
  sourceType?: EventSourceType;
  actor: DecisionActor;
  action: DecisionAction;
  occurredAt?: string;
  aiContext?: AIContext;
  metadata?: Record<string, unknown>;
  tags?: string[];
  idempotencyKey?: string;
}

export interface ApproveDecisionRequest {
  approver: ApprovalActor;
  result: ApprovalResult;
  reason?: string;
  approvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ListDecisionOptions {
  limit?: number;
  offset?: number;
  type?: DecisionEventType;
  status?: DecisionEventStatus;
  tag?: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface DecisionEventResponse {
  id: string;
  decisionId: string;
  type: DecisionEventType;
  sourceType?: EventSourceType;
  status: DecisionEventStatus;
  actor: DecisionActor;
  action: DecisionAction;
  occurredAt: string;
  aiContext?: AIContext;
  metadata?: Record<string, unknown>;
  tags: string[];
  evidence?: {
    id: string;
    status: EvidenceStatus;
    chainHash?: string;
    chainIndex?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DecisionEventListResponse {
  data: DecisionEventResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApprovalResponse {
  approvalId: string;
  decisionId: string;
  approver: ApprovalActor;
  result: ApprovalResult;
  reason?: string;
  evidenceLevel: string;
  sealedHash?: string;
  sealedAt?: string;
  createdAt: string;
}

export interface EvidenceResponse {
  id: string;
  decisionId: string;
  status: EvidenceStatus;
  evidenceLevel: string;
  event: {
    type: DecisionEventType;
    actor: DecisionActor;
    action: DecisionAction;
    occurredAt: string;
    aiContext?: AIContext;
  };
  approval?: {
    approver: ApprovalActor;
    result: ApprovalResult;
    reason?: string;
    approvedAt: string;
  };
  chain: {
    hash: string;
    index: number;
    previousHash: string | null;
    domain: string;
  };
  sealedAt?: string;
  createdAt: string;
}

export interface EvidenceExportResponse {
  '@context': string;
  '@type': string;
  version: string;
  exportedAt: string;
  evidence: EvidenceResponse;
  verification: {
    hashAlgorithm: string;
    chainDomain: string;
    chainIndex: number;
    chainHash: string;
    previousHash: string | null;
    verifyUrl: string;
  };
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export interface ProofAPIErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Client Config ───────────────────────────────────────────────────────────

export interface CronozenConfig {
  apiKey: string;
  baseUrl: string;
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof globalThis.fetch;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}
