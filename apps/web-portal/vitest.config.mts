import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root,
  cacheDir: '../../node_modules/.vite/apps/web-portal',
  plugins: [react()],
  resolve: {
    alias: {
      '@': root,
      '@cloudpulse/api-contracts/mocks': resolve(
        root,
        '../../libs/api-contracts/src/mocks/index.ts',
      ),
      '@cloudpulse/api-contracts': resolve(
        root,
        '../../libs/api-contracts/src/index.ts',
      ),
      '@cloudpulse/gitflow/mocks': resolve(
        root,
        '../../libs/gitflow/src/mocks/index.ts',
      ),
      '@cloudpulse/gitflow': resolve(root, '../../libs/gitflow/src/index.ts'),
    },
  },
  test: {
    name: 'web-portal',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: [
      '{src,app,pages,specs,lib,features}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web-portal',
      provider: 'v8' as const,
      include: [
        'features/dashboard/utils/**/*.ts',
        'features/dashboard/mocks/**/*.ts',
        'lib/env.ts',
      ],
      thresholds: {
        'features/dashboard/utils/**/*.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        'features/dashboard/mocks/**/*.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
}));
