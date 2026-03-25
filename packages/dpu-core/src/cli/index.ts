/**
 * Cronozen DPU CLI
 *
 * npx cronozen-dpu <command>
 *
 * Commands:
 *   init      - DPU 프로젝트 초기화 (dpu.config.yaml 생성)
 *   validate  - 로컬 DPU 데이터 유효성 검증
 *   hash      - 입력 데이터의 해시 계산
 *   version   - 패키지 버전 출력
 *
 * @version 0.1.0
 */

import { init } from './init';
import { validate } from './validate';
import { hash } from './hash-cmd';

const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
  console.log(`
  cronozen-dpu - Decision Proof Unit CLI

  Usage: cronozen-dpu <command> [options]

  Commands:
    init        Initialize DPU project (creates dpu.config.yaml)
    validate    Validate local DPU data against schema
    hash        Compute chain hash for given input
    version     Show package version

  Examples:
    cronozen-dpu init
    cronozen-dpu validate --file data.json
    cronozen-dpu hash --content '{"domain":"pharmacy"}'
  `);
}

async function main(): Promise<void> {
  switch (command) {
    case 'init':
      await init();
      break;

    case 'validate':
      await validate(args.slice(1));
      break;

    case 'hash':
      await hash(args.slice(1));
      break;

    case 'version':
    case '--version':
    case '-v':
      console.log('0.1.0');
      break;

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
