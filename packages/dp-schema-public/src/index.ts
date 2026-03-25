/**
 * @cronozen/dp-schema-public
 *
 * Cronozen Decision Proof 공개 스키마 패키지
 *
 * 이 패키지는 DPU(Decision Proof Unit)의 공개 표준을 정의합니다.
 * - 타입/인터페이스 (JSON-LD, 6W)
 * - Enum (EvidenceLevel, AIMode, RiskLevel 등)
 * - Evidence Level 비교/검증 함수
 * - 스키마 버전 관리
 * - Governance 에러 클래스
 *
 * @version 0.1.0
 * @license Apache-2.0
 */

// ==================== Enums ====================

export {
  EvidenceLevel,
  AIMode,
  RiskLevel,
  AuditStatus,
  DataSensitivityLevel,
} from './enums';

// ==================== Constants (Lock 1) ====================

export {
  EVIDENCE_LEVEL_ORDER,
  isEvidenceLevelSufficient,
  getEvidenceLevelOrdinal,
  compareEvidenceLevels,
  type EvidenceLevelKey,
} from './constants';

// ==================== Evidence Labels (Lock 1) ====================

export {
  EVIDENCE_LEVEL_METADATA,
  getEvidenceLevelLabel,
  isAuditable,
  getLegalWeight,
  type EvidenceLevelMetadata,
} from './evidence-labels';

// ==================== Errors (Lock 2-3) ====================

export {
  GovernanceViolationError,
  isGovernanceViolationError,
  VIOLATION_MESSAGES,
  getViolationMessage,
  type GovernanceViolationCode,
} from './errors';

// ==================== JSON-LD Schema (Lock 4-5) ====================

export type {
  DecisionProofUnitJSONLD,
  DecisionProofCollectionJSONLD,
  EvidenceLevelJSONLD,
  AIInvolvementJSONLD,
  HumanControlJSONLD,
  ExecutionJSONLD,
  ResponsibilityJSONLD,
  PolicyJSONLD,
  ComplianceJSONLD,
  ComplianceCheckJSONLD,
  AuditTrailEntryJSONLD,
  AuditJSONLD,
  MetadataJSONLD,
  SignatureJSONLD,
  SixWJSONLD,
  ChainInfoJSONLD,
  CollectionSummaryJSONLD,
} from './jsonld-schema';

// ==================== Schema Version (Lock 4-5) ====================

export {
  JSONLD_SCHEMA_VERSIONS,
  CURRENT_SCHEMA_VERSION,
  CURRENT_CONTEXT_URL,
  isSchemaVersionSupported,
  getSchemaVersionInfo,
  getSupportedVersions,
  type SchemaVersionInfo,
} from './schema-version';

// ==================== 6W Types ====================

export type {
  SixWFields,
  SixWWho,
  SixWWhat,
  SixWWhere,
  SixWWhen,
  SixWHow,
  SixWWhy,
  SixWExtractionResult,
  SixWExtractionOptions,
} from './six-w-types';
