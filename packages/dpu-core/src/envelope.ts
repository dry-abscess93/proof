/**
 * DPU Envelope Builder
 *
 * DPU 레코드의 "포맷"만 생성합니다 (저장 없음).
 * 해시 체인 필드를 계산하고, 저장 어댑터에 전달할 데이터를 구성합니다.
 *
 * 사용 흐름:
 * 1. createDPUEnvelope()로 데이터 구조 생성
 * 2. adapter.createDPU(envelope)로 저장
 *
 * @version 1.0
 */

import type {
  EvidenceLevel,
  RiskLevel,
  AuditStatus,
  AIMode,
  SixWFields,
} from '@cronozen/dp-schema-public';
import { computeChainHash, computeContentHash } from './hash';
import type { DPURecord, ChainLinkResult } from './adapter';

// ==================== Input Types ====================

/**
 * DPU Envelope 생성 입력
 */
export interface CreateEnvelopeInput {
  // Required
  domain: string;
  purpose: string;
  final_action: string;
  final_responsible: string;
  evidence_level: EvidenceLevel;

  // Policy
  policy_ref?: string;
  policy_snapshot?: Record<string, unknown>;

  // AI
  ai_used?: boolean;
  ai_mode?: AIMode;
  ai_model?: string;
  ai_scope?: string;
  ai_prompt?: string;

  // Approval
  reviewed_by?: string;
  reviewer_role?: string;
  approved?: boolean;
  approval_timestamp?: Date;

  // Dual approval
  second_reviewer_id?: string;
  second_reviewer_role?: string;
  second_approved?: boolean;
  second_approved_at?: Date;
  approver_ids?: string[];

  // Evidence links
  session_id?: string;
  note_ids?: string[];
  evidence_ids?: string[];
  document_id?: string;
  case_id?: string;
  external_evidence?: Array<Record<string, unknown>>;

  // 6W
  six_w?: SixWFields;
  six_w_source?: 'manual' | 'llm_extracted' | 'voice_extracted';
  six_w_confidence?: number;
  six_w_model?: string;

  // Voice
  voice_transcript?: string;
  voice_confidence?: number;
  voice_provider?: string;
  voice_audio_hash?: string;

  // Meta
  tenant_id?: string;
  risk_level?: RiskLevel;
  tags?: string[];
}

/**
 * 체인 컨텍스트 (이전 체인 링크 정보)
 *
 * 저장 어댑터를 통해 조회한 최신 체인 링크를 전달합니다.
 * null이면 Genesis DPU로 처리됩니다.
 */
export interface ChainContext {
  latestLink: ChainLinkResult | null;
}

/**
 * DPU Envelope (저장 준비 완료 데이터)
 */
export type DPUEnvelope = Omit<DPURecord, 'id' | 'created_at' | 'updated_at' | 'version'>;

// ==================== Builder ====================

/**
 * DPU Envelope 생성
 *
 * 해시 체인 필드를 계산하고, 저장 어댑터에 전달할 완전한 DPU 데이터를 반환합니다.
 * DB 접근 없이 순수하게 데이터 구조만 생성합니다.
 *
 * @param input - DPU 생성 입력 데이터
 * @param chain - 체인 컨텍스트 (adapter.findLatestChainLink()로 조회)
 * @returns 저장 준비 완료된 DPU 데이터
 *
 * @example
 * const latestLink = await adapter.findLatestChainLink('pharmacy');
 * const envelope = createDPUEnvelope(input, { latestLink });
 * const dpu = await adapter.createDPU(envelope);
 */
export function createDPUEnvelope(
  input: CreateEnvelopeInput,
  chain: ChainContext
): DPUEnvelope {
  const executedAt = new Date();
  const timestamp = executedAt.toISOString();

  // Chain fields
  const previousHash = chain.latestLink?.chain_hash ?? null;
  const chainIndex = (chain.latestLink?.chain_index ?? -1) + 1;

  const chainContent = {
    domain: input.domain,
    purpose: input.purpose,
    final_action: input.final_action,
    final_responsible: input.final_responsible,
  };
  const chainHash = computeChainHash(chainContent, previousHash, timestamp);

  // Policy snapshot hash
  const policySnapshotHash = input.policy_snapshot
    ? computeContentHash(JSON.stringify(input.policy_snapshot))
    : null;

  // AI prompt hash
  const aiPromptHash = input.ai_prompt
    ? computeContentHash(input.ai_prompt)
    : null;

  const decisionId = `dpu-${Date.now()}-${generateShortId()}`;

  return {
    decision_id: decisionId,
    domain: input.domain,
    purpose: input.purpose,
    policy_ref: input.policy_ref ?? null,
    tenant_id: input.tenant_id ?? null,

    // AI
    ai_used: input.ai_used ?? false,
    ai_mode: input.ai_mode ?? null,
    ai_model: input.ai_model ?? null,
    ai_scope: input.ai_scope ?? null,
    ai_prompt_hash: aiPromptHash,
    ai_metadata: input.policy_ref
      ? { policy_ref: input.policy_ref }
      : null,
    ai_responsibility: input.ai_used ? 'suggestion' : 'none',

    // Human Control
    reviewed_by: input.reviewed_by ?? null,
    reviewer_role: input.reviewer_role ?? null,
    approved: input.approved ?? false,
    approval_timestamp: input.approval_timestamp ?? null,
    rejection_reason: null,

    // Dual Approval
    second_reviewer_id: input.second_reviewer_id ?? null,
    second_reviewer_role: input.second_reviewer_role ?? null,
    second_approved: input.second_approved ?? null,
    second_approved_at: input.second_approved_at ?? null,
    approver_ids: input.approver_ids ?? [],

    // Execution
    final_action: input.final_action,
    executed_at: executedAt,
    execution_status: 'success',
    execution_details: null,

    // Responsibility
    final_responsible: input.final_responsible,
    legal_scope: null,

    // Evidence
    evidence_level: input.evidence_level,
    supporting_evidence: null,
    external_evidence: input.external_evidence ?? [],

    // Policy Snapshot
    policy_snapshot: input.policy_snapshot ?? null,
    policy_snapshot_hash: policySnapshotHash,

    // Hash Chain
    previous_hash: previousHash,
    chain_hash: chainHash,
    chain_index: chainIndex,
    chain_domain: input.domain,

    // 6W
    six_w: input.six_w ? (input.six_w as unknown as Record<string, unknown>) : null,
    six_w_source: input.six_w_source ?? null,
    six_w_confidence: input.six_w_confidence ?? null,
    six_w_model: input.six_w_model ?? null,

    // Voice
    voice_transcript: input.voice_transcript ?? null,
    voice_confidence: input.voice_confidence ?? null,
    voice_provider: input.voice_provider ?? null,
    voice_audio_hash: input.voice_audio_hash ?? null,

    // Audit
    audit_status: 'PENDING' as AuditStatus,
    risk_level: input.risk_level ?? ('LOW' as RiskLevel),
    compliance_checks: null,

    // Links
    session_id: input.session_id ?? null,
    note_ids: input.note_ids ?? [],
    evidence_ids: input.evidence_ids ?? [],
    document_id: input.document_id ?? null,
    case_id: input.case_id ?? null,

    // Meta
    created_by: input.final_responsible,
    tags: input.tags ?? [],
  };
}

// ==================== Utilities ====================

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 11);
}
