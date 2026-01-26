import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/**/*.ts'
      ],
      lines: 95,
      functions: 95,
      branches: 95,
      statements: 95
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
