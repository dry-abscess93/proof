/**
 * @cronozen/dpu-core
 *
 * Cronozen DPU Core 패키지
 *
 * 거버넌스 없는 순수 엔진:
 * - 해시 체인 계산 (computeChainHash)
 * - 정책 해시 계산/검증 (generatePolicyHash, verifyPolicyHash)
 * - 정규화 (canonicalize)
 * - DPU Envelope 생성 (createDPUEnvelope)
 * - Storage Adapter 인터페이스 (DPUStorageAdapter)
 *
 * 거버넌스 가드, 컴플라이언스 판정, 책임 그래프는
 * @cronozen/dpu-pro에서 제공합니다.
 *
 * @version 0.1.0
 * @license Apache-2.0
 */

// ==================== Re-export dp-schema-public ====================

export {
  EvidenceLevel,
  AIMode,
  RiskLevel,
  AuditStatus,
  DataSensitivityLevel,
} from '@cronozen/dp-schema-public';

// ==================== Canonicalization ====================

export {
  canonicalize,
  canonicalizeFlat,
  canonicalizeChainPayload,
  canonicalizeChainPayloadV1,
} from './canonicalize';

// ==================== Hash Functions ====================

export {
  computeChainHash,
  computeChainHashV1,
  generatePolicyHash,
  verifyPolicyHash,
  computeContentHash,
  computeObjectHash,
} from './hash';

// ==================== Envelope ====================

export {
  createDPUEnvelope,
  type CreateEnvelopeInput,
  type ChainContext,
  type DPUEnvelope,
} from './envelope';

// ==================== Adapter Interface ====================

export type {
  DPUStorageAdapter,
  DPURecord,
  PolicyRecord,
  AuditLogRecord,
  ChainLinkResult,
} from './adapter';
