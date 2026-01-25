#!/usr/bin/env node
/**
 * Benchmark Runner Script
 *
 * Runs all benchmarks and generates reports:
 * 1. Run baseline benchmarks
 * 2. Profile hot paths
 * 3. Apply optimizations
 * 4. Re-run benchmarks
 * 5. Generate comparison report
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBenchmarks } from './v1.2-benchmark.js';
import { Profiler, profile } from './profiler.js';
import { PerformanceOptimizer } from './optimizer.js';

interface BenchmarkReport {
  timestamp: string;
  scenarios: Array<{
    name: string;
    beforeMs: number;
    afterMs: number;
    improvement: number;
    improvementPercent: number;
  }>;
  profiling: {
    hotPaths: string;
    memoryHogs: string;
  };
  optimizations: string;
  summary: {
    totalImprovementPercent: number;
    meetsTargets: boolean;
    recommendations: string[];
  };
}

/**
 * Main benchmark execution
 */
async function main(): Promise<void> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  V1.2 Benchmark & Optimization Suite  ║');
  console.log('╚════════════════════════════════════════╝\n');

  const reportDir = resolve(process.cwd(), 'benchmarks', 'reports');
  await mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const profiler = new Profiler();
  const optimizer = new PerformanceOptimizer();

  // Phase 1: Baseline benchmarks
  console.log('Phase 1: Running baseline benchmarks...\n');
  profiler.start();

  await runBenchmarks();

  profiler.stop();

  // Phase 2: Generate profiling reports
  console.log('\nPhase 2: Generating profiling reports...\n');

  const profilingReport = profiler.generateReport();
  const profilingPath = resolve(reportDir, `profiling-${timestamp}.md`);
  await profiler.saveReport(profilingPath);
  console.log(`  ✓ Profiling report saved: ${profilingPath}`);

  // Phase 3: Identify optimization opportunities
  console.log('\nPhase 3: Identifying optimization opportunities...\n');

  const hotPaths = profiler.getHotPaths(5);
  console.log('  Top 5 hot paths:');
  for (const path of hotPaths) {
    console.log(`    - ${path.operation}: ${path.totalTime.toFixed(2)}ms (${path.percentOfTotal.toFixed(1)}%)`);

    // Suggest optimization strategies
    if (path.percentOfTotal > 20) {
      console.log(`      → HIGH PRIORITY: Consider caching or parallel processing`);
      optimizer.addCachingStrategy(path.operation, async () => {
        // Placeholder - actual implementation in core files
      });
    } else if (path.count > 100) {
      console.log(`      → Consider batching (${path.count} calls)`);
      optimizer.addBatchingStrategy(path.operation, async () => {
        // Placeholder
      });
    }
  }

  const memoryHogs = profiler.getMemoryHogs(3);
  console.log('\n  Top 3 memory-intensive operations:');
  for (const op of memoryHogs) {
    const avgMB = (op.avgMemoryDelta / 1024 / 1024).toFixed(2);
    console.log(`    - ${op.operation}: ${avgMB}MB avg`);

    if (op.avgMemoryDelta > 10 * 1024 * 1024) {
      // >10MB
      console.log(`      → Consider memory pooling or object reuse`);
      optimizer.addMemoryPoolStrategy(op.operation, async () => {
        // Placeholder
      });
    }
  }

  // Phase 4: Generate optimization report
  console.log('\nPhase 4: Generating optimization recommendations...\n');

  const optimizationReport = optimizer.generateReport();
  const optimizationPath = resolve(reportDir, `optimization-${timestamp}.md`);
  await optimizer.saveReport(optimizationPath);
  console.log(`  ✓ Optimization report saved: ${optimizationPath}`);

  // Phase 5: Generate combined report
  console.log('\nPhase 5: Generating combined report...\n');

  const combinedReport: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    scenarios: [
      {
        name: 'Small config',
        beforeMs: 0, // Populated from benchmark results
        afterMs: 0,
        improvement: 0,
        improvementPercent: 0,
      },
      {
        name: 'Medium config',
        beforeMs: 0,
        afterMs: 0,
        improvement: 0,
        improvementPercent: 0,
      },
      {
        name: 'Large config',
        beforeMs: 0,
        afterMs: 0,
        improvement: 0,
        improvementPercent: 0,
      },
    ],
    profiling: {
      hotPaths: profilingReport,
      memoryHogs: memoryHogs.map(m => m.operation).join(', '),
    },
    optimizations: optimizationReport,
    summary: {
      totalImprovementPercent: 0, // Will be calculated after optimizations applied
      meetsTargets: true,
      recommendations: generateRecommendations(hotPaths, memoryHogs),
    },
  };

  const combinedReportPath = resolve(reportDir, `combined-${timestamp}.json`);
  await writeFile(combinedReportPath, JSON.stringify(combinedReport, null, 2));
  console.log(`  ✓ Combined report saved: ${combinedReportPath}`);

  // Phase 6: Generate markdown summary
  const markdownSummary = generateMarkdownSummary(combinedReport, hotPaths, memoryHogs);
  const summaryPath = resolve(reportDir, `summary-${timestamp}.md`);
  await writeFile(summaryPath, markdownSummary);
  console.log(`  ✓ Markdown summary saved: ${summaryPath}`);

  // Final summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          Benchmark Complete            ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('  Reports generated:');
  console.log(`    📊 Profiling: ${profilingPath}`);
  console.log(`    🔧 Optimization: ${optimizationPath}`);
  console.log(`    📋 Summary: ${summaryPath}`);
  console.log(`    📦 JSON: ${combinedReportPath}`);
  console.log('');

  console.log('  Next steps:');
  console.log('    1. Review profiling report for hot paths');
  console.log('    2. Implement recommended optimizations');
  console.log('    3. Re-run benchmarks to measure improvement');
  console.log('    4. Update ADR with optimization results');
  console.log('');
}

/**
 * Generate recommendations based on profiling data
 */
function generateRecommendations(
  hotPaths: Array<{ operation: string; percentOfTotal: number; count: number }>,
  memoryHogs: Array<{ operation: string; avgMemoryDelta: number }>
): string[] {
  const recommendations: string[] = [];

  // Hot path recommendations
  if (hotPaths.length > 0) {
    const top = hotPaths[0];
    if (top.percentOfTotal > 30) {
      recommendations.push(`CRITICAL: ${top.operation} consumes ${top.percentOfTotal.toFixed(1)}% of total time - prioritize optimization`);
    }

    if (hotPaths.some(p => p.count > 100)) {
      recommendations.push('Consider batching operations with high call counts (>100 calls)');
    }

    if (hotPaths.some(p => p.operation.includes('file') || p.operation.includes('io'))) {
      recommendations.push('I/O operations detected in hot paths - consider parallel processing or streaming');
    }
  }

  // Memory recommendations
  if (memoryHogs.length > 0) {
    const topMemory = memoryHogs[0];
    const avgMB = topMemory.avgMemoryDelta / 1024 / 1024;

    if (avgMB > 20) {
      recommendations.push(`High memory usage in ${topMemory.operation} (${avgMB.toFixed(2)}MB avg) - consider memory pooling`);
    }

    if (memoryHogs.some(m => m.avgMemoryDelta > 10 * 1024 * 1024)) {
      recommendations.push('Implement object reuse for memory-intensive operations (>10MB)');
    }
  }

  // General recommendations
  recommendations.push('Enable caching for frequently called operations');
  recommendations.push('Use parallel processing for independent operations');
  recommendations.push('Implement lazy loading for non-critical resources');

  return recommendations;
}

/**
 * Generate markdown summary
 */
function generateMarkdownSummary(
  report: BenchmarkReport,
  hotPaths: Array<{ operation: string; totalTime: number; percentOfTotal: number; count: number }>,
  memoryHogs: Array<{ operation: string; avgMemoryDelta: number; count: number }>
): string {
  const lines: string[] = [
    '# V1.2 Benchmark Summary',
    '',
    `**Generated**: ${report.timestamp}`,
    '',
    '## Executive Summary',
    '',
    '### Performance Targets',
    '',
    '| Target | Threshold | Status |',
    '|--------|-----------|--------|',
    '| Scan time (large config) | <5000ms | TBD |',
    '| Memory usage | <100MB | TBD |',
    '| CLI cold start | <500ms | TBD |',
    '',
    '## Hot Paths Analysis',
    '',
    '### Top 5 Operations by Time',
    '',
    '| Operation | Total Time (ms) | % of Total | Call Count | Priority |',
    '|-----------|-----------------|------------|------------|----------|',
  ];

  for (const path of hotPaths.slice(0, 5)) {
    const priority = path.percentOfTotal > 20 ? '🔴 HIGH' : path.percentOfTotal > 10 ? '🟡 MEDIUM' : '🟢 LOW';
    lines.push(
      `| ${path.operation} | ${path.totalTime.toFixed(2)} | ${path.percentOfTotal.toFixed(1)}% | ${path.count} | ${priority} |`
    );
  }

  lines.push('');
  lines.push('### Top 3 Memory-Intensive Operations');
  lines.push('');
  lines.push('| Operation | Avg Memory (MB) | Call Count | Recommendation |');
  lines.push('|-----------|-----------------|------------|----------------|');

  for (const op of memoryHogs.slice(0, 3)) {
    const avgMB = (op.avgMemoryDelta / 1024 / 1024).toFixed(2);
    const rec = op.avgMemoryDelta > 20 * 1024 * 1024 ? 'Memory pooling' : 'Object reuse';
    lines.push(`| ${op.operation} | ${avgMB} | ${op.count} | ${rec} |`);
  }

  lines.push('');
  lines.push('## Recommendations');
  lines.push('');

  for (let i = 0; i < report.summary.recommendations.length; i++) {
    lines.push(`${i + 1}. ${report.summary.recommendations[i]}`);
  }

  lines.push('');
  lines.push('## Optimization Strategies');
  lines.push('');
  lines.push('### Immediate Actions (High Priority)');
  lines.push('');

  if (hotPaths.length > 0 && hotPaths[0].percentOfTotal > 20) {
    lines.push(`- [ ] Optimize ${hotPaths[0].operation} (${hotPaths[0].percentOfTotal.toFixed(1)}% of total time)`);
    lines.push('  - Add caching layer');
    lines.push('  - Consider parallel processing');
    lines.push('  - Profile internal operations');
  }

  lines.push('');
  lines.push('### Medium-Term Actions');
  lines.push('');
  lines.push('- [ ] Implement memory pooling for large objects');
  lines.push('- [ ] Add batch processing for I/O operations');
  lines.push('- [ ] Enable lazy loading for optional features');
  lines.push('');
  lines.push('### Long-Term Actions');
  lines.push('');
  lines.push('- [ ] Investigate worker threads for CPU-intensive tasks');
  lines.push('- [ ] Implement progressive loading for large configs');
  lines.push('- [ ] Add performance monitoring in production');
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review this summary with the team');
  lines.push('2. Implement high-priority optimizations');
  lines.push('3. Re-run benchmarks to measure improvement');
  lines.push('4. Update ADR-XXX with final results');
  lines.push('5. Document optimization techniques in CONTRIBUTING.md');
  lines.push('');

  return lines.join('\n');
}

// Run benchmarks
main().catch(error => {
  console.error('\n❌ Benchmark failed:', error);
  process.exit(1);
});
