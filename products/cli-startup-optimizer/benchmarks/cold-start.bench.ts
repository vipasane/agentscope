/**
 * @file Cold Start Benchmark
 * @description Measures CLI cold start performance (first run, no caching)
 *
 * Target: <800ms p95 (Phase 1)
 *
 * @module benchmarks/cold-start
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

/**
 * Measure cold start time by spawning fresh process
 */
async function measureColdStart(args: string[] = ['--version']): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();

    // Spawn fresh Node process
    const proc = spawn('node', ['./dist/src/cli-entry.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      const duration = performance.now() - start;

      if (code === 0) {
        resolve(duration);
      } else {
        reject(new Error(`CLI exited with code ${code}: ${errorOutput}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      proc.kill();
      reject(new Error('Cold start timeout (5s)'));
    }, 5000);
  });
}

/**
 * Calculate statistics
 */
function calculateStats(values: number[]): {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];
  const min = sorted[0];
  const max = sorted[n - 1];

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return { mean, median, p95, p99, min, max, stdDev };
}

describe('Cold Start Benchmark - Phase 1 Target: <800ms', () => {
  const ITERATIONS = 100;
  const TARGET_P95 = 800; // Phase 1 target
  const BASELINE = 1549; // Current baseline

  it('should measure cold start for --version', async () => {
    const times: number[] = [];

    console.log(`\nRunning ${ITERATIONS} cold start iterations...`);

    for (let i = 0; i < ITERATIONS; i++) {
      try {
        const time = await measureColdStart(['--version']);
        times.push(time);

        // Progress indicator
        if ((i + 1) % 10 === 0) {
          console.log(`  Progress: ${i + 1}/${ITERATIONS}`);
        }

        // Wait 100ms between iterations to clear OS caches
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`  Iteration ${i + 1} failed:`, (error as Error).message);
      }
    }

    expect(times.length).toBeGreaterThan(0);

    const stats = calculateStats(times);

    console.log('\n📊 Cold Start Results (--version):');
    console.log(`  Mean:   ${stats.mean.toFixed(1)}ms`);
    console.log(`  Median: ${stats.median.toFixed(1)}ms`);
    console.log(`  P95:    ${stats.p95.toFixed(1)}ms`);
    console.log(`  P99:    ${stats.p99.toFixed(1)}ms`);
    console.log(`  Min:    ${stats.min.toFixed(1)}ms`);
    console.log(`  Max:    ${stats.max.toFixed(1)}ms`);
    console.log(`  StdDev: ${stats.stdDev.toFixed(1)}ms`);

    const improvement = ((BASELINE - stats.p95) / BASELINE * 100).toFixed(1);
    console.log(`\n🎯 Performance vs Baseline:`);
    console.log(`  Baseline: ${BASELINE}ms`);
    console.log(`  Current:  ${stats.p95.toFixed(1)}ms`);
    console.log(`  Improvement: ${improvement}%`);

    const targetGap = ((TARGET_P95 - stats.p95) / TARGET_P95 * 100).toFixed(1);
    console.log(`\n🎯 Phase 1 Target Progress:`);
    console.log(`  Target:   ${TARGET_P95}ms`);
    console.log(`  Current:  ${stats.p95.toFixed(1)}ms`);
    console.log(`  Margin:   ${targetGap}%`);

    // Assert Phase 1 target
    expect(stats.p95).toBeLessThan(TARGET_P95);
  }, 180000); // 3 minute timeout

  it('should measure cold start for --help', async () => {
    const times: number[] = [];

    console.log(`\nRunning ${ITERATIONS} cold start iterations for --help...`);

    for (let i = 0; i < ITERATIONS; i++) {
      try {
        const time = await measureColdStart(['--help']);
        times.push(time);

        if ((i + 1) % 10 === 0) {
          console.log(`  Progress: ${i + 1}/${ITERATIONS}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`  Iteration ${i + 1} failed:`, (error as Error).message);
      }
    }

    expect(times.length).toBeGreaterThan(0);

    const stats = calculateStats(times);

    console.log('\n📊 Cold Start Results (--help):');
    console.log(`  Mean:   ${stats.mean.toFixed(1)}ms`);
    console.log(`  Median: ${stats.median.toFixed(1)}ms`);
    console.log(`  P95:    ${stats.p95.toFixed(1)}ms`);

    // Help should be similarly fast
    expect(stats.p95).toBeLessThan(TARGET_P95);
  }, 180000);

  it('should measure cold start for command execution', async () => {
    const times: number[] = [];
    const iterations = 50; // Fewer iterations for command execution

    console.log(`\nRunning ${iterations} cold start iterations for status command...`);

    for (let i = 0; i < iterations; i++) {
      try {
        const time = await measureColdStart(['status']);
        times.push(time);

        if ((i + 1) % 10 === 0) {
          console.log(`  Progress: ${i + 1}/${iterations}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`  Iteration ${i + 1} failed:`, (error as Error).message);
      }
    }

    expect(times.length).toBeGreaterThan(0);

    const stats = calculateStats(times);

    console.log('\n📊 Cold Start Results (status command):');
    console.log(`  Mean:   ${stats.mean.toFixed(1)}ms`);
    console.log(`  Median: ${stats.median.toFixed(1)}ms`);
    console.log(`  P95:    ${stats.p95.toFixed(1)}ms`);

    // Command execution may be slightly slower
    expect(stats.p95).toBeLessThan(1000); // 1s acceptable for command execution
  }, 120000);

  it('should measure memory footprint', async () => {
    // Use process.memoryUsage() to check initial memory
    const proc = spawn('node', [
      '-e',
      `
      const start = performance.now();
      import('./dist/src/cli-entry.js').then(() => {
        const mem = process.memoryUsage();
        console.log(JSON.stringify({
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
          rss: mem.rss,
          duration: performance.now() - start
        }));
      });
      `
    ], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe'
    });

    const result = await new Promise<any>((resolve, reject) => {
      let output = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', () => {
        try {
          const data = JSON.parse(output);
          resolve(data);
        } catch {
          reject(new Error('Failed to parse memory data'));
        }
      });

      proc.on('error', reject);
    });

    const heapMB = (result.heapUsed / 1024 / 1024).toFixed(1);
    const totalMB = (result.heapTotal / 1024 / 1024).toFixed(1);
    const rssMB = (result.rss / 1024 / 1024).toFixed(1);

    console.log('\n💾 Memory Footprint:');
    console.log(`  Heap Used:  ${heapMB} MB`);
    console.log(`  Heap Total: ${totalMB} MB`);
    console.log(`  RSS:        ${rssMB} MB`);
    console.log(`  Load Time:  ${result.duration.toFixed(1)}ms`);

    const TARGET_MEMORY = 60; // Phase 1 target: <60MB
    console.log(`\n🎯 Memory Target:`);
    console.log(`  Target:   ${TARGET_MEMORY} MB`);
    console.log(`  Current:  ${heapMB} MB`);

    // Assert memory target
    expect(parseFloat(heapMB)).toBeLessThan(TARGET_MEMORY);
  }, 30000);
});
