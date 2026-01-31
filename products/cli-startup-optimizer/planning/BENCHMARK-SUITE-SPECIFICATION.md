# CLI Startup Performance Benchmark Suite Specification

**Version:** 1.0
**Date:** 2026-01-30
**Owner:** V3 Performance Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [Benchmark Categories](#benchmark-categories)
3. [Implementation Specifications](#implementation-specifications)
4. [Statistical Methodology](#statistical-methodology)
5. [Automation & CI/CD Integration](#automation--cicd-integration)
6. [Reporting & Visualization](#reporting--visualization)

---

## Overview

### Objectives

This benchmark suite provides comprehensive, statistically significant performance measurements for the CLI startup optimization project. It ensures:

1. **Accuracy:** 100+ iterations for statistical significance
2. **Reproducibility:** Consistent methodology across platforms
3. **Automation:** CI/CD integration for continuous validation
4. **Comprehensiveness:** Covers all optimization dimensions

### Success Criteria

| Metric | Baseline | Phase 2 Target | Phase 5 Target | Measurement |
|--------|----------|----------------|----------------|-------------|
| Cold Start (p95) | 1,549ms | <500ms | <250ms | 100 iterations, cleared cache |
| Warm Start (p95) | N/A | <300ms | <200ms | 100 iterations, primed cache |
| Memory Initial | 85MB | <50MB | <35MB | heapUsed at startup |
| Cache Hit Rate | 0% | >70% | >90% | After 50 commands |
| Bundle Size | 10MB | <8MB | <5MB | Minified + gzipped |

---

## Benchmark Categories

### 1. Cold Start Benchmark

**Purpose:** Measure CLI startup time with no caching

**Methodology:**
```typescript
async function benchmarkColdStart(iterations = 100): Promise<LatencyStats> {
  const measurements: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Clear all caches before each run
    await clearModuleCache();
    await clearAgentDBCache();
    await clearV8Cache();

    // Force new process for true cold start
    const startTime = performance.now();
    const result = await spawnCLIProcess(['--version'], {
      env: { ...process.env, NODE_OPTIONS: '--no-compilation-cache' }
    });
    const endTime = performance.now();

    measurements.push(endTime - startTime);

    // Wait for cleanup
    await sleep(100);
  }

  return calculateStats(measurements);
}
```

**Expected Results:**
- Baseline: p95 = 1,730ms, mean = 1,523ms
- Phase 2: p95 = 550ms, mean = 485ms
- Phase 5: p95 = 280ms, mean = 235ms

**Pass Criteria:**
- Phase 2: p95 < 550ms (10% buffer over 500ms)
- Phase 5: p95 < 275ms (10% buffer over 250ms)

---

### 2. Warm Start Benchmark

**Purpose:** Measure CLI startup time with warmed caches

**Methodology:**
```typescript
async function benchmarkWarmStart(iterations = 100): Promise<LatencyStats> {
  const measurements: number[] = [];

  // Prime caches
  for (let i = 0; i < 10; i++) {
    await spawnCLIProcess(['--version']);
  }

  // Wait for cache settling
  await sleep(1000);

  // Measure warm starts
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    await spawnCLIProcess(['--version']);
    const endTime = performance.now();

    measurements.push(endTime - startTime);
  }

  return calculateStats(measurements);
}
```

**Expected Results:**
- Phase 2: p95 = 300ms, mean = 270ms
- Phase 5: p95 = 200ms, mean = 180ms

**Pass Criteria:**
- Phase 2: p95 < 330ms
- Phase 5: p95 < 220ms

---

### 3. Common Commands Benchmark

**Purpose:** Measure real-world command performance

**Commands to Test:**
```typescript
const COMMON_COMMANDS = [
  { name: 'version', args: ['--version'], weight: 1.0 },
  { name: 'help', args: ['--help'], weight: 0.8 },
  { name: 'agent-spawn', args: ['agent', 'spawn', '-t', 'coder', '--dry-run'], weight: 0.7 },
  { name: 'swarm-status', args: ['swarm', 'status'], weight: 0.6 },
  { name: 'memory-search', args: ['memory', 'search', '--query', 'test'], weight: 0.5 },
  { name: 'hooks-list', args: ['hooks', 'list'], weight: 0.5 },
  { name: 'neural-status', args: ['neural', 'status'], weight: 0.3 }
];
```

**Methodology:**
```typescript
async function benchmarkCommonCommands(iterations = 50): Promise<Map<string, LatencyStats>> {
  const results = new Map<string, LatencyStats>();

  for (const command of COMMON_COMMANDS) {
    const measurements: number[] = [];

    // Prime cache for this command
    await spawnCLIProcess(command.args);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await spawnCLIProcess(command.args);
      const endTime = performance.now();

      measurements.push(endTime - startTime);
    }

    results.set(command.name, calculateStats(measurements));
  }

  return results;
}
```

**Expected Results (Phase 5):**
| Command | p95 Target | mean Target |
|---------|------------|-------------|
| version | 220ms | 200ms |
| help | 240ms | 220ms |
| agent-spawn | 300ms | 280ms |
| swarm-status | 280ms | 260ms |
| memory-search | 340ms | 320ms |

---

### 4. Memory Profile Benchmark

**Purpose:** Measure memory footprint throughout lifecycle

**Methodology:**
```typescript
async function benchmarkMemoryProfile(): Promise<MemoryProfile> {
  const profile: MemoryProfile = {
    timeline: [],
    peak: 0,
    average: 0,
    resident: 0
  };

  // Start CLI process
  const child = spawn('node', ['dist/cli.js', 'agent', 'spawn', '-t', 'coder', '--dry-run']);

  // Sample memory every 100ms for 10 seconds
  const interval = setInterval(() => {
    const memUsage = getProcessMemory(child.pid);

    profile.timeline.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });

    if (memUsage.heapUsed > profile.peak) {
      profile.peak = memUsage.heapUsed;
    }
  }, 100);

  // Wait for command completion
  await new Promise((resolve) => child.on('exit', resolve));
  clearInterval(interval);

  // Calculate averages
  profile.average = profile.timeline.reduce((sum, t) => sum + t.heapUsed, 0) / profile.timeline.length;
  profile.resident = profile.timeline[profile.timeline.length - 1].rss;

  return profile;
}
```

**Expected Results:**
- Phase 2: initial <50MB, peak <75MB, resident <60MB
- Phase 5: initial <35MB, peak <55MB, resident <45MB

**Pass Criteria:**
- Phase 2: initial ≤ 55MB (10% buffer)
- Phase 5: initial ≤ 38MB (10% buffer)

---

### 5. Cache Performance Benchmark

**Purpose:** Measure cache effectiveness over time

**Methodology:**
```typescript
async function benchmarkCachePerformance(commands = 100): Promise<CacheStats> {
  const stats: CacheStats = {
    hitRateOverTime: [],
    finalHitRate: 0,
    cacheSize: 0,
    averageMissLatency: 0,
    averageHitLatency: 0
  };

  let hits = 0;
  let misses = 0;
  const missLatencies: number[] = [];
  const hitLatencies: number[] = [];

  // Clear cache
  await spawnCLIProcess(['cache', 'clear']);

  // Run commands and track cache performance
  for (let i = 0; i < commands; i++) {
    const command = selectRandomCommand(); // Weighted random

    const startTime = performance.now();
    const result = await spawnCLIProcessWithMetrics(command);
    const endTime = performance.now();

    const latency = endTime - startTime;

    if (result.cacheHit) {
      hits++;
      hitLatencies.push(latency);
    } else {
      misses++;
      missLatencies.push(latency);
    }

    // Record hit rate at this point
    stats.hitRateOverTime.push({
      commandIndex: i + 1,
      hitRate: hits / (hits + misses)
    });
  }

  stats.finalHitRate = hits / (hits + misses);
  stats.averageHitLatency = hitLatencies.reduce((a, b) => a + b, 0) / hitLatencies.length;
  stats.averageMissLatency = missLatencies.reduce((a, b) => a + b, 0) / missLatencies.length;
  stats.cacheSize = await getCacheSize();

  return stats;
}
```

**Expected Results:**
- Phase 2: final hit rate >70%, cache size <12MB
- Phase 5: final hit rate >90%, cache size <8MB

**Pass Criteria:**
- Phase 2: hit rate ≥ 65% (buffer for variance)
- Phase 5: hit rate ≥ 85%

---

### 6. SONA Learning Benchmark

**Purpose:** Measure SONA preload prediction accuracy

**Methodology:**
```typescript
async function benchmarkSONALearning(sequences = 100): Promise<SONAStats> {
  const stats: SONAStats = {
    accuracyOverTime: [],
    finalAccuracy: 0,
    predictionLatency: 0,
    preloadHitRate: 0
  };

  let correctPredictions = 0;
  let totalPredictions = 0;
  let preloadHits = 0;
  let preloadAttempts = 0;
  const latencies: number[] = [];

  // Train SONA with initial data
  await trainSONAWithSampleData();

  // Run command sequences
  for (let i = 0; i < sequences; i++) {
    const sequence = generateCommandSequence(5); // 5 commands per sequence

    for (let j = 0; j < sequence.length - 1; j++) {
      const currentCommand = sequence[j];
      const nextCommand = sequence[j + 1];

      // Measure prediction time
      const startTime = performance.now();
      const predictions = await predictNextModules(currentCommand);
      const predictionTime = performance.now() - startTime;
      latencies.push(predictionTime);

      // Check if prediction was correct
      const modulesForNext = getModulesForCommand(nextCommand);
      const predicted = predictions.some(p => modulesForNext.includes(p));

      if (predicted) {
        correctPredictions++;
        preloadHits++;
      }
      totalPredictions++;
      preloadAttempts++;

      // Record accuracy at this point
      stats.accuracyOverTime.push({
        sequenceIndex: i * sequence.length + j,
        accuracy: correctPredictions / totalPredictions
      });

      // Learn from this transition
      await learnFromUsage(currentCommand, nextCommand);
    }
  }

  stats.finalAccuracy = correctPredictions / totalPredictions;
  stats.predictionLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  stats.preloadHitRate = preloadHits / preloadAttempts;

  return stats;
}
```

**Expected Results:**
- Accuracy converges to ~78% after 500-800 sequences
- Prediction latency <0.05ms (SONA target)
- Preload hit rate >85%

**Pass Criteria:**
- Final accuracy ≥ 70%
- Prediction latency < 0.10ms (2x buffer)
- Preload hit rate ≥ 80%

---

### 7. Cross-Platform Benchmark

**Purpose:** Ensure consistent performance across platforms

**Platforms to Test:**
- Linux (Ubuntu 22.04 LTS)
- macOS (Intel)
- macOS (Apple Silicon M1/M2)
- Windows 11

**Methodology:**
```typescript
async function benchmarkCrossPlatform(): Promise<Map<string, PlatformStats>> {
  const platforms = ['linux', 'macos-intel', 'macos-arm', 'windows'];
  const results = new Map<string, PlatformStats>();

  for (const platform of platforms) {
    const stats: PlatformStats = {
      platform,
      coldStart: await benchmarkColdStart(100),
      warmStart: await benchmarkWarmStart(100),
      memory: await benchmarkMemoryProfile(),
      cache: await benchmarkCachePerformance(50)
    };

    results.set(platform, stats);
  }

  // Calculate variance
  const baselineStats = results.get('linux')!;
  for (const [platform, stats] of results.entries()) {
    if (platform === 'linux') continue;

    stats.variance = {
      coldStart: (stats.coldStart.p95 - baselineStats.coldStart.p95) / baselineStats.coldStart.p95,
      warmStart: (stats.warmStart.p95 - baselineStats.warmStart.p95) / baselineStats.warmStart.p95,
      memory: (stats.memory.peak - baselineStats.memory.peak) / baselineStats.memory.peak
    };
  }

  return results;
}
```

**Expected Variance:** <10% across all platforms

**Pass Criteria:**
- All platforms: variance ≤ 12% (buffer for edge cases)
- No platform >15% slower than baseline

---

### 8. Bundle Size Benchmark

**Purpose:** Measure and validate bundle optimization

**Methodology:**
```typescript
async function benchmarkBundleSize(): Promise<BundleStats> {
  const stats: BundleStats = {
    total: 0,
    core: 0,
    commands: 0,
    dependencies: {},
    gzippedSize: 0,
    chunks: 0
  };

  // Build production bundle
  await execCommand('npm run build');

  // Analyze bundle
  const bundleFiles = await glob('dist/**/*.js');

  for (const file of bundleFiles) {
    const fileStats = await fs.stat(file);
    stats.total += fileStats.size;

    if (file.includes('/core/')) {
      stats.core += fileStats.size;
    } else if (file.includes('/commands/')) {
      stats.commands += fileStats.size;
    }

    stats.chunks++;
  }

  // Measure gzipped size
  for (const file of bundleFiles) {
    const gzipped = await gzipFile(file);
    stats.gzippedSize += gzipped.length;
  }

  // Analyze dependencies
  const manifest = await import('./dist/manifest.json');
  for (const [dep, size] of Object.entries(manifest.dependencies)) {
    stats.dependencies[dep] = size as number;
  }

  return stats;
}
```

**Expected Results:**
- Phase 2: total <8MB, gzipped <3MB
- Phase 5: total <5MB, gzipped <2MB

**Pass Criteria:**
- Phase 2: gzipped ≤ 3.5MB
- Phase 5: gzipped ≤ 2.2MB

---

### 9. Regression Benchmark

**Purpose:** Detect performance regressions in CI/CD

**Methodology:**
```typescript
async function benchmarkRegression(): Promise<RegressionReport> {
  // Load baseline metrics
  const baseline = await loadBaseline();

  // Run current benchmarks
  const current = {
    coldStart: await benchmarkColdStart(50), // Fewer iterations for CI
    warmStart: await benchmarkWarmStart(50),
    memory: await benchmarkMemoryProfile(),
    cache: await benchmarkCachePerformance(25)
  };

  // Compare against baseline
  const regressions: Regression[] = [];

  // Check cold start regression
  if (current.coldStart.p95 > baseline.coldStart.p95 * 1.10) {
    regressions.push({
      metric: 'coldStart.p95',
      baseline: baseline.coldStart.p95,
      current: current.coldStart.p95,
      regression: ((current.coldStart.p95 / baseline.coldStart.p95) - 1) * 100,
      severity: 'HIGH'
    });
  }

  // Check memory regression
  if (current.memory.peak > baseline.memory.peak * 1.15) {
    regressions.push({
      metric: 'memory.peak',
      baseline: baseline.memory.peak,
      current: current.memory.peak,
      regression: ((current.memory.peak / baseline.memory.peak) - 1) * 100,
      severity: 'MEDIUM'
    });
  }

  // Check cache hit rate regression
  if (current.cache.finalHitRate < baseline.cache.finalHitRate * 0.90) {
    regressions.push({
      metric: 'cache.hitRate',
      baseline: baseline.cache.finalHitRate,
      current: current.cache.finalHitRate,
      regression: (baseline.cache.finalHitRate - current.cache.finalHitRate) * 100,
      severity: 'LOW'
    });
  }

  return {
    passed: regressions.length === 0,
    regressions,
    current,
    baseline
  };
}
```

**Regression Thresholds:**
- Cold start p95: +10% = regression
- Memory peak: +15% = regression
- Cache hit rate: -10% = regression

**Actions:**
- HIGH severity: Block merge
- MEDIUM severity: Require review
- LOW severity: Warning only

---

## Implementation Specifications

### Benchmark Runner

```typescript
// src/benchmarks/runner.ts
export class BenchmarkRunner {
  private config: BenchmarkConfig;
  private results: BenchmarkResults;

  constructor(config: BenchmarkConfig) {
    this.config = config;
    this.results = {
      timestamp: Date.now(),
      platform: process.platform,
      nodeVersion: process.version,
      benchmarks: {}
    };
  }

  async runAll(): Promise<BenchmarkResults> {
    console.log('🚀 Starting CLI Performance Benchmark Suite');
    console.log(`Platform: ${this.results.platform}`);
    console.log(`Node: ${this.results.nodeVersion}\n`);

    // Run all benchmarks
    this.results.benchmarks.coldStart = await this.runWithProgress(
      'Cold Start',
      () => benchmarkColdStart(this.config.iterations)
    );

    this.results.benchmarks.warmStart = await this.runWithProgress(
      'Warm Start',
      () => benchmarkWarmStart(this.config.iterations)
    );

    this.results.benchmarks.commonCommands = await this.runWithProgress(
      'Common Commands',
      () => benchmarkCommonCommands(this.config.commandIterations)
    );

    this.results.benchmarks.memory = await this.runWithProgress(
      'Memory Profile',
      () => benchmarkMemoryProfile()
    );

    this.results.benchmarks.cache = await this.runWithProgress(
      'Cache Performance',
      () => benchmarkCachePerformance(this.config.cacheCommands)
    );

    if (this.config.enableSona) {
      this.results.benchmarks.sona = await this.runWithProgress(
        'SONA Learning',
        () => benchmarkSONALearning(this.config.sonaSequences)
      );
    }

    if (this.config.enableBundleAnalysis) {
      this.results.benchmarks.bundle = await this.runWithProgress(
        'Bundle Size',
        () => benchmarkBundleSize()
      );
    }

    // Generate summary
    this.results.summary = this.generateSummary();

    return this.results;
  }

  private async runWithProgress<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const spinner = ora(`Running ${name} benchmark...`).start();

    try {
      const result = await fn();
      spinner.succeed(`${name} benchmark complete`);
      return result;
    } catch (error) {
      spinner.fail(`${name} benchmark failed: ${error.message}`);
      throw error;
    }
  }

  private generateSummary(): BenchmarkSummary {
    const { benchmarks } = this.results;

    return {
      passed: this.checkAllTargets(),
      coldStartP95: benchmarks.coldStart?.p95,
      warmStartP95: benchmarks.warmStart?.p95,
      memoryInitial: benchmarks.memory?.timeline[0]?.heapUsed,
      cacheHitRate: benchmarks.cache?.finalHitRate,
      bundleSize: benchmarks.bundle?.gzippedSize,
      meetsTargets: {
        coldStart: benchmarks.coldStart?.p95 < 500,
        memory: benchmarks.memory?.timeline[0]?.heapUsed < 50 * 1024 * 1024,
        cache: benchmarks.cache?.finalHitRate > 0.80
      }
    };
  }

  async saveResults(outputPath: string): Promise<void> {
    await fs.writeFile(
      outputPath,
      JSON.stringify(this.results, null, 2)
    );

    console.log(`\n✅ Results saved to ${outputPath}`);
  }

  async generateReport(format: 'json' | 'html' | 'markdown'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(this.results, null, 2);
      case 'html':
        return generateHTMLReport(this.results);
      case 'markdown':
        return generateMarkdownReport(this.results);
    }
  }
}
```

### Configuration

```typescript
// benchmark.config.ts
export interface BenchmarkConfig {
  iterations: number;              // Cold/warm start iterations (default: 100)
  commandIterations: number;       // Per-command iterations (default: 50)
  cacheCommands: number;          // Commands for cache test (default: 100)
  sonaSequences: number;          // SONA learning sequences (default: 100)
  enableSona: boolean;            // Enable SONA benchmarks (default: true)
  enableBundleAnalysis: boolean;  // Enable bundle analysis (default: true)
  enableCrossPlatform: boolean;   // Enable cross-platform (default: false, CI only)
  outputDir: string;              // Output directory (default: './benchmarks/results')
  baselinePath?: string;          // Path to baseline for regression (optional)
}

export const DEFAULT_CONFIG: BenchmarkConfig = {
  iterations: 100,
  commandIterations: 50,
  cacheCommands: 100,
  sonaSequences: 100,
  enableSona: true,
  enableBundleAnalysis: true,
  enableCrossPlatform: false,
  outputDir: './benchmarks/results'
};

// CI-optimized config (faster, fewer iterations)
export const CI_CONFIG: BenchmarkConfig = {
  ...DEFAULT_CONFIG,
  iterations: 50,
  commandIterations: 25,
  cacheCommands: 50,
  sonaSequences: 50
};
```

---

## Statistical Methodology

### Sample Size Justification

**Why 100 iterations?**
- Achieves 95% confidence interval
- Standard deviation typically ~8% of mean
- Margin of error: ±2.5% at 95% confidence

**Calculation:**
```
n = (Z² × σ² / E²)
where:
  Z = 1.96 (95% confidence)
  σ = 0.08 × mean (estimated std dev)
  E = 0.025 × mean (target margin of error)

n ≈ 100 samples
```

### Outlier Detection

**Method:** Modified Z-score
```typescript
function removeOutliers(data: number[]): number[] {
  const median = calculateMedian(data);
  const mad = calculateMAD(data); // Median Absolute Deviation

  return data.filter(x => {
    const modifiedZScore = 0.6745 * (x - median) / mad;
    return Math.abs(modifiedZScore) < 3.5; // Remove extreme outliers
  });
}
```

### Statistical Metrics

```typescript
interface LatencyStats {
  mean: number;       // Average
  median: number;     // 50th percentile
  p90: number;        // 90th percentile
  p95: number;        // 95th percentile (PRIMARY METRIC)
  p99: number;        // 99th percentile
  min: number;        // Minimum value
  max: number;        // Maximum value
  stdDev: number;     // Standard deviation
  variance: number;   // Variance
  samples: number;    // Number of samples
  outliers: number;   // Removed outliers
}
```

---

## Automation & CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/performance-benchmark.yml
name: Performance Benchmark

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  benchmark-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build CLI
        run: npm run build

      - name: Run benchmarks
        run: npm run benchmark:ci

      - name: Check regression
        run: node scripts/check-regression.js

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-linux
          path: benchmarks/results/

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(
              fs.readFileSync('benchmarks/results/summary.json')
            );

            const comment = `
            ## 🚀 Performance Benchmark Results

            | Metric | Value | Target | Status |
            |--------|-------|--------|--------|
            | Cold Start (p95) | ${results.coldStartP95}ms | <500ms | ${results.coldStartP95 < 500 ? '✅' : '❌'} |
            | Warm Start (p95) | ${results.warmStartP95}ms | <300ms | ${results.warmStartP95 < 300 ? '✅' : '❌'} |
            | Memory Initial | ${(results.memoryInitial / 1024 / 1024).toFixed(1)}MB | <50MB | ${results.memoryInitial < 50 * 1024 * 1024 ? '✅' : '❌'} |
            | Cache Hit Rate | ${(results.cacheHitRate * 100).toFixed(1)}% | >80% | ${results.cacheHitRate > 0.80 ? '✅' : '❌'} |

            ${results.passed ? '✅ All targets met!' : '❌ Some targets missed'}

            [View full report](${results.reportUrl})
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

  benchmark-macos:
    runs-on: macos-latest
    # ... similar to linux

  benchmark-windows:
    runs-on: windows-latest
    # ... similar to linux
```

### NPM Scripts

```json
{
  "scripts": {
    "benchmark": "node benchmarks/run-all.js",
    "benchmark:ci": "node benchmarks/run-all.js --config ci",
    "benchmark:cold": "node benchmarks/run-cold-start.js",
    "benchmark:warm": "node benchmarks/run-warm-start.js",
    "benchmark:memory": "node benchmarks/run-memory.js",
    "benchmark:cache": "node benchmarks/run-cache.js",
    "benchmark:sona": "node benchmarks/run-sona.js",
    "benchmark:bundle": "node benchmarks/run-bundle.js",
    "benchmark:regression": "node benchmarks/check-regression.js",
    "benchmark:report": "node benchmarks/generate-report.js"
  }
}
```

---

## Reporting & Visualization

### Markdown Report Template

```markdown
# CLI Performance Benchmark Report

**Date:** {timestamp}
**Platform:** {platform}
**Node Version:** {nodeVersion}
**Commit:** {gitCommit}

## Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Cold Start (p95) | {coldStartP95}ms | <500ms | {status} |
| Warm Start (p95) | {warmStartP95}ms | <300ms | {status} |
| Memory Initial | {memoryInitial}MB | <50MB | {status} |
| Cache Hit Rate | {cacheHitRate}% | >80% | {status} |
| Bundle Size | {bundleSize}MB | <5MB | {status} |

## Detailed Results

### Cold Start Performance

```
Mean:    {mean}ms
Median:  {median}ms
p90:     {p90}ms
p95:     {p95}ms
p99:     {p99}ms
Std Dev: {stdDev}ms
```

### Latency Distribution

```
   p10 ████████████████░░░░░░░░░░░░░░░░░░░░ {p10}ms
   p25 ████████████████████░░░░░░░░░░░░░░░░ {p25}ms
   p50 ████████████████████████░░░░░░░░░░░░ {p50}ms
   p75 ██████████████████████████░░░░░░░░░░ {p75}ms
   p90 ████████████████████████████░░░░░░░░ {p90}ms
   p95 ██████████████████████████████░░░░░░ {p95}ms
   p99 ████████████████████████████████████ {p99}ms
```

[Additional sections for memory, cache, SONA, etc.]
```

### HTML Visualization

```html
<!DOCTYPE html>
<html>
<head>
  <title>CLI Performance Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>CLI Performance Benchmark Report</h1>

  <!-- Summary cards -->
  <div class="summary">
    <div class="card">
      <h3>Cold Start (p95)</h3>
      <div class="value">{coldStartP95}ms</div>
      <div class="target">Target: <500ms</div>
    </div>
    <!-- More cards... -->
  </div>

  <!-- Charts -->
  <canvas id="coldStartChart"></canvas>
  <canvas id="memoryChart"></canvas>
  <canvas id="cacheChart"></canvas>

  <script>
    // Render charts with Chart.js
    const coldStartData = {/* ... */};
    new Chart(document.getElementById('coldStartChart'), {
      type: 'line',
      data: coldStartData
    });
  </script>
</body>
</html>
```

---

## Appendix: Benchmark Execution

### Running Benchmarks Locally

```bash
# Full benchmark suite (100 iterations)
npm run benchmark

# Quick benchmark (50 iterations)
npm run benchmark -- --quick

# Specific benchmark
npm run benchmark:cold
npm run benchmark:warm
npm run benchmark:memory

# With custom config
npm run benchmark -- --config ./my-config.json

# Generate report only
npm run benchmark:report --format html
```

### CI Benchmark

```bash
# CI-optimized (faster, fewer iterations)
npm run benchmark:ci

# With regression check
npm run benchmark:ci && npm run benchmark:regression
```

### Cross-Platform Benchmark

```bash
# Run on all platforms (requires VMs/containers)
npm run benchmark:cross-platform
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-30
**Owner:** V3 Performance Engineering Team
**Status:** Ready for Implementation
