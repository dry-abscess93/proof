# @cronozen/dp-schema-public

Cronozen Decision Proof Unit(DPU) 공개 스키마 패키지.

## 핵심 원칙

1. **Public Schema = 최소 표준.** 이 패키지는 DPU의 도입과 검증에 필요한 최소한의 타입, enum, 검증 함수만 포함합니다. 감사/정산/컴플라이언스 판정 로직은 포함되지 않습니다.

2. **`extensions.cronozen.*`는 Private Schema에서만 정의됩니다.** JSON-LD 스키마의 `extensions.cronozen` 네임스페이스는 유료 패키지(`@cronozen/dpu-pro`, `@cronozen/dpu-enterprise`)에서만 스펙이 제공됩니다. Public Schema에는 확장 슬롯만 존재합니다.

3. **Breaking Change 정책.** 이 패키지의 JSON-LD 스키마(`v2.0`)는 외부 시스템과의 계약입니다. 기존 필드의 이름/타입 변경, 필수 필드 삭제, enum 값 변경은 금지됩니다. 새 필드 추가(끝에)와 선택 필드 값 추가만 허용됩니다. Breaking Change가 필요한 경우 새 버전(`v3.0`)을 추가합니다.

## 설치

```bash
npm install @cronozen/dp-schema-public
```

## 사용

```typescript
import {
  EvidenceLevel,
  isEvidenceLevelSufficient,
  type DecisionProofUnitJSONLD,
  type SixWFields,
} from '@cronozen/dp-schema-public';

// Evidence Level 비교
const sufficient = isEvidenceLevelSufficient(
  EvidenceLevel.AUDIT_READY,
  EvidenceLevel.PARTIAL
); // true

// JSON-LD 타입 사용
const dpu: DecisionProofUnitJSONLD = {
  '@context': 'https://schema.cronozen.com/decision-proof/v2',
  '@type': 'DecisionProofUnit',
  '@id': 'crz:dpu/example-001',
  // ...
};
```

## 패키지 구조

```
@cronozen/dp-schema-public    (이 패키지, OSS)
@cronozen/dpu-core             거버넌스 없는 순수 엔진 (OSS)
@cronozen/dpu-pro              거버넌스/컴플라이언스/책임귀속 (유료)
@cronozen/dpu-enterprise       멀티테넌시/승인워크플로우/감사팩 (고가)
@cronozen/dpu-connector-*      DB 어댑터 (Prisma, PostgreSQL 등)
@cronozen/dpu-templates-*      도메인별 템플릿 (복지, 약국 등)
```

## 라이선스

Apache-2.0
