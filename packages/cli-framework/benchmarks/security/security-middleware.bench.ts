/**
 * Security middleware benchmarks
 *
 * Validates performance targets from review document:
 * - Input validation: <5ms
 * - Path validation: <3ms
 * - Secret detection: <10ms
 * - Total middleware overhead: <20ms
 * - Throughput: >500 validations/sec
 */

import { CommandSecurityMiddleware } from '../../src/security/SecurityMiddleware.js';
import type { CommandContext } from '../../src/types.js';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}

function benchmark(name: string, fn: () => Promise<void>, iterations: number = 1000): Promise<BenchmarkResult> {
  return new Promise(async (resolve) => {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      await fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await fn();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1_000_000); // Convert to ms
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1000 / avgTime;

    resolve({
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      throughput,
    });
  });
}

function printResult(result: BenchmarkResult, target?: number): void {
  const passed = target ? result.avgTime <= target : true;
  const status = passed ? '✓' : '✗';
  const targetStr = target ? ` (target: <${target}ms)` : '';

  console.log(`\n${status} ${result.name}${targetStr}`);
  console.log(`  Iterations: ${result.iterations}`);
  console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`);
  console.log(`  Average:    ${result.avgTime.toFixed(3)}ms`);
  console.log(`  Min:        ${result.minTime.toFixed(3)}ms`);
  console.log(`  Max:        ${result.maxTime.toFixed(3)}ms`);
  console.log(`  Throughput: ${result.throughput.toFixed(0)} validations/sec`);

  if (!passed && target) {
    console.log(`  ⚠️  FAILED: Average ${result.avgTime.toFixed(3)}ms exceeds target ${target}ms`);
  }
}

async function main() {
  console.log('Security Middleware Benchmarks');
  console.log('==============================\n');

  const middleware = new CommandSecurityMiddleware();

  // Benchmark 1: Input validation only
  const inputValidationResult = await benchmark(
    'Input Validation (safe command)',
    async () => {
      const context: CommandContext = {
        command: 'deploy',
        rawArgs: ['deploy', 'production', '--force'],
        env: {},
      };
      await middleware.validate(context);
    },
    1000
  );
  printResult(inputValidationResult, 5);

  // Benchmark 2: Path validation only
  const pathValidationResult = await benchmark(
    'Path Validation (local paths)',
    async () => {
      const context: CommandContext = {
        command: 'test',
        rawArgs: ['test', './src/index.ts', './src/lib.ts'],
        env: {},
      };
      await middleware.validate(context);
    },
    1000
  );
  printResult(pathValidationResult, 3);

  // Benchmark 3: Secret detection only
  const secretDetectionResult = await benchmark(
    'Secret Detection (no secrets)',
    async () => {
      const context: CommandContext = {
        command: 'deploy',
        rawArgs: ['deploy', 'to', 'production', 'environment'],
        env: {},
      };
      await middleware.validate(context);
    },
    1000
  );
  printResult(secretDetectionResult, 10);

  // Benchmark 4: Full validation (all checks)
  const fullValidationResult = await benchmark(
    'Full Validation (all checks enabled)',
    async () => {
      const context: CommandContext = {
        command: 'deploy',
        rawArgs: ['deploy', 'production', '--config=./config.json', '--force'],
        env: {},
      };
      await middleware.validate(context);
    },
    1000
  );
  printResult(fullValidationResult, 20);

  // Benchmark 5: Complex command with multiple paths
  const complexCommandResult = await benchmark(
    'Complex Command (multiple paths)',
    async () => {
      const context: CommandContext = {
        command: 'process',
        rawArgs: [
          'process',
          './src/file1.ts',
          './src/file2.ts',
          './src/file3.ts',
          '--output=./dist/bundle.js',
        ],
        env: {},
      };
      await middleware.validate(context);
    },
    1000
  );
  printResult(complexCommandResult, 20);

  // Benchmark 6: Sanitization
  const sanitizationResult = await benchmark(
    'Sanitization (with secrets)',
    async () => {
      const input = 'Deploy with key sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789 to production';
      middleware.sanitize(input);
    },
    1000
  );
  printResult(sanitizationResult, 5);

  // Summary
  console.log('\n\nSummary');
  console.log('=======\n');

  const results = [
    { name: 'Input Validation', result: inputValidationResult, target: 5 },
    { name: 'Path Validation', result: pathValidationResult, target: 3 },
    { name: 'Secret Detection', result: secretDetectionResult, target: 10 },
    { name: 'Full Validation', result: fullValidationResult, target: 20 },
    { name: 'Complex Command', result: complexCommandResult, target: 20 },
    { name: 'Sanitization', result: sanitizationResult, target: 5 },
  ];

  let passCount = 0;
  let failCount = 0;

  for (const { name, result, target } of results) {
    const passed = result.avgTime <= target;
    if (passed) {
      passCount++;
      console.log(`✓ ${name}: ${result.avgTime.toFixed(3)}ms (target: <${target}ms)`);
    } else {
      failCount++;
      console.log(`✗ ${name}: ${result.avgTime.toFixed(3)}ms (target: <${target}ms) FAILED`);
    }
  }

  console.log(`\nResults: ${passCount}/${results.length} passed`);

  // Throughput check
  const minThroughput = 500;
  if (fullValidationResult.throughput >= minThroughput) {
    console.log(`✓ Throughput: ${fullValidationResult.throughput.toFixed(0)} validations/sec (target: >${minThroughput})`);
  } else {
    console.log(`✗ Throughput: ${fullValidationResult.throughput.toFixed(0)} validations/sec (target: >${minThroughput}) FAILED`);
    failCount++;
  }

  // Exit with error if any benchmark failed
  if (failCount > 0) {
    console.error(`\n⚠️  ${failCount} benchmark(s) failed`);
    process.exit(1);
  } else {
    console.log('\n✓ All benchmarks passed');
  }
}

main().catch((error) => {
  console.error('Benchmark error:', error);
  process.exit(1);
});
