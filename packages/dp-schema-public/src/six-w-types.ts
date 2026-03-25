/**
 * DPU 6W 구조 타입 정의
 *
 * 6W: Who(실행자), What(내용), Where(위치), When(시점), How(도구), Why(근거)
 *
 * 설계 문서 기준:
 * - 입력: 자연어 업무 지시 (음성/텍스트)
 * - 처리: LLM(GPT-4/Claude) + Few-shot Prompting으로 6W 필드 자동 추출
 * - 출력: JSON-LD 표준 구조 DPU
 *
 * @version 1.0
 */

// ==================== 6W Fields ====================

export interface SixWWho {
  name: string;
  role?: string;
  id?: string;
}

export interface SixWWhat {
  action: string;
  description: string;
  category?: string;
}

export interface SixWWhere {
  location?: string;
  system?: string;
  context?: string;
}

export interface SixWWhen {
  timestamp: string;        // ISO-8601
  original_text?: string;   // 원본 한국어 시간 표현
  timezone?: string;        // 기본값: Asia/Seoul
}

export interface SixWHow {
  method: string;
  tool?: string;
  ai_involved?: boolean;
}

export interface SixWWhy {
  reason: string;
  policy_ref?: string;
  evidence_ref?: string;
}

export interface SixWFields {
  who: SixWWho;
  what: SixWWhat;
  where: SixWWhere;
  when_time: SixWWhen;
  how: SixWHow;
  why: SixWWhy;
}

// ==================== Extraction Result ====================

export interface SixWExtractionResult {
  success: boolean;
  fields?: SixWFields;
  confidence: number;       // 0.0 ~ 1.0
  model: string;            // 사용된 AI 모델명
  processingTime: number;   // ms
  error?: string;
}

export interface SixWExtractionOptions {
  domain?: string;          // 도메인 힌트 (rehab_care, market, edu 등)
  language?: 'ko' | 'en';  // 기본값: 'ko'
}
