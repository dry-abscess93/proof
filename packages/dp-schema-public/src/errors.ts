/**
 * Governance 위반 에러 클래스
 *
 * @locked v1.0
 * @warning DPU 생성 실패 시 반드시 이 에러 사용
 */

/**
 * Governance 위반 에러 코드
 */
export type GovernanceViolationCode =
  | 'POLICY_NOT_FOUND'
  | 'INSUFFICIENT_EVIDENCE'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'APPROVAL_REQUIRED'
  | 'UNAUTHORIZED_APPROVER'
  | 'INSUFFICIENT_APPROVERS'
  | 'AI_MODE_BLOCKED'
  | 'RISK_THRESHOLD_EXCEEDED'
  | 'CRITICAL_RISK_INSUFFICIENT_APPROVERS'
  | 'SENSITIVE_DATA_INSUFFICIENT_EVIDENCE'
  | 'SENSITIVE_DATA_AI_MODE_BLOCKED'
  | 'DPU_REQUIRED';

/**
 * Governance 위반 에러
 *
 * @example
 * throw new GovernanceViolationError(
 *   'INSUFFICIENT_EVIDENCE',
 *   'Evidence level DRAFT below minimum PARTIAL'
 * );
 */
export class GovernanceViolationError extends Error {
  public readonly code: GovernanceViolationCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: GovernanceViolationCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GovernanceViolationError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GovernanceViolationError);
    }
  }

  /**
   * 에러를 로그용 객체로 변환
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * 에러를 API 응답용 객체로 변환
   */
  toApiResponse(): Record<string, unknown> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * GovernanceViolationError 타입 가드
 */
export function isGovernanceViolationError(
  error: unknown
): error is GovernanceViolationError {
  return error instanceof GovernanceViolationError;
}

/**
 * 에러 코드별 한국어 메시지
 */
export const VIOLATION_MESSAGES: Record<GovernanceViolationCode, string> = {
  POLICY_NOT_FOUND: '해당 도메인에 활성 정책이 없습니다',
  INSUFFICIENT_EVIDENCE: '증빙 레벨이 최소 요구 사항을 충족하지 않습니다',
  HUMAN_REVIEW_REQUIRED: '인간 검토가 필수입니다',
  APPROVAL_REQUIRED: '승인이 필요합니다',
  UNAUTHORIZED_APPROVER: '승인 권한이 없는 역할입니다',
  INSUFFICIENT_APPROVERS: '최소 승인자 수를 충족하지 않습니다',
  AI_MODE_BLOCKED: '해당 AI 모드는 이 도메인에서 사용할 수 없습니다',
  RISK_THRESHOLD_EXCEEDED: '리스크 임계값을 초과했습니다',
  CRITICAL_RISK_INSUFFICIENT_APPROVERS: 'CRITICAL 리스크는 최소 2인 승인이 필요합니다',
  SENSITIVE_DATA_INSUFFICIENT_EVIDENCE: '민감 데이터는 AUDIT_READY 증빙이 필요합니다',
  SENSITIVE_DATA_AI_MODE_BLOCKED: '민감 데이터에 AUTONOMOUS 모드는 사용할 수 없습니다',
  DPU_REQUIRED: '이 작업에는 DPU 생성이 필요합니다',
};

/**
 * 에러 코드로 한국어 메시지 가져오기
 */
export function getViolationMessage(code: GovernanceViolationCode): string {
  return VIOLATION_MESSAGES[code];
}
