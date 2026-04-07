/**
 * Decision Event Type 메타데이터
 *
 * UI 표시용 라벨, 카테고리, 색상 힌트.
 * 테이블뷰 필터, 달력 뷰 아이콘 매핑에 사용.
 *
 * @version 1.0
 */

import { DecisionEventType, EventSourceType } from './enums';

export interface EventTypeMetadata {
  label: { ko: string; en: string };
  category: 'ai' | 'harness' | 'universal';
  /** 기본 소스 타입 (MCP에서 자동 태깅 시 사용) */
  defaultSource: EventSourceType;
  /** UI 색상 힌트 (tailwind color name) */
  color: string;
}

export const EVENT_TYPE_METADATA: Record<DecisionEventType, EventTypeMetadata> = {
  // AI-originated
  [DecisionEventType.AGENT_EXECUTION]: {
    label: { ko: 'AI 에이전트 실행', en: 'Agent Execution' },
    category: 'ai',
    defaultSource: EventSourceType.AI,
    color: 'blue',
  },
  [DecisionEventType.WORKFLOW_STEP]: {
    label: { ko: '워크플로우 단계', en: 'Workflow Step' },
    category: 'ai',
    defaultSource: EventSourceType.AI,
    color: 'blue',
  },
  [DecisionEventType.HUMAN_APPROVAL]: {
    label: { ko: '사람 승인', en: 'Human Approval' },
    category: 'ai',
    defaultSource: EventSourceType.MANUAL,
    color: 'green',
  },
  [DecisionEventType.AI_RECOMMENDATION]: {
    label: { ko: 'AI 추천', en: 'AI Recommendation' },
    category: 'ai',
    defaultSource: EventSourceType.AI,
    color: 'purple',
  },
  [DecisionEventType.AUTOMATED_ACTION]: {
    label: { ko: '자동 실행', en: 'Automated Action' },
    category: 'ai',
    defaultSource: EventSourceType.AI,
    color: 'cyan',
  },
  [DecisionEventType.POLICY_DECISION]: {
    label: { ko: '정책 결정', en: 'Policy Decision' },
    category: 'ai',
    defaultSource: EventSourceType.SYSTEM,
    color: 'orange',
  },
  [DecisionEventType.ESCALATION]: {
    label: { ko: '에스컬레이션', en: 'Escalation' },
    category: 'ai',
    defaultSource: EventSourceType.SYSTEM,
    color: 'red',
  },

  // Harness-originated
  [DecisionEventType.FILE_CHANGE]: {
    label: { ko: '파일 변경', en: 'File Change' },
    category: 'harness',
    defaultSource: EventSourceType.HARNESS,
    color: 'yellow',
  },
  [DecisionEventType.APPROVAL]: {
    label: { ko: '승인/결재', en: 'Approval' },
    category: 'harness',
    defaultSource: EventSourceType.HARNESS,
    color: 'green',
  },
  [DecisionEventType.ACCESS]: {
    label: { ko: '열람/접근', en: 'Access' },
    category: 'harness',
    defaultSource: EventSourceType.HARNESS,
    color: 'gray',
  },
  [DecisionEventType.IMPORT]: {
    label: { ko: '데이터 수집', en: 'Import' },
    category: 'harness',
    defaultSource: EventSourceType.HARNESS,
    color: 'teal',
  },
  [DecisionEventType.EXPORT]: {
    label: { ko: '내보내기', en: 'Export' },
    category: 'harness',
    defaultSource: EventSourceType.MANUAL,
    color: 'indigo',
  },
  [DecisionEventType.INTEGRATION]: {
    label: { ko: '외부 연동', en: 'Integration' },
    category: 'harness',
    defaultSource: EventSourceType.HARNESS,
    color: 'violet',
  },

  // Universal
  [DecisionEventType.SYSTEM]: {
    label: { ko: '시스템', en: 'System' },
    category: 'universal',
    defaultSource: EventSourceType.SYSTEM,
    color: 'gray',
  },
  [DecisionEventType.CUSTOM]: {
    label: { ko: '커스텀', en: 'Custom' },
    category: 'universal',
    defaultSource: EventSourceType.MANUAL,
    color: 'gray',
  },
} as const;

/** 카테고리별 이벤트 타입 목록 */
export function getEventTypesByCategory(category: EventTypeMetadata['category']): DecisionEventType[] {
  return (Object.entries(EVENT_TYPE_METADATA) as [DecisionEventType, EventTypeMetadata][])
    .filter(([, meta]) => meta.category === category)
    .map(([type]) => type);
}

/** 이벤트 타입 라벨 조회 */
export function getEventTypeLabel(type: DecisionEventType, lang: 'ko' | 'en' = 'ko'): string {
  return EVENT_TYPE_METADATA[type]?.label[lang] ?? type;
}
