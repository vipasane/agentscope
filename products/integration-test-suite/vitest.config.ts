import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.bench.ts',
        '**/*.config.ts',
        'tests/fixtures/**',
        'src/scripts/**'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      }
    },

    // Parallel execution configuration
    threads: true,
    maxThreads: 4,
    minThreads: 2,

    // Reporter configuration
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/results.json'
    },

    // Retry configuration for flaky tests
    retry: 2,
    bail: 0
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  }
});
