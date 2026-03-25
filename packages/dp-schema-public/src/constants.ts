/**
 * Evidence Level 순서 및 비교 함수
 *
 * @locked v1.0
 * @warning 이 순서는 정책 검증의 기준이므로 절대 변경 금지
 * @warning 새 레벨 추가 시 반드시 끝에 추가
 */

import { EvidenceLevel } from './enums';

/**
 * Evidence Level 순서 (Ordinal)
 *
 * ⚠️ 이 순서는 정책 검증의 기준이므로 절대 변경 금지
 * ⚠️ 새 레벨 추가 시 반드시 끝에 추가
 */
export const EVIDENCE_LEVEL_ORDER: Record<EvidenceLevel, number> = {
  DRAFT: 0,
  PARTIAL: 1,
  AUDIT_READY: 2,
  // FORENSIC: 3,  // 향후 확장용
} as const;

export type EvidenceLevelKey = keyof typeof EVIDENCE_LEVEL_ORDER;

/**
 * Evidence Level 비교
 *
 * @param provided 제공된 증빙 레벨
 * @param required 요구되는 최소 증빙 레벨
 * @returns true if provided >= required
 */
export function isEvidenceLevelSufficient(
  provided: EvidenceLevel,
  required: EvidenceLevel
): boolean {
  return EVIDENCE_LEVEL_ORDER[provided] >= EVIDENCE_LEVEL_ORDER[required];
}

/**
 * Evidence Level 순서값 반환
 */
export function getEvidenceLevelOrdinal(level: EvidenceLevel): number {
  return EVIDENCE_LEVEL_ORDER[level];
}

/**
 * 두 Evidence Level 비교
 *
 * @returns negative if a < b, 0 if a == b, positive if a > b
 */
export function compareEvidenceLevels(
  a: EvidenceLevel,
  b: EvidenceLevel
): number {
  return EVIDENCE_LEVEL_ORDER[a] - EVIDENCE_LEVEL_ORDER[b];
}
