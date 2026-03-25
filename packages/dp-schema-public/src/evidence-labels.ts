/**
 * Evidence Level 의미 정의
 *
 * @locked v1.0
 * @warning 이 정의는 JSON-LD Export에 사용되므로
 * @warning 외부 시스템과의 약속임 (함부로 변경 금지)
 */

import { EvidenceLevel } from './enums';

export interface EvidenceLevelMetadata {
  ordinal: number;
  auditable: boolean | 'limited';
  legal_weight: 'none' | 'supportive' | 'primary' | 'definitive';
  label: {
    ko: string;
    en: string;
  };
  description: {
    ko: string;
    en: string;
  };
  use_cases: string[];
  status?: 'active' | 'future';
}

/**
 * Evidence Level 메타데이터
 *
 * ⚠️ 이 정의는 JSON-LD Export에 사용되므로
 * ⚠️ 외부 시스템과의 약속임 (함부로 변경 금지)
 */
export const EVIDENCE_LEVEL_METADATA: Record<EvidenceLevel, EvidenceLevelMetadata> = {
  DRAFT: {
    ordinal: 0,
    auditable: false,
    legal_weight: 'none',
    label: {
      ko: '초안 (내부 참고용)',
      en: 'Draft (internal reference only)',
    },
    description: {
      ko: '내부 검토 단계로, 외부 감사나 법적 증빙으로 사용 불가',
      en: 'Internal review stage, not usable for external audit or legal evidence',
    },
    use_cases: ['마케팅 추천', '일반 제안', '프로토타입'],
    status: 'active',
  },

  PARTIAL: {
    ordinal: 1,
    auditable: 'limited',
    legal_weight: 'supportive',
    label: {
      ko: '부분 증빙 (인간 검토 필수)',
      en: 'Partial evidence (human review required)',
    },
    description: {
      ko: '전문가 검토를 거쳤으나, 완전한 감사 증빙으로는 부족. 보조 자료로 활용 가능',
      en: 'Reviewed by expert, but insufficient for full audit. Usable as supporting material',
    },
    use_cases: ['재활치료 계획', '교육 과정 배정', '멘토링 추천'],
    status: 'active',
  },

  AUDIT_READY: {
    ordinal: 2,
    auditable: true,
    legal_weight: 'primary',
    label: {
      ko: '감사 준비 완료 (즉시 제출 가능)',
      en: 'Audit-ready (immediately submittable)',
    },
    description: {
      ko: '외부 감사 및 정산에 즉시 사용 가능한 완전한 증빙. 법적 책임 입증 가능',
      en: 'Complete evidence usable for external audit and settlement. Can prove legal liability',
    },
    use_cases: ['바우처 승인', '결제 처리', '정산 확정', '약국 처방'],
    status: 'active',
  },
} as const;

/**
 * Evidence Level 라벨 가져오기
 */
export function getEvidenceLevelLabel(
  level: EvidenceLevel,
  locale: 'ko' | 'en' = 'ko'
): string {
  return EVIDENCE_LEVEL_METADATA[level].label[locale];
}

/**
 * Evidence Level이 감사 가능한지 확인
 */
export function isAuditable(level: EvidenceLevel): boolean {
  const metadata = EVIDENCE_LEVEL_METADATA[level];
  return metadata.auditable === true || metadata.auditable === 'limited';
}

/**
 * Evidence Level의 법적 무게 가져오기
 */
export function getLegalWeight(
  level: EvidenceLevel
): 'none' | 'supportive' | 'primary' | 'definitive' {
  return EVIDENCE_LEVEL_METADATA[level].legal_weight;
}
