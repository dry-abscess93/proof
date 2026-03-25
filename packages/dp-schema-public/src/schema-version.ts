/**
 * JSON-LD Schema Version Registry
 *
 * @locked v1.0
 * @warning Breaking Change 발생 시 새 버전 추가
 */

export interface SchemaVersionInfo {
  context_url: string;
  deprecated: boolean;
  supported_until: string | null;
  changes?: string[];
}

/**
 * JSON-LD Schema Version Registry
 *
 * ⚠️ Breaking Change 발생 시 새 버전 추가
 */
export const JSONLD_SCHEMA_VERSIONS: Record<string, SchemaVersionInfo> = {
  'v1.0': {
    context_url: 'https://schema.cronozen.com/decision-proof/v1',
    deprecated: true,
    supported_until: '2027-12-31',
    changes: [
      'Initial release',
      'Basic DPU structure',
    ],
  },
  'v2.0': {
    context_url: 'https://schema.cronozen.com/decision-proof/v2',
    deprecated: false,
    supported_until: null, // 영구 지원
    changes: [
      'Added: policy field with version_hash',
      'Added: compliance field with status/checks',
      'Enhanced: evidenceLevel with metadata',
      'Added: audit_trail in compliance',
      'Added: signature for blockchain readiness',
    ],
  },
} as const;

/**
 * 현재 스키마 버전
 */
export const CURRENT_SCHEMA_VERSION = 'v2.0';

/**
 * 현재 스키마 Context URL
 */
export const CURRENT_CONTEXT_URL = JSONLD_SCHEMA_VERSIONS[CURRENT_SCHEMA_VERSION].context_url;

/**
 * Schema 버전 지원 여부 확인
 */
export function isSchemaVersionSupported(version: string): boolean {
  const versionInfo = JSONLD_SCHEMA_VERSIONS[version];
  if (!versionInfo) return false;

  // deprecated이고 supported_until이 지나면 미지원
  if (versionInfo.deprecated && versionInfo.supported_until) {
    return new Date() < new Date(versionInfo.supported_until);
  }

  return true;
}

/**
 * Schema 버전 정보 가져오기
 */
export function getSchemaVersionInfo(version: string): SchemaVersionInfo | null {
  return JSONLD_SCHEMA_VERSIONS[version] || null;
}

/**
 * 모든 지원 버전 목록
 */
export function getSupportedVersions(): string[] {
  return Object.entries(JSONLD_SCHEMA_VERSIONS)
    .filter(([version]) => isSchemaVersionSupported(version))
    .map(([version]) => version);
}
