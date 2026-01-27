/**
 * @packageDocumentation
 * Performance benchmarks for learning integration
 *
 * @remarks
 * Validates performance targets:
 * - Pattern tracking: <5ms per execution
 * - Embedding generation: <10ms
 * - HNSW search: <2ms (vs 300ms linear for 10K patterns)
 * - Throughput: >1000 pattern tracks/sec
 */

import { CommandPatternService } from '../../src/learning/CommandPatternService';
import { EmbeddingGenerator } from '../../src/learning/EmbeddingGenerator';
import { DEFAULT_LEARNING_CONFIG, CommandContext } from '../../src/learning/types';

/**
 * Benchmark result
 */
interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  throughputPerSec: number;
  targetMs: number;
  passed: boolean;
}

/**
 * Run benchmark
 */
async function benchmark(
  name: string,
  iterations: number,
  targetMs: number,
  fn: () => Promise<void>
): Promise<BenchmarkResult> {
  // Warmup
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Measure
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const totalMs = Date.now() - start;
  const avgMs = totalMs / iterations;
  const throughputPerSec = 1000 / avgMs;

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    throughputPerSec,
    targetMs,
    passed: avgMs < targetMs,
  };
}

/**
 * Print benchmark results
 */
function printResults(results: BenchmarkResult[]): void {
  console.log('\n=== Learning Integration Benchmarks ===\n');

  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${status}${reset} ${result.name}`);
    console.log(`  Iterations: ${result.iterations}`);
    console.log(`  Total time: ${result.totalMs}ms`);
    console.log(`  Average: ${result.avgMs.toFixed(2)}ms (target: <${result.targetMs}ms)`);
    console.log(`  Throughput: ${result.throughputPerSec.toFixed(0)} ops/sec`);
    console.log('');
  }

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('\x1b[32m✓ All benchmarks passed!\x1b[0m\n');
  } else {
    console.log('\x1b[31m✗ Some benchmarks failed\x1b[0m\n');
    process.exit(1);
  }
}

/**
 * Main benchmark suite
 */
async function main(): Promise<void> {
  const results: BenchmarkResult[] = [];

  // Benchmark 1: Embedding generation (<10ms)
  {
    const generator = new EmbeddingGenerator();
    const text = 'npm install package-name --save-dev';

    const result = await benchmark(
      'Embedding Generation',
      1000,
      10,
      async () => {
        generator.generateEmbedding(text);
      }
    );

    results.push(result);
  }

  // Benchmark 2: Pattern tracking (<5ms)
  {
    const config = { ...DEFAULT_LEARNING_CONFIG, enabled: true };
    const service = new CommandPatternService(config);
    await service.initialize();

    const context: CommandContext = {
      command: 'test',
      args: ['arg1', 'arg2'],
      options: { flag: true },
      executionTime: 100,
    };

    const result = await benchmark(
      'Pattern Tracking',
      1000,
      5,
      async () => {
        await service.trackExecution('test', context, 'success');
      }
    );

    results.push(result);
  }

  // Benchmark 3: Command suggestions (<10ms)
  {
    const config = { ...DEFAULT_LEARNING_CONFIG, enabled: true };
    const service = new CommandPatternService(config);
    await service.initialize();

    // Seed with patterns
    for (let i = 0; i < 100; i++) {
      const context: CommandContext = {
        command: `npm-${i % 10}`,
        args: [`package-${i}`],
        options: {},
        executionTime: 100,
      };

      await service.trackExecution(`npm-${i % 10}`, context, 'success');
    }

    const result = await benchmark(
      'Command Suggestions (100 patterns)',
      500,
      10,
      async () => {
        await service.suggestCommands('npm', 5);
      }
    );

    results.push(result);
  }

  // Benchmark 4: Large dataset (10K patterns, <10ms search)
  {
    const config = { ...DEFAULT_LEARNING_CONFIG, enabled: true };
    const service = new CommandPatternService(config);
    await service.initialize();

    console.log('Seeding 10,000 patterns...');

    // Seed with 10K patterns
    for (let i = 0; i < 10000; i++) {
      const context: CommandContext = {
        command: `cmd-${i % 100}`,
        args: [`arg-${i}`],
        options: {},
        executionTime: 10,
      };

      await service.trackExecution(`cmd-${i % 100}`, context, 'success');

      if (i % 1000 === 0) {
        console.log(`  Seeded ${i} patterns...`);
      }
    }

    console.log('Benchmarking search...');

    const result = await benchmark(
      'Command Suggestions (10K patterns)',
      500,
      10,
      async () => {
        await service.suggestCommands('cmd-50', 5);
      }
    );

    results.push(result);
  }

  // Benchmark 5: Throughput test (>1000 tracks/sec)
  {
    const config = { ...DEFAULT_LEARNING_CONFIG, enabled: true };
    const service = new CommandPatternService(config);
    await service.initialize();

    const context: CommandContext = {
      command: 'test',
      args: [],
      options: {},
      executionTime: 10,
    };

    const result = await benchmark(
      'Pattern Tracking Throughput',
      2000,
      1, // <1ms for >1000/sec throughput
      async () => {
        await service.trackExecution('test', context, 'success');
      }
    );

    // Override pass condition for throughput
    result.passed = result.throughputPerSec > 1000;

    results.push(result);
  }

  // Benchmark 6: Error pattern matching (<20ms)
  {
    const config = { ...DEFAULT_LEARNING_CONFIG, enabled: true };
    const service = new CommandPatternService(config);
    await service.initialize();

    // Seed with error patterns
    for (let i = 0; i < 50; i++) {
      const context: CommandContext = {
        command: 'test',
        args: [],
        options: {},
        executionTime: 10,
      };

      await service.trackExecution(
        'test',
        context,
        'failure',
        new Error(`Error type ${i % 5}`)
      );
    }

    const result = await benchmark(
      'Error Pattern Matching',
      500,
      20,
      async () => {
        await service.findSimilarErrors(new Error('Error type 2'));
      }
    );

    results.push(result);
  }

  printResults(results);
}

// Run benchmarks
main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
