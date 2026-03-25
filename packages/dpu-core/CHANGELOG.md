# Changelog

## [0.1.0] - 2026-02-10

### Added
- `canonicalize()`, `canonicalizeFlat()`, `canonicalizeChainPayload()` - JSON 정규화 표준 함수
- `computeChainHash()` - SHA-256 체인 해시 계산 (순수 함수)
- `generatePolicyHash()`, `verifyPolicyHash()` - 정책 해시 계산/검증
- `computeContentHash()`, `computeObjectHash()` - 범용 해시
- `createDPUEnvelope()` - DPU 레코드 포맷 빌더 (DB 접근 없음)
- `DPUStorageAdapter` 인터페이스 - DB 어댑터 추상화
- CLI: `cronozen-dpu init`, `validate`, `hash`

### Hash Compatibility Guarantee
`computeChainHash()`는 기존 `src/lib/decision-proof/hash-chain.ts`의 동일 함수와
**바이트 단위로 동일한 해시를 생성**합니다.
이 호환성은 @locked 정책에 의해 보장되며, 향후 버전에서도 유지됩니다.
동일 입력에 대해 동일 해시가 나오지 않는 경우는 breaking change로 취급됩니다.
