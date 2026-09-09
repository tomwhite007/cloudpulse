import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root,
  cacheDir: '../../node_modules/.vite/libs/api-contracts',
  test: {
    name: 'api-contracts',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/api-contracts',
      provider: 'v8' as const,
    },
  },
}));
