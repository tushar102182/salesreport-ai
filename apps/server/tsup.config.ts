import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', seed: 'src/cli/seed.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  // Bundle the workspace package; keep real npm dependencies external.
  noExternal: ['@salesreport/shared'],
});
