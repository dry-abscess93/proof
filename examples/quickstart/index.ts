/**
 * Cronozen Proof — Quick Start Example
 *
 * This example demonstrates:
 * 1. Recording an AI decision
 * 2. Verifying its cryptographic integrity
 * 3. Exporting as JSON-LD evidence
 *
 * Prerequisites:
 *   npm install cronozen
 *
 * Usage:
 *   CRONOZEN_API_KEY=your-key npx tsx index.ts
 */

import { Cronozen } from 'cronozen';

const client = new Cronozen({
  apiKey: process.env.CRONOZEN_API_KEY!,
  // baseUrl: 'https://api.cronozen.com',  // default
});

async function main() {
  // 1. Record an AI decision
  console.log('Recording AI decision...');
  const decision = await client.decisions.record({
    domain: 'quickstart-demo',
    purpose: 'AI classified support ticket #42 as high priority',
    finalAction: 'Routed to senior support team',
    evidenceLevel: 'DOCUMENTED',
    tags: ['support', 'classification', 'demo'],
  });
  console.log(`Recorded: ${decision.id}`);

  // 2. Verify integrity
  console.log('\nVerifying integrity...');
  const verification = await client.decisions.verify(decision.id);
  console.log(`Hash valid: ${verification.integrity.hash_valid}`);
  console.log(`Algorithm: ${verification.integrity.algorithm}`);

  // 3. Export as evidence
  console.log('\nExporting JSON-LD evidence...');
  const evidence = await client.evidence.export(decision.id);
  console.log(JSON.stringify(evidence, null, 2));

  console.log('\nDone! Visit https://cronozen.com/proof to learn more.');
}

main().catch(console.error);
