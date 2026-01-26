import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', 'dist/', 'examples/**', 'src/**/index.ts', 'src/types/error-context.ts'],
      lines: 85,
      functions: 90,
      branches: 80,
      statements: 85,
    },
  },
});
