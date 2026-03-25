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
