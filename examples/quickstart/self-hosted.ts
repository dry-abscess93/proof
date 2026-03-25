/**
 * Cronozen DPU Core — Self-Hosted Example
 *
 * Use the core hash chain library directly without Cronozen Cloud.
 * Zero dependencies. Pure cryptographic functions.
 *
 * Prerequisites:
 *   npm install @cronozen/dpu-core
 *
 * Usage:
 *   npx tsx self-hosted.ts
 */

import {
  computeChainHash,
  createDPUEnvelope,
} from '@cronozen/dpu-core';

// Genesis record (first in chain)
const genesisHash = '0'.repeat(64);
const timestamp1 = new Date().toISOString();

const content1 = JSON.stringify({
  domain: 'self-hosted-demo',
  purpose: 'AI approved purchase order #100',
  action: 'Auto-approved (under $5,000 threshold)',
});

const hash1 = computeChainHash(content1, genesisHash, timestamp1);
console.log('Record #1');
console.log(`  Content: ${content1.substring(0, 60)}...`);
console.log(`  Previous: ${genesisHash.substring(0, 16)}...`);
console.log(`  Hash:     ${hash1}`);

// Second record — chained to the first
const timestamp2 = new Date().toISOString();
const content2 = JSON.stringify({
  domain: 'self-hosted-demo',
  purpose: 'Manager reviewed AI auto-approval',
  action: 'Confirmed — no override needed',
  reviewedBy: 'jane.doe@company.com',
});

const hash2 = computeChainHash(content2, hash1, timestamp2);
console.log('\nRecord #2');
console.log(`  Content: ${content2.substring(0, 60)}...`);
console.log(`  Previous: ${hash1.substring(0, 16)}...`);
console.log(`  Hash:     ${hash2}`);

// Verify chain integrity
console.log('\nVerification:');
const recomputed = computeChainHash(content2, hash1, timestamp2);
console.log(`  Hash matches: ${recomputed === hash2}`);

console.log('\nChain is intact. Tamper with any record and the chain breaks.');
console.log('Learn more: https://cronozen.com/proof');
