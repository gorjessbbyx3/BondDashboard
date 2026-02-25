import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'client/src/**/*.test.ts',
      'client/src/**/*.test.tsx',
    ],
    setupFiles: ['./client/src/test/setup.ts'],
    testTimeout: 10000,
    css: false,
  },
});
