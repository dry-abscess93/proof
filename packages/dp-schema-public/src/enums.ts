/**
 * Cronozen Decision Proof Enums
 *
 * Prisma-free enum 정의.
 * @prisma/client 없이도 사용 가능하며,
 * Prisma enum과 런타임 타입 호환됩니다.
 *
 * @version 1.0
 * @locked 순서 변경 금지 (정책 검증 기준)
 */

// ==================== Evidence Level ====================

export const EvidenceLevel = {
  DRAFT: 'DRAFT',
  PARTIAL: 'PARTIAL',
  AUDIT_READY: 'AUDIT_READY',
  // FORENSIC: 'FORENSIC',  // 향후 확장용
} as const;

export type EvidenceLevel = (typeof EvidenceLevel)[keyof typeof EvidenceLevel];

// ==================== AI Mode ====================

export const AIMode = {
  RECOMMENDATION: 'RECOMMENDATION',
  DRAFT_GENERATION: 'DRAFT_GENERATION',
  ANALYSIS: 'ANALYSIS',
  CLASSIFICATION: 'CLASSIFICATION',
  PREDICTION: 'PREDICTION',
  AUTONOMOUS: 'AUTONOMOUS',
} as const;

export type AIMode = (typeof AIMode)[keyof typeof AIMode];

// ==================== Risk Level ====================

export const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

// ==================== Audit Status ====================

export const AuditStatus = {
  PENDING: 'PENDING',
  PASSED: 'PASSED',
  DENIED: 'DENIED',
  FLAGGED: 'FLAGGED',
} as const;

export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];

// ==================== Data Sensitivity Level ====================

export const DataSensitivityLevel = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  PII: 'PII',
  PHI: 'PHI',
} as const;

export type DataSensitivityLevel = (typeof DataSensitivityLevel)[keyof typeof DataSensitivityLevel];

// ==================== Decision Event Type ====================
// AI 중심 + 하네스(업무 시스템) 중심 통합 분류

export const DecisionEventType = {
  // AI-originated (기존)
  AGENT_EXECUTION: 'agent_execution',
  WORKFLOW_STEP: 'workflow_step',
  HUMAN_APPROVAL: 'human_approval',
  AI_RECOMMENDATION: 'ai_recommendation',
  AUTOMATED_ACTION: 'automated_action',
  POLICY_DECISION: 'policy_decision',
  ESCALATION: 'escalation',
  // Harness-originated (하네스 모델)
  FILE_CHANGE: 'file_change',
  APPROVAL: 'approval',
  ACCESS: 'access',
  IMPORT: 'import',
  EXPORT: 'export',
  INTEGRATION: 'integration',
  // Universal
  SYSTEM: 'system',
  CUSTOM: 'custom',
} as const;

export type DecisionEventType = (typeof DecisionEventType)[keyof typeof DecisionEventType];

// ==================== Event Source Type ====================
// 이벤트가 어디서 발생했는지 — 4계층 아키텍처 Layer 1 식별

export const EventSourceType = {
  AI: 'ai',             // AI 에이전트 (MCP, SDK 자동 호출)
  HARNESS: 'harness',   // 고객 업무 시스템 (ERP, 엑셀, CRM 연동)
  MANUAL: 'manual',     // 사용자 직접 입력 (업로드, 폼)
  SYSTEM: 'system',     // 크로노젠 내부 자동 생성 (스케줄, 체인 검증)
} as const;

export type EventSourceType = (typeof EventSourceType)[keyof typeof EventSourceType];
