import { defineConfig } from 'vite';
import path from 'path';

// Browser tests run against the dev server (the harness is dev-only); keep their pages stable.
const e2e = process.env.SPACE_EXPLORER_E2E === '1';

export default defineConfig({
  server: e2e ? { hmr: false, watch: null } : undefined,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }

          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
