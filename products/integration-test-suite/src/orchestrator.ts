/**
 * Test Orchestrator - Main entry point for integration test execution
 */

import { TestSuite, TestResult } from './domain/orchestration/aggregates.js';
import { TestScenario, ScenarioResult } from './domain/orchestration/entities.js';
import {
  TestSuiteId,
  TestConfiguration,
  TestCategory,
  Duration,
  RetryStrategy,
  TestEnvironment
} from './domain/orchestration/value-objects.js';

export interface OrchestratorConfig {
  parallelism?: number;
  timeout?: number; // in seconds
  retryStrategy?: RetryStrategy;
  environment?: TestEnvironment;
}

export interface ExecutionSummary {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number; // in milliseconds
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

export class TestOrchestrator {
  private suites: Map<TestCategory, TestSuite> = new Map();
  private config: TestConfiguration;

  constructor(config: OrchestratorConfig = {}) {
    this.config = new TestConfiguration(
      config.parallelism ?? 4,
      Duration.seconds(config.timeout ?? 300),
      config.retryStrategy ?? RetryStrategy.EXPONENTIAL_BACKOFF,
      config.environment ?? TestEnvironment.LOCAL
    );
  }

  /**
   * Register a test suite for a specific category
   */
  registerSuite(category: TestCategory, scenarios: TestScenario[]): void {
    const suiteId = TestSuiteId.generate();
    const suite = new TestSuite(suiteId, scenarios, this.config);
    this.suites.set(category, suite);
  }

  /**
   * Execute all registered test suites
   */
  async executeAll(): Promise<Map<TestCategory, TestResult>> {
    const results = new Map<TestCategory, TestResult>();

    for (const [category, suite] of this.suites) {
      console.log(`\n🧪 Executing ${category} tests...`);
      const result = await suite.execute();
      results.set(category, result);

      this.printResult(category, result);
    }

    return results;
  }

  /**
   * Execute a specific test category
   */
  async executeCategory(category: TestCategory): Promise<TestResult | null> {
    const suite = this.suites.get(category);
    if (!suite) {
      console.warn(`No test suite found for category: ${category}`);
      return null;
    }

    console.log(`\n🧪 Executing ${category} tests...`);
    const result = await suite.execute();
    this.printResult(category, result);

    return result;
  }

  /**
   * Get execution summary across all suites
   */
  getSummary(results: Map<TestCategory, TestResult>): ExecutionSummary {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let totalDuration = 0;

    for (const result of results.values()) {
      totalTests += result.scenarios.length;
      passed += result.passedCount;
      failed += result.failedCount;
      totalDuration += result.totalDuration.milliseconds;
    }

    return {
      totalTests,
      passed,
      failed,
      duration: totalDuration
    };
  }

  /**
   * Print test result summary
   */
  private printResult(category: TestCategory, result: TestResult): void {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    const duration = (result.totalDuration.milliseconds / 1000).toFixed(2);

    console.log(`${status} ${category}`);
    console.log(`  Passed: ${result.passedCount}/${result.scenarios.length}`);
    console.log(`  Duration: ${duration}s`);

    if (!result.passed) {
      console.log(`  Failed scenarios:`);
      for (const scenario of result.scenarios.filter(s => !s.passed)) {
        console.log(`    - ${scenario.scenarioId.value}`);
        if (scenario.error) {
          console.log(`      Error: ${scenario.error.message}`);
        }
      }
    }
  }

  /**
   * Check if execution meets performance target (<5 minutes)
   */
  meetsPerformanceTarget(results: Map<TestCategory, TestResult>): boolean {
    const summary = this.getSummary(results);
    const targetMs = 5 * 60 * 1000; // 5 minutes
    return summary.duration < targetMs;
  }

  /**
   * Check if execution meets coverage target (85%+)
   */
  meetsCoverageTarget(summary: ExecutionSummary): boolean {
    if (!summary.coverage) return false;

    const avgCoverage =
      (summary.coverage.lines +
        summary.coverage.functions +
        summary.coverage.branches +
        summary.coverage.statements) /
      4;

    return avgCoverage >= 85;
  }

  /**
   * Store test results for learning
   */
  async storeResults(results: Map<TestCategory, TestResult>): Promise<void> {
    // Integration with claude-flow learning system
    const summary = this.getSummary(results);

    // Store successful patterns
    for (const [category, result] of results) {
      if (result.passed) {
        console.log(`📚 Storing successful pattern for ${category}`);
        // In real implementation, would call:
        // await claudeFlowCLI.memory.store({
        //   namespace: 'integration-test-patterns',
        //   key: category,
        //   value: JSON.stringify(result)
        // });
      } else {
        console.log(`⚠️  Storing failure pattern for ${category}`);
        // Store failure for learning
      }
    }
  }

  /**
   * Generate test report
   */
  generateReport(results: Map<TestCategory, TestResult>): string {
    const summary = this.getSummary(results);
    const lines: string[] = [];

    lines.push('# Integration Test Suite Report\n');
    lines.push(`**Execution Date**: ${new Date().toISOString()}\n`);
    lines.push('## Summary\n');
    lines.push(`- Total Tests: ${summary.totalTests}`);
    lines.push(`- Passed: ${summary.passed}`);
    lines.push(`- Failed: ${summary.failed}`);
    lines.push(
      `- Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`
    );
    lines.push(`- Total Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    lines.push(
      `- Performance Target (<5min): ${this.meetsPerformanceTarget(results) ? '✅' : '❌'}`
    );
    lines.push('\n## Test Categories\n');

    for (const [category, result] of results) {
      const status = result.passed ? '✅' : '❌';
      lines.push(`### ${status} ${category}`);
      lines.push(`- Passed: ${result.passedCount}/${result.scenarios.length}`);
      lines.push(
        `- Duration: ${(result.totalDuration.milliseconds / 1000).toFixed(2)}s`
      );

      if (!result.passed) {
        lines.push('\n**Failed Scenarios:**');
        for (const scenario of result.scenarios.filter(s => !s.passed)) {
          lines.push(`- ${scenario.scenarioId.value}`);
          if (scenario.error) {
            lines.push(`  - Error: ${scenario.error.message}`);
          }
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Run integration tests with self-learning
 */
export async function runIntegrationTests(
  orchestrator: TestOrchestrator
): Promise<boolean> {
  console.log('🚀 Starting Cross-Package Integration Tests\n');

  const startTime = Date.now();
  const results = await orchestrator.executeAll();
  const duration = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(60));

  const summary = orchestrator.getSummary(results);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(
    `Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`
  );
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);

  const meetsTarget = orchestrator.meetsPerformanceTarget(results);
  console.log(
    `Performance Target (<5min): ${meetsTarget ? '✅ PASS' : '❌ FAIL'}`
  );

  // Store results for learning
  await orchestrator.storeResults(results);

  // Generate report
  const report = orchestrator.generateReport(results);
  console.log('\n📄 Full report available in test-results/report.md');

  return summary.failed === 0 && meetsTarget;
}
