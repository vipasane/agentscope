import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Disable file parallelism to avoid race conditions with temp fixtures
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'benchmarks/',
        'tests/',
        '.claude/',
        '*.config.ts',
        'src/cli/**', // CLI not yet implemented
        'src/model/**', // Re-exported types
        'src/utils/**', // Utilities not core to scope
        'src/index.ts', // Entry point only
        '**/types.ts', // TypeScript type definitions only
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      reporters: ['default'],
    },
  },
});
