import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'benchmarks/**/*.bench.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['tests/**', 'benchmarks/**', 'dist/**']
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
