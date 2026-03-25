# Changelog

## [0.1.0] - 2026-02-10

### Added
- `EvidenceLevel`, `AIMode`, `RiskLevel`, `AuditStatus`, `DataSensitivityLevel` - Prisma-free enum 정의
- `EVIDENCE_LEVEL_ORDER`, `isEvidenceLevelSufficient()`, `compareEvidenceLevels()` - Evidence Level 비교 함수
- `EVIDENCE_LEVEL_METADATA`, `getEvidenceLevelLabel()`, `isAuditable()`, `getLegalWeight()` - Evidence Level 메타데이터
- `GovernanceViolationError` - Governance 위반 에러 클래스 + 12개 에러 코드
- JSON-LD Schema v2.0 타입 전체 (`DecisionProofUnitJSONLD`, `DecisionProofCollectionJSONLD` 등)
- 6W 타입 (`SixWFields`, `SixWExtractionResult` 등)
- Schema Version Registry (`JSONLD_SCHEMA_VERSIONS`, `CURRENT_SCHEMA_VERSION`)
- `extensions.cronozen` / `extensions.vendor` 확장 슬롯 (JSON-LD)

### Locked
- `EVIDENCE_LEVEL_ORDER` - enum 순서 고정 (정책 검증 기준)
- JSON-LD Schema v2.0 - 외부 시스템과의 계약 (breaking change 금지)
- `EVIDENCE_LEVEL_METADATA` - JSON-LD Export에 사용되는 외부 약속
