/**
 * Proof Storage Retention Service
 *
 * 티어별 보관 정책 적용 + 만료 파일 정리.
 * cron으로 매일 실행하거나, API 호출로 수동 실행.
 *
 * 정책 (proof-tiers.ts SSOT 미러):
 *   Free:       30일, 3버전, 500MB
 *   Pro:        365일, 10버전, 10GB
 *   Business:   무제한, 무제한, 100GB
 *   Enterprise: 무제한, 무제한, 무제한
 */

import { getDB } from '../db/connection.js';

// 티어별 보관 정책 (경량 미러)
const RETENTION_POLICY: Record<string, { days: number; maxVersions: number; storageMB: number }> = {
  proof_free:       { days: 30,  maxVersions: 3,  storageMB: 500 },
  proof_pro:        { days: 365, maxVersions: 10, storageMB: 10240 },
  proof_business:   { days: -1,  maxVersions: -1, storageMB: 102400 },
  proof_enterprise: { days: -1,  maxVersions: -1, storageMB: -1 },
};

/**
 * 파일 업로드 시 보관 만료일 계산
 */
export function calculateExpiresAt(tier: string, createdAt: string): string | null {
  const policy = RETENTION_POLICY[tier] ?? RETENTION_POLICY.proof_free;
  if (policy.days === -1) return null; // 무제한

  const date = new Date(createdAt);
  date.setDate(date.getDate() + policy.days);
  return date.toISOString();
}

/**
 * 테넌트의 현재 스토리지 사용량 (bytes)
 */
export function getTenantStorageUsage(tenantId: string): number {
  const db = getDB();
  const result = db
    .prepare('SELECT COALESCE(SUM(size_bytes), 0) as total FROM proof_files WHERE tenant_id = ?')
    .get(tenantId) as { total: number };
  return result.total;
}

/**
 * 스토리지 한도 체크
 */
export function checkStorageLimit(tenantId: string, tier: string, additionalBytes: number): {
  allowed: boolean;
  usedMB: number;
  limitMB: number | 'unlimited';
  remainingMB: number | 'unlimited';
} {
  const policy = RETENTION_POLICY[tier] ?? RETENTION_POLICY.proof_free;
  const used = getTenantStorageUsage(tenantId);
  const usedMB = Math.round(used / (1024 * 1024));

  if (policy.storageMB === -1) {
    return { allowed: true, usedMB, limitMB: 'unlimited', remainingMB: 'unlimited' };
  }

  const afterMB = Math.round((used + additionalBytes) / (1024 * 1024));

  return {
    allowed: afterMB <= policy.storageMB,
    usedMB,
    limitMB: policy.storageMB,
    remainingMB: Math.max(0, policy.storageMB - usedMB),
  };
}

/**
 * 오래된 버전 정리 (파일명 기준, 최신 N개만 유지)
 */
export function pruneOldVersions(tenantId: string, tier: string): number {
  const policy = RETENTION_POLICY[tier] ?? RETENTION_POLICY.proof_free;
  if (policy.maxVersions === -1) return 0;

  const db = getDB();

  // 파일명별로 그룹화, maxVersions 초과분 삭제
  const filenames = db
    .prepare('SELECT DISTINCT filename FROM proof_files WHERE tenant_id = ?')
    .all(tenantId) as { filename: string }[];

  let deleted = 0;

  for (const { filename } of filenames) {
    const versions = db
      .prepare('SELECT id FROM proof_files WHERE tenant_id = ? AND filename = ? ORDER BY version_number DESC')
      .all(tenantId, filename) as { id: string }[];

    if (versions.length > policy.maxVersions) {
      const toDelete = versions.slice(policy.maxVersions);
      for (const { id } of toDelete) {
        db.prepare('DELETE FROM proof_files WHERE id = ?').run(id);
        deleted++;
      }
    }
  }

  return deleted;
}

/**
 * 만료 파일 정리 (expires_at 기준)
 */
export function cleanExpiredFiles(): number {
  const db = getDB();
  const now = new Date().toISOString();

  const expired = db
    .prepare('SELECT id FROM proof_files WHERE expires_at IS NOT NULL AND expires_at < ?')
    .all(now) as { id: string }[];

  for (const { id } of expired) {
    db.prepare('DELETE FROM proof_files WHERE id = ?').run(id);
  }

  return expired.length;
}
