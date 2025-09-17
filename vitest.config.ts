import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'out/',
        'coverage/',
        '*.config.*',
        '**/types/**',
        '**/*.d.ts',
        '**/mockData/**',
        '**/__mocks__/**',
      ],
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'out', 'dist', 'build', 'playwright'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/components': resolve(__dirname, './components'),
      '@/lib': resolve(__dirname, './lib'),
      '@/app': resolve(__dirname, './app'),
      '@/styles': resolve(__dirname, './styles'),
      '@/config': resolve(__dirname, './config'),
      '@/schemas': resolve(__dirname, './schemas'),
      '@/server': resolve(__dirname, './server'),
      '@/hooks': resolve(__dirname, './hooks'),
      '@/types': resolve(__dirname, './types'),
      '@/utils': resolve(__dirname, './lib/utils'),
      '@/data': resolve(__dirname, './data'),
    },
  },
});