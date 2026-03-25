import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entries (CJS + ESM + DTS)
  {
    entry: {
      index: 'src/index.ts',
      adapter: 'src/adapter.ts',
      hash: 'src/hash.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
  },
  // CLI entry (CJS only, with banner for shebang)
  {
    entry: {
      'cli/index': 'src/cli/index.ts',
    },
    format: ['cjs'],
    splitting: false,
    sourcemap: false,
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
