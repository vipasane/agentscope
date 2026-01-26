/**
 * Benchmark runner for performance testing
 * @module @claude-flow/performance/monitor
 */

import { BenchmarkResult, BenchmarkSuite } from '../types';

export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  timeout?: number;
  async?: boolean;
}

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark
   */
  async bench(
    name: string,
    fn: () => void | Promise<void>,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const iterations = options.iterations || 1000;
    const warmupIterations = options.warmupIterations || 100;
    const timeout = options.timeout || 60000;

    console.log(`\nRunning benchmark: ${name}`);
    console.log(`  Warmup: ${warmupIterations} iterations`);
    console.log(`  Iterations: ${iterations}`);

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    // Collect timings
    const timings: number[] = [];
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Benchmark timeout after ${timeout}ms`);
      }

      const start = performance.now();
      await fn();
      const duration = performance.now() - start;
      timings.push(duration);
    }

    // Calculate statistics
    const sorted = timings.sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avgLatency = sum / sorted.length;
    const p50 = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);
    const minLatency = sorted[0];
    const maxLatency = sorted[sorted.length - 1];
    const opsPerSecond = 1000 / avgLatency;

    const result: BenchmarkResult = {
      name,
      iterations,
      avgLatency,
      p50,
      p95,
      p99,
      minLatency,
      maxLatency,
      opsPerSecond,
      timestamp: Date.now()
    };

    this.results.push(result);
    this.printResult(result);

    return result;
  }

  /**
   * Compare two functions
   */
  async compare(
    name1: string,
    fn1: () => void | Promise<void>,
    name2: string,
    fn2: () => void | Promise<void>,
    options: BenchmarkOptions = {}
  ): Promise<{
    baseline: BenchmarkResult;
    comparison: BenchmarkResult;
    speedup: number;
  }> {
    console.log(`\n=== Comparing: ${name1} vs ${name2} ===`);

    const baseline = await this.bench(name1, fn1, options);
    const comparison = await this.bench(name2, fn2, options);

    const speedup = baseline.avgLatency / comparison.avgLatency;

    console.log(`\nResult: ${name2} is ${speedup.toFixed(2)}x faster than ${name1}`);

    return { baseline, comparison, speedup };
  }

  /**
   * Run a suite of benchmarks
   */
  async suite(
    name: string,
    benchmarks: Array<{
      name: string;
      fn: () => void | Promise<void>;
      options?: BenchmarkOptions;
    }>
  ): Promise<BenchmarkSuite> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Benchmark Suite: ${name}`);
    console.log('='.repeat(60));

    const suiteStartTime = Date.now();
    const results: BenchmarkResult[] = [];

    for (const bench of benchmarks) {
      const result = await this.bench(bench.name, bench.fn, bench.options);
      results.push(result);
    }

    const totalTime = Date.now() - suiteStartTime;
    const avgLatency =
      results.reduce((acc, r) => acc + r.avgLatency, 0) / results.length;

    const suite: BenchmarkSuite = {
      name,
      results,
      summary: {
        totalTests: benchmarks.length,
        totalTime,
        avgLatency
      }
    };

    this.printSuiteSummary(suite);

    return suite;
  }

  /**
   * Get all results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Clear results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Export results as JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        results: this.results,
        timestamp: Date.now()
      },
      null,
      2
    );
  }

  /**
   * Export results as CSV
   */
  exportCSV(): string {
    const headers = [
      'name',
      'iterations',
      'avgLatency',
      'p50',
      'p95',
      'p99',
      'minLatency',
      'maxLatency',
      'opsPerSecond'
    ];

    const rows = this.results.map(r => [
      r.name,
      r.iterations,
      r.avgLatency.toFixed(3),
      r.p50.toFixed(3),
      r.p95.toFixed(3),
      r.p99.toFixed(3),
      r.minLatency.toFixed(3),
      r.maxLatency.toFixed(3),
      r.opsPerSecond.toFixed(0)
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // Private methods

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private printResult(result: BenchmarkResult): void {
    console.log(`\n  Results:`);
    console.log(`    Iterations: ${result.iterations}`);
    console.log(`    Avg Latency: ${result.avgLatency.toFixed(3)}ms`);
    console.log(`    P50: ${result.p50.toFixed(3)}ms`);
    console.log(`    P95: ${result.p95.toFixed(3)}ms`);
    console.log(`    P99: ${result.p99.toFixed(3)}ms`);
    console.log(`    Min: ${result.minLatency.toFixed(3)}ms`);
    console.log(`    Max: ${result.maxLatency.toFixed(3)}ms`);
    console.log(`    Ops/sec: ${result.opsPerSecond.toFixed(0)}`);
  }

  private printSuiteSummary(suite: BenchmarkSuite): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Suite Summary');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${suite.summary.totalTests}`);
    console.log(`Total Time: ${(suite.summary.totalTime / 1000).toFixed(2)}s`);
    console.log(`Avg Latency: ${suite.summary.avgLatency.toFixed(3)}ms`);
    console.log('');

    // Find fastest and slowest
    const sorted = [...suite.results].sort((a, b) => a.avgLatency - b.avgLatency);
    console.log(`Fastest: ${sorted[0].name} (${sorted[0].avgLatency.toFixed(3)}ms)`);
    console.log(
      `Slowest: ${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].avgLatency.toFixed(3)}ms)`
    );
    console.log('='.repeat(60));
  }
}
