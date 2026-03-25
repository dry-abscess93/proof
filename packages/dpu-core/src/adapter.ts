/**
 * DPU Storage Adapter Interface
 *
 * DB 구현을 추상화하는 Port/Adapter 인터페이스.
 * @cronozen/dpu-connector-prisma 등에서 구현합니다.
 *
 * 이 인터페이스를 구현하면 Prisma, TypeORM, Knex, MongoDB 등
 * 어떤 DB 스택에서도 DPU를 운영할 수 있습니다.
 *
 * @version 1.0
 */

import type {
  EvidenceLevel,
  AuditStatus,
  RiskLevel,
  AIMode,
  DataSensitivityLevel,
} from '@cronozen/dp-schema-public';

// ==================== Record Types ====================

/**
 * DPU 레코드 (DB에서 읽은 상태)
 */
export interface DPURecord {
  id: string;
  decision_id: string;
  domain: string;
  purpose: string;
  policy_ref?: string | null;
  tenant_id?: string | null;

  // AI
  ai_used: boolean;
  ai_mode?: AIMode | null;
  ai_model?: string | null;
  ai_scope?: string | null;
  ai_prompt_hash?: string | null;
  ai_metadata?: Record<string, unknown> | null;
  ai_responsibility?: string | null;

  // Human Control
  reviewed_by?: string | null;
  reviewer_role?: string | null;
  approved: boolean;
  approval_timestamp?: Date | null;
  rejection_reason?: string | null;

  // Dual Approval
  second_reviewer_id?: string | null;
  second_reviewer_role?: string | null;
  second_approved?: boolean | null;
  second_approved_at?: Date | null;
  approver_ids?: string[];

  // Execution
  final_action: string;
  executed_at: Date;
  execution_status: string;
  execution_details?: Record<string, unknown> | null;

  // Responsibility
  final_responsible: string;
  legal_scope?: string | null;

  // Evidence
  evidence_level: EvidenceLevel;
  supporting_evidence?: Record<string, unknown> | null;
  external_evidence?: Array<Record<string, unknown>>;

  // Policy Snapshot
  policy_snapshot?: Record<string, unknown> | null;
  policy_snapshot_hash?: string | null;

  // Hash Chain
  previous_hash?: string | null;
  chain_hash?: string | null;
  chain_index?: number | null;
  chain_domain?: string | null;

  // 6W
  six_w?: Record<string, unknown> | null;
  six_w_source?: string | null;
  six_w_confidence?: number | null;
  six_w_model?: string | null;

  // Voice
  voice_transcript?: string | null;
  voice_confidence?: number | null;
  voice_provider?: string | null;
  voice_audio_hash?: string | null;

  // Audit
  audit_status: AuditStatus;
  risk_level: RiskLevel;
  compliance_checks?: Record<string, unknown> | null;

  // Links
  session_id?: string | null;
  note_ids?: string[];
  evidence_ids?: string[];
  document_id?: string | null;
  case_id?: string | null;

  // Meta
  created_at: Date;
  updated_at?: Date | null;
  created_by?: string | null;
  version: number;
  tags?: string[];
}

/**
 * 정책 레코드
 */
export interface PolicyRecord {
  id: string;
  policy_code: string;
  domain: string;
  version: string;
  version_hash: string;
  policy_config: Record<string, unknown>;
  active: boolean;
  required_review_role?: string | null;
  allowed_approver_roles: string[];
  min_approvers: number;
  data_sensitivity_level: DataSensitivityLevel;
  effective_from: Date;
  effective_until?: Date | null;
}

/**
 * 감사 로그 레코드
 */
export interface AuditLogRecord {
  id: string;
  dpu_id?: string | null;
  audit_type: string;
  result: string;
  denial_reason?: string | null;
  policy_violations?: string[];
  details?: Record<string, unknown> | null;
  audited_at: Date;
}

/**
 * 체인 링크 조회 결과
 */
export interface ChainLinkResult {
  chain_hash: string;
  chain_index: number;
}

// ==================== Adapter Interface ====================

/**
 * DPU Storage Adapter
 *
 * DB 구현을 추상화합니다.
 * @cronozen/dpu-connector-prisma에서 Prisma 구현체를 제공합니다.
 *
 * @example
 * import { PrismaDPUAdapter } from '@cronozen/dpu-connector-prisma';
 * const adapter = new PrismaDPUAdapter(prisma);
 */
export interface DPUStorageAdapter {
  // ==================== DPU CRUD ====================

  /** DPU 생성 */
  createDPU(data: Omit<DPURecord, 'id' | 'created_at' | 'updated_at' | 'version'>): Promise<DPURecord>;

  /** DPU 조회 (ID) */
  findDPUById(id: string): Promise<DPURecord | null>;

  /** DPU 조회 (decision_id) */
  findDPUByDecisionId(decisionId: string): Promise<DPURecord | null>;

  /** DPU 업데이트 */
  updateDPU(id: string, data: Partial<DPURecord>): Promise<DPURecord>;

  // ==================== Chain Operations ====================

  /** 도메인의 최신 체인 링크 조회 */
  findLatestChainLink(domain: string): Promise<ChainLinkResult | null>;

  /**
   * 도메인의 DPU를 chain_index 순으로 배치 조회
   * (체인 검증용)
   */
  findDPUsByChainDomain(
    domain: string,
    options?: {
      fromIndex?: number;
      toIndex?: number;
      batchSize?: number;
      cursor?: string;
    }
  ): Promise<{
    items: DPURecord[];
    hasMore: boolean;
    nextCursor?: string;
  }>;

  /** 도메인의 전체 DPU 수 */
  countDPUsByChainDomain(
    domain: string,
    options?: {
      fromIndex?: number;
      toIndex?: number;
    }
  ): Promise<number>;

  // ==================== Policy Operations ====================

  /** 도메인의 활성 정책 조회 */
  findActivePolicy(domain: string): Promise<PolicyRecord | null>;

  /** 정책 코드로 정책 조회 */
  findPolicyByCode(policyCode: string): Promise<PolicyRecord | null>;

  // ==================== Audit Log ====================

  /** 감사 로그 생성 */
  createAuditLog(data: Omit<AuditLogRecord, 'id'>): Promise<AuditLogRecord>;

  /** DPU의 감사 로그 조회 */
  findAuditLogsByDPUId(dpuId: string): Promise<AuditLogRecord[]>;

  // ==================== Transaction ====================

  /**
   * 트랜잭션 실행
   *
   * 체인 링크 생성 시 Serializable isolation이 필요한 경우
   * 어댑터 구현체에서 처리합니다.
   */
  transaction<T>(fn: (tx: DPUStorageAdapter) => Promise<T>): Promise<T>;
}
