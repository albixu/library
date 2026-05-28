import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import path from 'path';

export default defineConfig({
  plugins: [angular({ jit: false, inlineStylesExtension: 'css', tsconfig: 'tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup-angular.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/app/core'),
      '@catalog': path.resolve(__dirname, 'src/app/catalog'),
      '@kindle': path.resolve(__dirname, 'src/app/kindle'),
      '@shared': path.resolve(__dirname, 'src/app/shared'),
      '@layout': path.resolve(__dirname, 'src/app/layout'),
    },
  },
});
