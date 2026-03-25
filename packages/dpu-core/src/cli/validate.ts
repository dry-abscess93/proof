/**
 * cronozen-dpu validate
 *
 * 로컬 DPU 데이터를 스키마 기준으로 검증합니다.
 */

import { readFileSync } from 'fs';
import { EvidenceLevel } from '@cronozen/dp-schema-public';
import { computeChainHash } from '../hash';

export async function validate(args: string[]): Promise<void> {
  const fileFlag = args.indexOf('--file');
  if (fileFlag === -1 || !args[fileFlag + 1]) {
    console.log('Usage: cronozen-dpu validate --file <path.json>');
    console.log('');
    console.log('Validates a JSON file against DPU schema rules:');
    console.log('  - Required fields check (domain, purpose, final_action, final_responsible)');
    console.log('  - Evidence level validity');
    console.log('  - Hash chain integrity (if chain fields present)');
    return;
  }

  const filePath = args[fileFlag + 1];

  let data: Record<string, unknown>;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read/parse ${filePath}: ${(err as Error).message}`);
    process.exit(1);
  }

  const errors: string[] = [];

  // Required fields
  const requiredFields = ['domain', 'purpose', 'final_action', 'final_responsible'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Evidence level
  const evidenceLevel = data.evidence_level as string | undefined;
  if (evidenceLevel) {
    const validLevels = Object.values(EvidenceLevel);
    if (!validLevels.includes(evidenceLevel as EvidenceLevel)) {
      errors.push(`Invalid evidence_level: ${evidenceLevel}. Valid: ${validLevels.join(', ')}`);
    }
  }

  // Hash chain integrity
  if (data.chain_hash && data.executed_at) {
    const chainContent = {
      domain: data.domain as string,
      purpose: data.purpose as string,
      final_action: data.final_action as string,
      final_responsible: data.final_responsible as string,
    };
    const recomputed = computeChainHash(
      chainContent,
      (data.previous_hash as string) ?? null,
      data.executed_at as string
    );
    if (recomputed !== data.chain_hash) {
      errors.push(`Hash mismatch: expected ${recomputed}, got ${data.chain_hash}`);
    } else {
      console.log('  [PASS] Chain hash verified');
    }
  }

  if (errors.length === 0) {
    console.log(`Validation PASSED for ${filePath}`);
    console.log(`  Domain: ${data.domain}`);
    console.log(`  Evidence: ${data.evidence_level || 'not set'}`);
    if (data.chain_index !== undefined) {
      console.log(`  Chain index: ${data.chain_index}`);
    }
  } else {
    console.error(`Validation FAILED for ${filePath}:`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}
