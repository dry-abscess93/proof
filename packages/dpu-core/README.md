# @cronozen/dpu-core

Cronozen DPU(Decision Proof Unit) Core 패키지.

거버넌스 없는 순수 엔진입니다. 해시 계산, 정규화, DPU 레코드 생성, Storage Adapter 인터페이스를 제공합니다.

## 원칙

1. **Core = 표준 해시 + 포맷 + 어댑터 인터페이스.** DB 의존 없는 순수 함수와 인터페이스만 포함합니다.
2. **거버넌스/판정은 Pro.** 정책 가드, 컴플라이언스 판정, 책임 그래프, 체인 검증 판정은 `@cronozen/dpu-pro`에서 제공합니다.
3. **DB는 Connector로 분리.** `DPUStorageAdapter` 인터페이스를 구현하는 어댑터(`@cronozen/dpu-connector-prisma` 등)를 통해 DB에 접근합니다.

## 설치

```bash
npm install @cronozen/dpu-core
```

## 사용

### 해시 계산

```typescript
import { computeChainHash, generatePolicyHash, verifyPolicyHash } from '@cronozen/dpu-core';

// 체인 해시 계산 (Genesis)
const hash = computeChainHash(
  { domain: 'pharmacy', purpose: '교품거래', final_action: 'CREATED', final_responsible: 'kim' },
  null,
  new Date().toISOString()
);

// 정책 해시
const policyHash = generatePolicyHash({ min_evidence_level: 'AUDIT_READY' });
const valid = verifyPolicyHash({ min_evidence_level: 'AUDIT_READY' }, policyHash); // true
```

### DPU Envelope 생성

```typescript
import { createDPUEnvelope } from '@cronozen/dpu-core';

// 어댑터를 통해 최신 체인 링크 조회
const latestLink = await adapter.findLatestChainLink('pharmacy');

// Envelope 생성 (DB 접근 없음)
const envelope = createDPUEnvelope(
  {
    domain: 'pharmacy',
    purpose: '교품거래내역서 작성',
    final_action: 'INVOICE_CREATED',
    final_responsible: 'kim-pharmacist',
    evidence_level: 'DRAFT',
  },
  { latestLink }
);

// 어댑터를 통해 저장
const dpu = await adapter.createDPU(envelope);
```

### CLI

```bash
# 프로젝트 초기화
npx cronozen-dpu init

# 데이터 검증
npx cronozen-dpu validate --file dpu-data.json

# 해시 계산
npx cronozen-dpu hash --content '{"domain":"pharmacy"}'
```

## 패키지 구조

```
@cronozen/dp-schema-public    타입/enum/JSON-LD (OSS)
@cronozen/dpu-core             이 패키지 - 순수 엔진 (OSS)
@cronozen/dpu-pro              거버넌스/컴플라이언스/책임귀속 (유료)
@cronozen/dpu-enterprise       멀티테넌시/승인워크플로우/감사팩 (고가)
@cronozen/dpu-connector-*      DB 어댑터 (Prisma 등)
@cronozen/dpu-templates-*      도메인별 템플릿
```

## @locked 함수 (변경 금지)

아래 함수들의 입출력 규격은 기존 해시 체인과의 호환을 보장하기 위해 고정(locked)됩니다.
시그니처, 직렬화 순서, 해시 알고리즘을 변경하면 기존 체인 무결성이 깨집니다.

| 함수 | 파일 | 고정 내용 |
|------|------|----------|
| `canonicalize()` | canonicalize.ts | `JSON.stringify(data, Object.keys(data).sort())` |
| `canonicalizeChainPayload()` | canonicalize.ts | `{content, previousHash, timestamp}` 구조 + 키 정렬 |
| `computeChainHash()` | hash.ts | SHA-256(canonicalizeChainPayload(...)) |
| `generatePolicyHash()` | hash.ts | SHA-256(canonicalizeFlat(policyConfig)) |

## 라이선스

Apache-2.0
