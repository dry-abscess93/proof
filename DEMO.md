# Cronozen Decision Proof — MCP 데모 가이드

> MCP(Model Context Protocol) 서버를 통해 Claude Desktop에서 DPU(Decision Proof Unit)를 직접 생성·조회·검증할 수 있습니다.

## 1. Claude Desktop 설정

`~/.claude/claude_desktop_config.json` (macOS) 또는 `%APPDATA%\Claude\claude_desktop_config.json` (Windows)에 아래 설정을 추가하세요.

### Production (cronozen.com)

```json
{
  "mcpServers": {
    "cronozen-proof": {
      "url": "https://mcp.cronozen.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

### Staging (stg.cronozen.com)

```json
{
  "mcpServers": {
    "cronozen-proof": {
      "url": "https://stg-mcp.cronozen.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

### Local Development

```json
{
  "mcpServers": {
    "cronozen-proof": {
      "url": "http://localhost:3100/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

> **JWT 토큰**: cronozen.com 로그인 후 개발자 도구 → Application → Cookies에서 `auth_token` 값을 사용하거나, `/api/auth/session`에서 확인하세요.

---

## 2. curl 연결 테스트

### MCP initialize 요청

MCP 서버가 정상 동작하는지 확인합니다 (Streamable HTTP transport).

```bash
# Production
curl -X POST https://mcp.cronozen.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -D - \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }'
```

```bash
# Staging
curl -X POST https://stg-mcp.cronozen.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -D - \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }'
```

**예상 응답** (JSON-RPC):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "cronozen-decision-proof",
      "version": "0.1.0"
    }
  }
}
```

> 응답 헤더에 `Mcp-Session-Id`가 포함됩니다. 후속 요청에 이 세션 ID를 포함해야 합니다.

### Health Check

```bash
curl https://mcp.cronozen.com/health
# 예상 응답: {"status":"ok"}
```

---

## 3. MCP 도구 목록 확인

initialize 후 도구 목록을 조회합니다.

```bash
curl -X POST https://mcp.cronozen.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

**6개 도구가 노출되어야 합니다:**

| # | 도구 이름 | 설명 |
|---|-----------|------|
| 1 | `proof_record` | AI 의사결정을 DPU로 기록 (SHA-256 해시 체인) |
| 2 | `proof_get` | DPU 상세 조회 |
| 3 | `proof_verify` | 개별 DPU 해시 무결성 검증 |
| 4 | `proof_chain_verify` | 도메인 전체 해시 체인 검증 |
| 5 | `proof_export_jsonld` | JSON-LD v2.0 증빙 내보내기 |
| 6 | `proof_public_verify` | 공개 검증 (인증 불필요) |

---

## 4. 데모 시나리오 (6단계)

아래 시나리오를 Claude Desktop에서 순서대로 실행하면 DPU 전체 라이프사이클을 체험할 수 있습니다.

### Step 1: `proof_record` — 재활케어 의사결정 기록 생성

Claude에게 아래와 같이 요청하세요:

> "재활케어 도메인에서 '고관절 수술 후 환자 A의 재활 프로그램을 PT 기반에서 수중재활로 변경'이라는 의사결정을 DPU로 기록해줘."

**도구 입력 예시:**

```json
{
  "domain": "rehab_care",
  "purpose": "고관절 수술 후 환자 A의 재활 프로그램을 PT 기반에서 수중재활로 변경",
  "final_action": "UPDATE",
  "evidence_level": "AUDIT_READY",
  "reviewed_by": "김치료사",
  "reviewer_role": "operator",
  "approved": true,
  "tags": ["재활", "수중치료", "프로그램변경"]
}
```

**예상 응답:**

```json
{
  "success": true,
  "data": {
    "id": "cm8abcd1234efgh5678",
    "decision_id": "DPU-20260302-xxxx",
    "domain": "rehab_care",
    "purpose": "고관절 수술 후 환자 A의 재활 프로그램을 PT 기반에서 수중재활로 변경",
    "final_action": "UPDATE",
    "evidence_level": "AUDIT_READY",
    "audit_status": "PASSED",
    "created_at": "2026-03-02T10:30:00.000Z"
  }
}
```

> **중요**: 응답에서 `id` 값을 기억하세요. 이후 단계에서 사용합니다.

---

### Step 2: `proof_get` — 생성된 DPU 상세 조회

> "방금 생성한 DPU의 상세 내용을 보여줘."

**도구 입력 예시:**

```json
{
  "id": "cm8abcd1234efgh5678"
}
```

**예상 응답 (주요 필드):**

```json
{
  "success": true,
  "data": {
    "id": "cm8abcd1234efgh5678",
    "decision_id": "DPU-20260302-xxxx",
    "domain": "rehab_care",
    "purpose": "고관절 수술 후 환자 A의 재활 프로그램을 PT 기반에서 수중재활로 변경",
    "final_action": "UPDATE",
    "ai_used": true,
    "ai_mode": "RECOMMENDATION",
    "reviewed_by": "김치료사",
    "reviewer_role": "operator",
    "approved": true,
    "evidence_level": "AUDIT_READY",
    "audit_status": "PASSED",
    "risk_level": "LOW",
    "chain_hash": "a3f8b2c1d4e5f6...",
    "previous_hash": "genesis_or_prev_hash",
    "chain_index": 42,
    "chain_domain": "rehab_care",
    "six_w": {
      "who": { "name": "김치료사", "role": "operator" },
      "what": { "action": "UPDATE", "description": "재활 프로그램 변경" },
      "where": { "context": "재활케어 시스템" },
      "when_time": { "timestamp": "2026-03-02T10:30:00.000Z" },
      "how": { "method": "AI 추천 기반 의사결정" },
      "why": { "reason": "수중재활이 고관절 회복에 더 효과적" }
    },
    "tags": ["재활", "수중치료", "프로그램변경"],
    "created_at": "2026-03-02T10:30:00.000Z"
  }
}
```

---

### Step 3: `proof_verify` — 개별 해시 무결성 검증

> "이 DPU의 해시가 변조되지 않았는지 검증해줘."

**도구 입력 예시:**

```json
{
  "proofId": "cm8abcd1234efgh5678"
}
```

**예상 응답:**

```json
{
  "verified": true,
  "proof": {
    "id": "cm8abcd1234efgh5678",
    "chain_hash": "a3f8b2c1d4e5f6...",
    "chain_index": 42
  }
}
```

> `verified: true`이면 해시가 무결합니다. `false`이면 데이터 변조가 감지된 것입니다.

---

### Step 4: `proof_chain_verify` — 도메인 전체 체인 검증

> "rehab_care 도메인의 전체 해시 체인을 검증해줘."

**도구 입력 예시:**

```json
{
  "domain": "rehab_care"
}
```

**예상 응답 (정상):**

```json
{
  "success": true,
  "data": {
    "verified": true,
    "domain": "rehab_care",
    "totalDPUs": 43,
    "verifiedCount": 43,
    "errors": [],
    "processingTime": 150
  }
}
```

**예상 응답 (변조 감지 시):**

```json
{
  "success": true,
  "data": {
    "verified": false,
    "domain": "rehab_care",
    "totalDPUs": 43,
    "verifiedCount": 20,
    "firstBrokenIndex": 20,
    "firstBrokenDPUId": "cm8broken123",
    "errors": [
      {
        "dpuId": "cm8broken123",
        "chainIndex": 20,
        "expectedHash": "abc123...",
        "actualHash": "def456...",
        "type": "hash_mismatch"
      }
    ],
    "processingTime": 85
  }
}
```

> 부분 검증도 가능합니다: `fromIndex`, `toIndex`, `batchSize` 파라미터를 지정하세요.

---

### Step 5: `proof_export_jsonld` — JSON-LD v2.0 내보내기

> "이 DPU를 JSON-LD 형식으로 내보내줘."

**도구 입력 예시:**

```json
{
  "id": "cm8abcd1234efgh5678"
}
```

**예상 응답 (JSON-LD v2.0):**

```json
{
  "@context": "https://schema.cronozen.com/decision-proof/v2",
  "@type": "DecisionProofUnit",
  "@id": "crz:dpu/DPU-20260302-xxxx",
  "context": {
    "domain": "rehab_care",
    "purpose": "고관절 수술 후 환자 A의 재활 프로그램을 PT 기반에서 수중재활로 변경"
  },
  "evidenceLevel": {
    "code": "AUDIT_READY",
    "label": "감사 대비 완료",
    "label_en": "Audit Ready",
    "ordinal": 2,
    "auditable": true,
    "legal_weight": "법적 증거력 인정"
  },
  "ai_involvement": {
    "used": true,
    "mode": "RECOMMENDATION",
    "responsibility": "suggestion"
  },
  "human_control": {
    "reviewed_by": "김치료사",
    "approved": true
  },
  "execution": {
    "final_action": "UPDATE",
    "executed_at": "2026-03-02T10:30:00.000Z",
    "execution_status": "success"
  },
  "compliance": {
    "status": "PASS",
    "checks": []
  },
  "sixW": {
    "who": { "name": "김치료사", "role": "operator" },
    "what": { "action": "UPDATE", "description": "재활 프로그램 변경" },
    "why": { "reason": "수중재활이 고관절 회복에 더 효과적" }
  },
  "chain": {
    "chain_hash": "a3f8b2c1d4e5f6...",
    "previous_hash": "...",
    "chain_index": 42,
    "chain_domain": "rehab_care"
  }
}
```

> 이 JSON-LD는 `schema.cronozen.com/decision-proof/v2` 온톨로지를 따릅니다.

---

### Step 6: `proof_public_verify` — 공개 검증 (인증 불필요)

> "이 DPU를 인증 없이 공개 검증해줘."

**도구 입력 예시:**

```json
{
  "id": "cm8abcd1234efgh5678"
}
```

**예상 응답:**

```json
{
  "success": true,
  "verified": true,
  "proof": {
    "id": "cm8abcd1234efgh5678",
    "decision_id": "DPU-20260302-xxxx",
    "domain": "rehab_care",
    "chain_index": 42,
    "evidence_level": "AUDIT_READY",
    "audit_status": "PASSED",
    "created_at": "2026-03-02T10:30:00.000Z"
  },
  "integrity": {
    "hash_valid": true,
    "previous_link_valid": true,
    "next_link_valid": null,
    "algorithm": "SHA-256",
    "chain_hash": "a3f8b2c1d4e5f6..."
  }
}
```

**검증 결과 해석:**

| 필드 | 의미 |
|------|------|
| `hash_valid` | 이 DPU 자체의 SHA-256 해시가 유효한지 |
| `previous_link_valid` | 이전 체인 링크와 연결이 정상인지 (`null` = Genesis 블록) |
| `next_link_valid` | 다음 체인 링크와 연결이 정상인지 (`null` = 마지막 블록) |
| `verified` | `hash_valid AND (previous_link_valid !== false)` |

---

## 5. 검증 체크리스트

### MCP 서버 연결

- [ ] `curl POST /mcp` initialize 요청 → `200 OK` + `serverInfo.name === "cronozen-decision-proof"`
- [ ] 응답 헤더에 `Mcp-Session-Id` 포함 확인
- [ ] `curl GET /health` → `{"status":"ok"}`

### Claude Desktop 도구 노출

- [ ] Claude Desktop 재시작 후 도구 목록에 6개 도구 표시
  - `proof_record`
  - `proof_get`
  - `proof_verify`
  - `proof_chain_verify`
  - `proof_export_jsonld`
  - `proof_public_verify`

### 데모 시나리오 실행

- [ ] Step 1: `proof_record` → DPU 생성 성공, `id` 반환
- [ ] Step 2: `proof_get` → 생성된 DPU 상세 조회 성공
- [ ] Step 3: `proof_verify` → `verified: true`
- [ ] Step 4: `proof_chain_verify` → 도메인 체인 검증 성공
- [ ] Step 5: `proof_export_jsonld` → JSON-LD v2.0 문서 반환
- [ ] Step 6: `proof_public_verify` → 인증 없이 공개 검증 성공

---

## 6. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `401 Unauthorized` | JWT 토큰 만료/누락 | `auth_token` 쿠키 재발급 후 config 업데이트 |
| `ECONNREFUSED` | MCP 서버 미실행 | `docker ps`로 컨테이너 확인, ECS 태스크 상태 점검 |
| 도구 미노출 | config 경로 오류 | `claude_desktop_config.json` 경로 및 JSON 문법 확인 |
| `proof_chain_verify` 실패 | 인증 필요 | 이 도구는 JWT 인증이 필요 — `Authorization` 헤더 확인 |
| SSE 연결 끊김 | 타임아웃 | ALB idle timeout (60s) 확인, 재연결 시도 |
