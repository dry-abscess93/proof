/**
 * JSON-LD Schema v2.0 (LOCKED)
 *
 * @locked v2.0
 * @warning 이 스키마는 외부 시스템과의 약속이므로
 * @warning 절대 breaking change 금지
 *
 * 변경 가능:
 * - 필드 추가 (끝에)
 * - 선택 필드의 값 추가
 *
 * 변경 불가:
 * - 기존 필드 이름 변경
 * - 기존 필드 타입 변경
 * - 필수 필드 삭제
 * - Enum 값 변경
 */

/**
 * Evidence Level JSON-LD 구조
 */
export interface EvidenceLevelJSONLD {
  code: 'DRAFT' | 'PARTIAL' | 'AUDIT_READY' | 'FORENSIC';
  label: string;
  label_en: string;
  ordinal: number;
  auditable: boolean;
  legal_weight: 'none' | 'supportive' | 'primary' | 'definitive';
}

/**
 * AI Involvement JSON-LD 구조
 */
export interface AIInvolvementJSONLD {
  used: boolean;
  mode?: 'RECOMMENDATION' | 'DRAFT_GENERATION' | 'ANALYSIS' | 'CLASSIFICATION' | 'PREDICTION' | 'AUTONOMOUS';
  model?: string;
  scope?: string;
  prompt_hash?: string;
  responsibility: 'none' | 'suggestion' | 'draft' | 'analysis';
}

/**
 * Human Control JSON-LD 구조
 */
export interface HumanControlJSONLD {
  reviewed_by?: string;
  approved: boolean;
  approval_timestamp?: string;
  rejection_reason?: string;
  // v2.0 추가: 이중 승인 지원
  second_reviewer?: string;
  second_approved?: boolean;
  second_approved_at?: string;
  all_approvers?: string[];
}

/**
 * Execution JSON-LD 구조
 */
export interface ExecutionJSONLD {
  final_action: string;
  executed_at: string;
  execution_status: string;
}

/**
 * Responsibility JSON-LD 구조
 */
export interface ResponsibilityJSONLD {
  final_responsible: string;
  ai_responsibility: string;
  legal_scope: string;
}

/**
 * Policy JSON-LD 구조 (v2.0)
 */
export interface PolicyJSONLD {
  code: string;
  version: string;
  version_hash: string;
  min_evidence_level: {
    code: string;
    ordinal: number;
  };
  data_sensitivity: 'PUBLIC' | 'INTERNAL' | 'PII' | 'PHI';
  required_review_role?: string;
  min_approvers: number;
  effective_from: string;
  effective_until?: string;
}

/**
 * Compliance Check JSON-LD 구조
 */
export interface ComplianceCheckJSONLD {
  name: string;
  passed: boolean;
  required?: unknown;
  provided?: unknown;
  message?: string;
}

/**
 * Audit Trail Entry JSON-LD 구조
 */
export interface AuditTrailEntryJSONLD {
  result: string;
  result_label?: string;
  denial_reason_code?: string;
  timestamp: string;
}

/**
 * Compliance JSON-LD 구조 (v2.0)
 */
export interface ComplianceJSONLD {
  status: 'PASS' | 'DENY' | 'WARNING' | 'REVIEW_REQUIRED';
  status_label: string;
  reasons: string[];
  checks: ComplianceCheckJSONLD[];
  audit_trail: AuditTrailEntryJSONLD[];
}

/**
 * Audit JSON-LD 구조
 */
export interface AuditJSONLD {
  status: 'PENDING' | 'PASSED' | 'DENIED' | 'FLAGGED';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  compliance_checks?: unknown;
}

/**
 * Metadata JSON-LD 구조
 */
export interface MetadataJSONLD {
  created_at: string;
  created_by?: string;
  version: number;
  tags: string[];
}

/**
 * Signature JSON-LD 구조
 */
export interface SignatureJSONLD {
  algorithm: 'SHA-256' | 'RSA' | 'ED25519';
  policy_hash: string;
  timestamp: string;
  signer: string;
  blockchain_tx?: string;
}

/**
 * 6W JSON-LD 구조 (v2.2)
 */
export interface SixWJSONLD {
  who: { name: string; role?: string };
  what: { action: string; description: string };
  where: { location?: string; context?: string };
  when: { timestamp: string; original_text?: string };
  how: { method: string; ai_involved?: boolean };
  why: { reason: string; policy_ref?: string };
  extraction: {
    source: 'manual' | 'llm_extracted' | 'voice_extracted';
    confidence: number;
    model?: string;
  };
}

/**
 * Chain Info JSON-LD 구조 (v2.2)
 */
export interface ChainInfoJSONLD {
  chain_hash: string;
  previous_hash: string | null;
  chain_index: number;
  chain_domain: string;
}

/**
 * Decision Proof Unit JSON-LD Schema (v2.0)
 */
export interface DecisionProofUnitJSONLD {
  // JSON-LD 표준 필드
  '@context': 'https://schema.cronozen.com/decision-proof/v2';
  '@type': 'DecisionProofUnit';
  '@id': string;

  // 핵심 필드 (v1.0 호환)
  context: {
    domain: string;
    purpose: string;
    tenant_id?: string;
  };

  evidenceLevel: EvidenceLevelJSONLD;
  ai_involvement: AIInvolvementJSONLD;
  human_control: HumanControlJSONLD;
  execution: ExecutionJSONLD;
  responsibility: ResponsibilityJSONLD;

  // v2.0 추가 필드
  policy: PolicyJSONLD | null;
  compliance: ComplianceJSONLD;
  audit: AuditJSONLD;
  metadata: MetadataJSONLD;
  signature: SignatureJSONLD;

  // v2.1 추가 필드
  externalEvidence?: unknown;
  policySnapshot?: unknown;

  // v2.2 추가 필드 (6W + Hash Chain)
  sixW?: SixWJSONLD;
  chain?: ChainInfoJSONLD;

  // extensions (private schema에서만 정의)
  extensions?: {
    cronozen?: Record<string, unknown>;
    vendor?: Record<string, unknown>;
  };
}

/**
 * Collection Summary JSON-LD 구조
 */
export interface CollectionSummaryJSONLD {
  domain: string;
  period: {
    from: string;
    to: string;
  };
  total_count: number;
  compliance_summary: {
    passed: number;
    denied: number;
    warning: number;
    pass_rate: string;
  };
  ai_usage: {
    total: number;
    rate: string;
  };
}

/**
 * Decision Proof Collection JSON-LD Schema
 */
export interface DecisionProofCollectionJSONLD {
  '@context': 'https://schema.cronozen.com/decision-proof/v2';
  '@type': 'DecisionProofCollection';
  '@id': string;

  summary: CollectionSummaryJSONLD;
  items: DecisionProofUnitJSONLD[];
}
