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
      '@cloudpulse/api-contracts': resolve(
        root,
        '../../libs/api-contracts/src/index.ts',
      ),
    },
  },
  test: {
    name: 'web-portal',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,app,pages,specs}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web-portal',
      provider: 'v8' as const,
    },
  },
}));
