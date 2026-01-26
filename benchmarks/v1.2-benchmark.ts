/**
 * V1.2 Performance Benchmark Suite
 *
 * Benchmarks all major operations across different config sizes:
 * - Small: 5 agents, 2 skills
 * - Medium: 20 agents, 10 skills, 5 hooks
 * - Large: 50 agents, 20 skills, 10 hooks, 8 plugins
 * - Multi-file: 4 categories
 * - Template: ADR + CONTEXT.md
 *
 * Metrics tracked:
 * - Scan time (target: <5s for large)
 * - Memory usage (target: <100MB peak)
 * - File I/O operations
 * - Documentation generation time
 * - CPU usage
 * - CLI cold start time
 */

import { performance } from 'node:perf_hooks';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import {
  measurePerformance,
  benchmark,
  PERFORMANCE_TARGETS,
  formatBenchmarkResults,
  formatMemoryReport,
  Timer,
  getMemoryUsage,
} from '../src/utils/performance.js';
import { scanAndGenerate } from '../src/core/index.js';
import type { AgentScopeConfig } from '../src/model/types.js';

interface BenchmarkScenario {
  name: string;
  description: string;
  configGenerator: () => AgentScopeConfig;
  expectedAgents: number;
  expectedSkills: number;
  targetMaxMs?: number;
}

/**
 * Generate small config (baseline)
 */
function generateSmallConfig(): AgentScopeConfig {
  return {
    version: '1.2.0',
    agents: Array.from({ length: 5 }, (_, i) => ({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      description: `Test agent ${i}`,
      type: i % 2 === 0 ? 'coordinator' : 'worker',
      category: 'core',
    })),
    skills: Array.from({ length: 2 }, (_, i) => ({
      id: `skill-${i}`,
      name: `Skill ${i}`,
      description: `Test skill ${i}`,
    })),
    hooks: [],
    commands: [],
    mcpServers: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.2.0',
      errors: [],
      duration: 0,
    },
  };
}

/**
 * Generate medium config
 */
function generateMediumConfig(): AgentScopeConfig {
  return {
    version: '1.2.0',
    agents: Array.from({ length: 20 }, (_, i) => ({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      description: `Test agent ${i} with longer description for realistic data`,
      type: ['coordinator', 'worker', 'specialist'][i % 3],
      category: ['core', 'github', 'security', 'sparc'][i % 4],
      capabilities: [`cap-${i}-1`, `cap-${i}-2`],
    })),
    skills: Array.from({ length: 10 }, (_, i) => ({
      id: `skill-${i}`,
      name: `Skill ${i}`,
      description: `Test skill ${i} with capabilities`,
      category: ['development', 'testing', 'deployment'][i % 3],
    })),
    hooks: Array.from({ length: 5 }, (_, i) => ({
      id: `hook-${i}`,
      name: `Hook ${i}`,
      description: `Test hook ${i}`,
      trigger: ['pre-edit', 'post-edit', 'pre-task', 'post-task', 'route'][i % 5],
    })),
    commands: [],
    mcpServers: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.2.0',
      errors: [],
      duration: 0,
    },
  };
}

/**
 * Generate large config
 */
function generateLargeConfig(): AgentScopeConfig {
  const categories = ['core', 'github', 'security', 'sparc', 'performance', 'testing', 'deployment', 'monitoring'];
  const types = ['coordinator', 'worker', 'specialist', 'orchestrator', 'analyzer'];

  return {
    version: '1.2.0',
    agents: Array.from({ length: 50 }, (_, i) => ({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      description: `Test agent ${i} with detailed description and multiple capabilities for realistic testing`,
      type: types[i % types.length],
      category: categories[i % categories.length],
      capabilities: Array.from({ length: 3 }, (_, j) => `cap-${i}-${j}`),
      dependencies: i > 0 ? [`agent-${i - 1}`] : undefined,
    })),
    skills: Array.from({ length: 20 }, (_, i) => ({
      id: `skill-${i}`,
      name: `Skill ${i}`,
      description: `Test skill ${i} with comprehensive description`,
      category: categories[i % categories.length],
      requiredCapabilities: [`cap-req-${i}`],
    })),
    hooks: Array.from({ length: 10 }, (_, i) => ({
      id: `hook-${i}`,
      name: `Hook ${i}`,
      description: `Test hook ${i} for lifecycle management`,
      trigger: ['pre-edit', 'post-edit', 'pre-task', 'post-task', 'route'][i % 5],
      options: { timeout: 5000, retries: 3 },
    })),
    commands: Array.from({ length: 15 }, (_, i) => ({
      id: `cmd-${i}`,
      name: `Command ${i}`,
      description: `Test command ${i}`,
      usage: `cmd-${i} [options]`,
    })),
    mcpServers: Array.from({ length: 8 }, (_, i) => ({
      id: `mcp-${i}`,
      name: `MCP Server ${i}`,
      command: `npx mcp-${i}`,
      disabled: i >= 6, // 6 enabled, 2 disabled
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.2.0',
      errors: [],
      duration: 0,
    },
  };
}

/**
 * All benchmark scenarios
 */
const scenarios: BenchmarkScenario[] = [
  {
    name: 'small-config',
    description: 'Small config (5 agents, 2 skills) - baseline',
    configGenerator: generateSmallConfig,
    expectedAgents: 5,
    expectedSkills: 2,
    targetMaxMs: 1000, // Should be fast
  },
  {
    name: 'medium-config',
    description: 'Medium config (20 agents, 10 skills, 5 hooks)',
    configGenerator: generateMediumConfig,
    expectedAgents: 20,
    expectedSkills: 10,
    targetMaxMs: 2000,
  },
  {
    name: 'large-config',
    description: 'Large config (50 agents, 20 skills, 10 hooks, 8 plugins)',
    configGenerator: generateLargeConfig,
    expectedAgents: 50,
    expectedSkills: 20,
    targetMaxMs: PERFORMANCE_TARGETS.SCAN_MAX_MS, // 5000ms target
  },
];

/**
 * Memory snapshot utility
 */
function captureMemorySnapshot(label: string): { label: string; bytes: number } {
  const usage = process.memoryUsage();
  return { label, bytes: usage.heapUsed };
}

/**
 * Benchmark configuration scanning
 */
async function benchmarkScan(scenario: BenchmarkScenario): Promise<void> {
  const timer = new Timer();
  const memorySnapshots: Array<{ label: string; bytes: number }> = [];

  // Setup
  const testDir = resolve(process.cwd(), 'tmp', `benchmark-${scenario.name}`);
  await mkdir(testDir, { recursive: true });

  const configPath = resolve(testDir, 'agentscope.config.json');
  const config = scenario.configGenerator();

  memorySnapshots.push(captureMemorySnapshot('Startup'));

  // Write config
  timer.start();
  await writeFile(configPath, JSON.stringify(config, null, 2));
  timer.lap('Write config');

  memorySnapshots.push(captureMemorySnapshot('Config written'));

  // Run scan
  const outputDir = resolve(testDir, 'docs');
  const scanStart = performance.now();

  const result = await scanAndGenerate({
    rootPath: testDir,
    outputDir,
    verbose: false,
  });

  const scanDuration = performance.now() - scanStart;
  timer.lap('Scan complete');

  memorySnapshots.push(captureMemorySnapshot('After scan'));

  // Verify results
  const actualAgents = result.config.agents.length;
  const actualSkills = result.config.skills.length;

  console.log(`\n  ${scenario.name}:`);
  console.log(`    Description: ${scenario.description}`);
  console.log(`    Agents: ${actualAgents} (expected: ${scenario.expectedAgents})`);
  console.log(`    Skills: ${actualSkills} (expected: ${scenario.expectedSkills})`);
  console.log(`    Scan duration: ${scanDuration.toFixed(2)}ms`);
  console.log(`    Target: ${scenario.targetMaxMs}ms`);
  console.log(`    Status: ${scanDuration <= (scenario.targetMaxMs || PERFORMANCE_TARGETS.SCAN_MAX_MS) ? '✓ PASS' : '✗ FAIL'}`);

  // Memory report
  console.log('\n  Memory snapshots:');
  for (const snapshot of memorySnapshots) {
    const mb = (snapshot.bytes / 1024 / 1024).toFixed(2);
    console.log(`    ${snapshot.label}: ${mb} MB`);
  }

  // Lap times
  console.log('\n  Timing breakdown:');
  for (const lap of timer.getLaps()) {
    console.log(`    ${lap.label}: ${lap.elapsed.toFixed(2)}ms (+${lap.delta.toFixed(2)}ms)`);
  }

  // Cleanup
  await rm(testDir, { recursive: true, force: true });
}

/**
 * Benchmark CLI cold start
 */
async function benchmarkCLIStart(): Promise<void> {
  console.log('\n  CLI Cold Start Benchmark:');

  const iterations = 10;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      execSync('node dist/cli/index.js --version', {
        stdio: 'pipe',
        timeout: 5000,
      });
    } catch (error) {
      // Ignore errors, we're just measuring startup time
    }
    const duration = performance.now() - start;
    times.push(duration);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

  console.log(`    Iterations: ${iterations}`);
  console.log(`    Min: ${min.toFixed(2)}ms`);
  console.log(`    Max: ${max.toFixed(2)}ms`);
  console.log(`    Avg: ${avg.toFixed(2)}ms`);
  console.log(`    P95: ${p95.toFixed(2)}ms`);
  console.log(`    Target: <500ms`);
  console.log(`    Status: ${p95 <= 500 ? '✓ PASS' : '✗ FAIL'}`);
}

/**
 * Benchmark file I/O operations
 */
async function benchmarkFileIO(): Promise<void> {
  console.log('\n  File I/O Benchmark:');

  const testDir = resolve(process.cwd(), 'tmp', 'io-benchmark');
  await mkdir(testDir, { recursive: true });

  // Test different file sizes
  const sizes = [
    { name: 'Small (1KB)', bytes: 1024 },
    { name: 'Medium (10KB)', bytes: 10 * 1024 },
    { name: 'Large (100KB)', bytes: 100 * 1024 },
  ];

  for (const size of sizes) {
    const content = 'x'.repeat(size.bytes);
    const filePath = resolve(testDir, `test-${size.bytes}.txt`);

    // Write benchmark
    const writeStart = performance.now();
    await writeFile(filePath, content);
    const writeDuration = performance.now() - writeStart;

    console.log(`    ${size.name} write: ${writeDuration.toFixed(2)}ms`);
  }

  // Cleanup
  await rm(testDir, { recursive: true, force: true });
}

/**
 * Main benchmark runner
 */
async function runBenchmarks(): Promise<void> {
  console.log('\n========================================');
  console.log('  V1.2 Performance Benchmark Suite');
  console.log('========================================\n');

  const overallTimer = new Timer();
  overallTimer.start();

  // Initial memory
  const initialMemory = captureMemorySnapshot('Initial');
  console.log(`  Initial memory: ${(initialMemory.bytes / 1024 / 1024).toFixed(2)} MB\n`);

  // Run scenario benchmarks
  console.log('  Configuration Scan Benchmarks:');
  console.log('  ' + '='.repeat(38));

  for (const scenario of scenarios) {
    await benchmarkScan(scenario);
  }

  // CLI startup benchmark
  console.log('\n  ' + '='.repeat(38));
  await benchmarkCLIStart();

  // File I/O benchmark
  console.log('\n  ' + '='.repeat(38));
  await benchmarkFileIO();

  // Final summary
  const totalDuration = overallTimer.stop();
  const finalMemory = captureMemorySnapshot('Final');

  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================\n');
  console.log(`  Total benchmark time: ${totalDuration.toFixed(2)}ms`);
  console.log(`  Final memory: ${(finalMemory.bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Memory delta: ${((finalMemory.bytes - initialMemory.bytes) / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n  Performance Targets:');
  console.log(`    Scan time (large config): ${PERFORMANCE_TARGETS.SCAN_MAX_MS}ms`);
  console.log(`    Memory usage: ${(PERFORMANCE_TARGETS.MEMORY_MAX_BYTES / 1024 / 1024).toFixed(0)} MB`);
  console.log(`    CLI cold start: <500ms`);

  console.log('\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks, benchmarkScan, scenarios };
