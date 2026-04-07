/**
 * Google Drive Integration Service
 *
 * 핵심 흐름:
 * 1. OAuth2 연결 (connect → callback → tokens 저장)
 * 2. Watch 설정 (폴더 지정 → Drive Changes push notification)
 * 3. Webhook 수신 (변경 알림 → 파일 다운로드 → 해시 → DPU 생성)
 *
 * Google Drive webhook 제약:
 * - 변경 "알림"만 줌 (파일 내용 X, diff X)
 * - Changes API로 변경 파일 목록 조회 → 직접 다운로드 → 해시 비교
 * - Channel은 최대 24시간 → 자동 갱신 필요
 */

import { google, type drive_v3 } from 'googleapis';
import { getDB } from '../db/connection.js';
import { computeChainHash } from '@cronozen/dpu-core';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads');

// ============================================================================
// Config
// ============================================================================

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${getPublicUrl()}/integrations/google-drive/callback`,
  );
}

function getPublicUrl(): string {
  return process.env.PUBLIC_URL || 'https://api.cronozen.com';
}

// ============================================================================
// OAuth2 Flow
// ============================================================================

/**
 * 1단계: OAuth 인증 URL 생성
 */
export function getAuthUrl(tenantId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // 항상 refresh_token 발급
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    state: tenantId, // callback에서 tenant 식별
  });
}

/**
 * 2단계: OAuth callback → tokens 저장
 */
export async function handleCallback(code: string, tenantId: string): Promise<{
  integrationId: string;
  email?: string;
}> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const db = getDB();
  const integrationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : null;

  // 기존 연동이 있으면 업데이트, 없으면 생성
  const existing = db
    .prepare('SELECT id FROM integrations WHERE tenant_id = ? AND provider = ?')
    .get(tenantId, 'google_drive') as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE integrations SET
        access_token = ?, refresh_token = ?, token_expires_at = ?,
        status = 'active', updated_at = ?
      WHERE id = ?
    `).run(tokens.access_token, tokens.refresh_token, expiresAt, now, existing.id);

    return { integrationId: existing.id };
  }

  db.prepare(`
    INSERT INTO integrations (
      id, tenant_id, provider, status,
      access_token, refresh_token, token_expires_at,
      created_at, updated_at
    ) VALUES (?, ?, 'google_drive', 'active', ?, ?, ?, ?, ?)
  `).run(
    integrationId, tenantId,
    tokens.access_token, tokens.refresh_token, expiresAt,
    now, now,
  );

  return { integrationId };
}

// ============================================================================
// Watch Setup
// ============================================================================

/**
 * 3단계: 감시 폴더 지정 + Drive Changes push notification 설정
 */
export async function watchFolder(
  integrationId: string,
  folderId: string,
  chainDomain?: string,
): Promise<{ channelId: string; folderName: string; expiresAt: string }> {
  const db = getDB();
  const integration = db
    .prepare('SELECT * FROM integrations WHERE id = ?')
    .get(integrationId) as Record<string, string> | undefined;

  if (!integration) throw new Error('Integration not found');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // 폴더 이름 조회
  const folder = await drive.files.get({ fileId: folderId, fields: 'name' });
  const folderName = folder.data.name || folderId;

  // Changes start page token 획득
  const startPageToken = await drive.changes.getStartPageToken({});
  const pageToken = startPageToken.data.startPageToken!;

  // Push notification channel 등록
  const channelId = crypto.randomUUID();
  const webhookUrl = `${getPublicUrl()}/webhooks/google-drive`;

  // Channel 만료: 24시간 (Google 최대)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const watchResponse = await drive.changes.watch({
    pageToken,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      expiration: String(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const resourceId = watchResponse.data.resourceId || '';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE integrations SET
      watch_folder_id = ?, watch_folder_name = ?,
      watch_channel_id = ?, watch_resource_id = ?,
      watch_expires_at = ?, page_token = ?,
      chain_domain = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    folderId, folderName,
    channelId, resourceId,
    expiresAt, pageToken,
    chainDomain || 'default',
    now, integrationId,
  );

  return { channelId, folderName, expiresAt };
}

/**
 * 감시 채널 갱신 (24시간마다 cron으로 호출)
 */
export async function renewExpiredWatches(): Promise<number> {
  const db = getDB();
  const now = new Date().toISOString();
  const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1시간 이내 만료

  const expiring = db
    .prepare("SELECT id, watch_folder_id FROM integrations WHERE status = 'active' AND watch_expires_at < ? AND watch_folder_id IS NOT NULL")
    .all(soon) as { id: string; watch_folder_id: string }[];

  let renewed = 0;
  for (const { id, watch_folder_id } of expiring) {
    try {
      await watchFolder(id, watch_folder_id);
      renewed++;
    } catch (err) {
      console.error(`Failed to renew watch for integration ${id}:`, err);
    }
  }

  return renewed;
}

// ============================================================================
// Webhook Processing
// ============================================================================

/**
 * Google Drive webhook 수신 → 변경 파일 처리
 */
export async function processWebhook(channelId: string): Promise<{
  filesProcessed: number;
  eventsCreated: number;
}> {
  const db = getDB();

  const integration = db
    .prepare("SELECT * FROM integrations WHERE watch_channel_id = ? AND status = 'active'")
    .get(channelId) as Record<string, string> | undefined;

  if (!integration) {
    return { filesProcessed: 0, eventsCreated: 0 };
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  });

  // Token refresh 처리
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.access_token) {
      db.prepare('UPDATE integrations SET access_token = ?, updated_at = ? WHERE id = ?')
        .run(tokens.access_token, new Date().toISOString(), integration.id);
    }
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Changes API로 변경 파일 목록 조회
  let pageToken = integration.page_token;
  let filesProcessed = 0;
  let eventsCreated = 0;

  const changesResponse = await drive.changes.list({
    pageToken,
    includeItemsFromAllDrives: false,
    fields: 'nextPageToken,newStartPageToken,changes(fileId,file(id,name,mimeType,size,md5Checksum,parents,modifiedTime,lastModifyingUser))',
  });

  const changes = changesResponse.data.changes || [];

  for (const change of changes) {
    const file = change.file;
    if (!file || !file.id) continue;

    // 감시 폴더 내 파일인지 체크
    if (integration.watch_folder_id && file.parents && !file.parents.includes(integration.watch_folder_id)) {
      continue;
    }

    // Google Docs 등 export 불가능한 MIME 타입은 skip (나중에 확장)
    if (file.mimeType?.startsWith('application/vnd.google-apps.')) {
      continue;
    }

    try {
      await processFileChange(
        drive,
        file,
        integration.tenant_id,
        integration.chain_domain || 'default',
        integration.id,
      );
      filesProcessed++;
      eventsCreated++;
    } catch (err) {
      console.error(`Failed to process file ${file.id}:`, err);
    }
  }

  // page token 업데이트
  const newPageToken = changesResponse.data.newStartPageToken || changesResponse.data.nextPageToken;
  if (newPageToken) {
    db.prepare('UPDATE integrations SET page_token = ?, updated_at = ? WHERE id = ?')
      .run(newPageToken, new Date().toISOString(), integration.id);
  }

  return { filesProcessed, eventsCreated };
}

// ============================================================================
// File Change Processing
// ============================================================================

async function processFileChange(
  drive: drive_v3.Drive,
  file: drive_v3.Schema$File,
  tenantId: string,
  chainDomain: string,
  integrationId: string,
): Promise<void> {
  const db = getDB();
  const now = new Date().toISOString();

  // 파일 다운로드 (최대 50MB)
  const response = await drive.files.get(
    { fileId: file.id!, alt: 'media' },
    { responseType: 'arraybuffer' },
  );

  const buffer = Buffer.from(response.data as ArrayBuffer);
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

  // 중복 체크 (같은 해시 = 변경 없음)
  const duplicate = db
    .prepare('SELECT id FROM proof_files WHERE file_hash = ? AND tenant_id = ?')
    .get(fileHash, tenantId);

  if (duplicate) return; // 실제 변경 없음

  // 이전 버전 탐색
  const previousVersion = db
    .prepare('SELECT id, version_number, file_hash FROM proof_files WHERE filename = ? AND tenant_id = ? ORDER BY version_number DESC LIMIT 1')
    .get(file.name!, tenantId) as { id: string; version_number: number; file_hash: string } | undefined;

  const versionNumber = previousVersion ? previousVersion.version_number + 1 : 1;

  // 파일 저장
  const fileId = crypto.randomUUID();
  const ext = path.extname(file.name || '') || '';
  const tenantDir = path.join(UPLOAD_DIR, tenantId);
  if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });

  const storagePath = path.join(tenantId, `${fileId}${ext}`);
  fs.writeFileSync(path.join(UPLOAD_DIR, storagePath), buffer);

  // DPU 이벤트 생성
  const eventId = crypto.randomUUID();
  const decisionId = `dec_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const evidenceId = `evi_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  // 체인 해시
  const lastInChain = db
    .prepare('SELECT chain_hash, chain_index FROM decision_events WHERE chain_domain = ? AND tenant_id = ? ORDER BY chain_index DESC LIMIT 1')
    .get(chainDomain, tenantId) as { chain_hash: string; chain_index: number } | undefined;

  const previousHash = lastInChain?.chain_hash || null;
  const chainIndex = (lastInChain?.chain_index ?? -1) + 1;

  const chainHash = computeChainHash(
    { type: 'file_change', action_type: 'SYNC', actor_id: tenantId, file_hash: fileHash },
    previousHash,
    now,
  );

  const diffSummary = previousVersion
    ? JSON.stringify({
        previousHash: previousVersion.file_hash,
        currentHash: fileHash,
        versionChange: `v${previousVersion.version_number} → v${versionNumber}`,
      })
    : null;

  const actor = file.lastModifyingUser?.displayName || 'Google Drive User';
  const actorId = file.lastModifyingUser?.emailAddress || tenantId;

  const transaction = db.transaction(() => {
    // proof_files
    db.prepare(`
      INSERT INTO proof_files (
        id, tenant_id, decision_event_id,
        filename, mime_type, size_bytes, file_hash,
        parent_file_id, version_number, diff_summary,
        storage_path, storage_type,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', ?)
    `).run(
      fileId, tenantId, eventId,
      file.name, file.mimeType, buffer.length, fileHash,
      previousVersion?.id ?? null, versionNumber, diffSummary,
      storagePath, now,
    );

    // decision_events — source_type: harness (자동 연동)
    db.prepare(`
      INSERT INTO decision_events (
        id, decision_id, type, source_type, status,
        actor_id, actor_type, actor_name,
        action_type, action_description, action_metadata,
        evidence_id, evidence_level, chain_hash, chain_index, previous_hash, chain_domain,
        occurred_at, tags, metadata,
        tenant_id, created_at, updated_at
      ) VALUES (
        ?, ?, 'file_change', 'harness', 'recorded',
        ?, 'human', ?,
        'SYNC', ?, ?,
        ?, 'DRAFT', ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )
    `).run(
      eventId, decisionId,
      actorId, actor,
      `File synced from Google Drive: ${file.name}`,
      JSON.stringify({
        fileId,
        filename: file.name,
        fileHash,
        sizeBytes: buffer.length,
        mimeType: file.mimeType,
        version: versionNumber,
        source: 'google_drive',
        integrationId,
        driveFileId: file.id,
        modifiedTime: file.modifiedTime,
      }),
      evidenceId, chainHash, chainIndex, previousHash, chainDomain,
      file.modifiedTime || now,
      JSON.stringify(['file', 'sync', 'google-drive']),
      JSON.stringify({ domain: chainDomain, fileId, integrationId }),
      tenantId, now, now,
    );
  });

  transaction();
}

// ============================================================================
// Folder Listing (연결 후 폴더 선택 UI용)
// ============================================================================

export async function listFolders(integrationId: string): Promise<{
  folders: { id: string; name: string; path?: string }[];
}> {
  const db = getDB();
  const integration = db
    .prepare('SELECT * FROM integrations WHERE id = ?')
    .get(integrationId) as Record<string, string> | undefined;

  if (!integration) throw new Error('Integration not found');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id, name, parents)',
    pageSize: 100,
    orderBy: 'name',
  });

  return {
    folders: (response.data.files || []).map(f => ({
      id: f.id!,
      name: f.name!,
    })),
  };
}
