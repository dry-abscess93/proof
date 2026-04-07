/**
 * File Proof API
 *
 * POST   /files/upload     — Upload file → auto-create DPU event
 * GET    /files/:id        — Get file metadata + proof info
 * GET    /files            — List files for tenant
 *
 * 핵심 흐름:
 * 1. 파일 수신
 * 2. SHA-256 해시 계산
 * 3. 동일 해시 중복 체크 (같은 파일이면 skip)
 * 4. 이전 버전 탐색 (같은 파일명 → version linking)
 * 5. 파일 저장 (로컬 MVP, S3 확장 예정)
 * 6. file_change DPU 이벤트 자동 생성
 * 7. 응답: 파일 메타 + DPU + 체인 해시
 */

import { Hono } from 'hono';
import { getDB } from '../db/connection.js';
import { computeChainHash } from '@cronozen/dpu-core';
import type { AuthContext } from '../middleware/auth.js';
import type { QuotaInfo } from '../middleware/quota.js';
import { calculateExpiresAt, checkStorageLimit } from '../services/retention.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads');

type Env = { Variables: { auth: AuthContext; quota?: QuotaInfo } };

export const filesRouter = new Hono<Env>();

// ─── POST /files/upload ───────────────────────────────────────────

filesRouter.post('/upload', async (c) => {
  const auth = c.get('auth');

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const domain = (formData.get('domain') as string) || 'default';
  const description = formData.get('description') as string | null;

  if (!file) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'file is required (multipart/form-data)' } },
      400,
    );
  }

  // 1. 파일 내용 읽기 + SHA-256 해시
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const db = getDB();

  // 2. 동일 해시 중복 체크
  const duplicate = db
    .prepare('SELECT id, decision_event_id FROM proof_files WHERE file_hash = ? AND tenant_id = ?')
    .get(fileHash, auth.tenantId) as { id: string; decision_event_id: string } | undefined;

  if (duplicate) {
    return c.json({
      data: {
        fileId: duplicate.id,
        duplicate: true,
        message: 'Identical file already exists',
        decisionEventId: duplicate.decision_event_id,
      },
    });
  }

  // 3. 스토리지 한도 체크
  const quota = c.get('quota');
  const tier = quota?.tier ?? 'proof_free';
  const storageCheck = checkStorageLimit(auth.tenantId, tier, buffer.length);
  if (!storageCheck.allowed) {
    return c.json({
      error: {
        code: 'STORAGE_LIMIT_EXCEEDED',
        message: `Storage limit exceeded (${storageCheck.usedMB}MB / ${storageCheck.limitMB}MB)`,
      },
      storage: storageCheck,
    }, 413);
  }

  // 4. 이전 버전 탐색 (같은 파일명)
  const previousVersion = db
    .prepare(
      'SELECT id, version_number, file_hash FROM proof_files WHERE filename = ? AND tenant_id = ? ORDER BY version_number DESC LIMIT 1',
    )
    .get(file.name, auth.tenantId) as { id: string; version_number: number; file_hash: string } | undefined;

  const versionNumber = previousVersion ? previousVersion.version_number + 1 : 1;
  const parentFileId = previousVersion?.id ?? null;

  // 4. 파일 저장
  const tenantDir = path.join(UPLOAD_DIR, auth.tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  const fileId = crypto.randomUUID();
  const ext = path.extname(file.name) || '';
  const storageName = `${fileId}${ext}`;
  const storagePath = path.join(auth.tenantId, storageName);
  const fullPath = path.join(UPLOAD_DIR, storagePath);

  fs.writeFileSync(fullPath, buffer);

  // 5. DPU 이벤트 자동 생성 (file_change)
  const eventId = crypto.randomUUID();
  const decisionId = `dec_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const evidenceId = `evi_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();

  // 체인 해시 계산
  const lastInChain = db
    .prepare('SELECT chain_hash, chain_index FROM decision_events WHERE chain_domain = ? AND tenant_id = ? ORDER BY chain_index DESC LIMIT 1')
    .get(domain, auth.tenantId) as { chain_hash: string; chain_index: number } | undefined;

  const previousHash = lastInChain?.chain_hash || null;
  const chainIndex = (lastInChain?.chain_index ?? -1) + 1;

  const chainHash = computeChainHash(
    { type: 'file_change', action_type: 'UPLOAD', actor_id: auth.tenantId, file_hash: fileHash },
    previousHash,
    now,
  );

  // diff 요약 (이전 버전이 있으면)
  const diffSummary = previousVersion
    ? JSON.stringify({
        previousHash: previousVersion.file_hash,
        currentHash: fileHash,
        versionChange: `v${previousVersion.version_number} → v${versionNumber}`,
      })
    : null;

  // 6. DB 저장 — 트랜잭션으로 파일 + 이벤트 동시 저장
  const expiresAt = calculateExpiresAt(tier, now);

  const insertFile = db.prepare(`
    INSERT INTO proof_files (
      id, tenant_id, decision_event_id,
      filename, mime_type, size_bytes, file_hash,
      parent_file_id, version_number, diff_summary,
      storage_path, storage_type, expires_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', ?, ?)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO decision_events (
      id, decision_id, type, source_type, status,
      actor_id, actor_type,
      action_type, action_description, action_metadata,
      evidence_id, evidence_level, chain_hash, chain_index, previous_hash, chain_domain,
      occurred_at, tags, metadata,
      tenant_id, api_key_id, created_at, updated_at
    ) VALUES (
      ?, ?, 'file_change', 'manual', 'recorded',
      ?, 'human',
      'UPLOAD', ?, ?,
      ?, 'DRAFT', ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const transaction = db.transaction(() => {
    insertFile.run(
      fileId, auth.tenantId, eventId,
      file.name, file.type || null, buffer.length, fileHash,
      parentFileId, versionNumber, diffSummary,
      storagePath, expiresAt,
      now,
    );

    insertEvent.run(
      eventId, decisionId,
      auth.tenantId,
      description || `File uploaded: ${file.name}`,
      JSON.stringify({
        fileId,
        filename: file.name,
        fileHash,
        sizeBytes: buffer.length,
        mimeType: file.type,
        version: versionNumber,
      }),
      evidenceId, chainHash, chainIndex, previousHash, domain,
      now,
      JSON.stringify(['file', 'upload']),
      JSON.stringify({ domain, fileId }),
      auth.tenantId, auth.apiKeyId, now, now,
    );
  });

  transaction();

  // 7. 응답
  return c.json({
    data: {
      file: {
        id: fileId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: buffer.length,
        fileHash,
        version: versionNumber,
        parentFileId,
        diffSummary: diffSummary ? JSON.parse(diffSummary) : null,
      },
      proof: {
        decisionId,
        evidenceId,
        chainHash,
        chainIndex,
        previousHash,
        domain,
        type: 'file_change',
        sourceType: 'manual',
      },
    },
    ...(quota ? { quota } : {}),
  }, 201);
});

// ─── GET /files ───────────────────────────────────────────────────

filesRouter.get('/', async (c) => {
  const auth = c.get('auth');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const filename = c.req.query('filename');

  const db = getDB();
  let where = 'WHERE tenant_id = ?';
  const params: unknown[] = [auth.tenantId];

  if (filename) {
    where += ' AND filename = ?';
    params.push(filename);
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM proof_files ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT * FROM proof_files ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return c.json({
    data: rows,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  });
});

// ─── GET /files/:id ───────────────────────────────────────────────

filesRouter.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  const db = getDB();
  const file = db
    .prepare('SELECT * FROM proof_files WHERE id = ? AND tenant_id = ?')
    .get(id, auth.tenantId);

  if (!file) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'File not found' } }, 404);
  }

  // 연결된 DPU 이벤트도 함께 조회
  const event = db
    .prepare('SELECT decision_id, chain_hash, chain_index, evidence_level, status FROM decision_events WHERE id = ?')
    .get((file as Record<string, unknown>).decision_event_id);

  return c.json({
    data: {
      file,
      proof: event || null,
    },
  });
});
