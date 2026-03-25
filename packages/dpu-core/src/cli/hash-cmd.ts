/**
 * cronozen-dpu hash
 *
 * 입력 데이터의 해시를 계산합니다.
 */

import { computeChainHash, computeContentHash } from '../hash';

export async function hash(args: string[]): Promise<void> {
  const contentFlag = args.indexOf('--content');
  const prevFlag = args.indexOf('--previous');
  const tsFlag = args.indexOf('--timestamp');

  if (contentFlag === -1 || !args[contentFlag + 1]) {
    console.log('Usage: cronozen-dpu hash --content <json> [--previous <hash>] [--timestamp <iso>]');
    console.log('');
    console.log('Examples:');
    console.log('  cronozen-dpu hash --content \'{"domain":"pharmacy","purpose":"invoice"}\'');
    console.log('  cronozen-dpu hash --content \'{"key":"value"}\' --previous abc123 --timestamp 2026-01-01T00:00:00Z');
    return;
  }

  const contentStr = args[contentFlag + 1];
  let content: Record<string, unknown>;

  try {
    content = JSON.parse(contentStr);
  } catch {
    // If not JSON, hash as plain string
    const plainHash = computeContentHash(contentStr);
    console.log(plainHash);
    return;
  }

  const previousHash = prevFlag !== -1 ? args[prevFlag + 1] || null : null;
  const timestamp = tsFlag !== -1 ? args[tsFlag + 1] : new Date().toISOString();

  const chainHash = computeChainHash(content, previousHash, timestamp);

  console.log(JSON.stringify({
    chain_hash: chainHash,
    previous_hash: previousHash,
    timestamp,
    content,
  }, null, 2));
}
