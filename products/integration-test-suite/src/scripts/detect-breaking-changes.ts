#!/usr/bin/env tsx

/**
 * Breaking Change Detection Script
 * Analyzes test results to detect API breaking changes
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suiteId: string;
  scenarios: Array<{
    scenarioId: { value: string };
    passed: boolean;
    error?: { message: string };
  }>;
  passed: boolean;
}

interface BreakingChange {
  type: 'api-change' | 'behavior-change' | 'performance-regression';
  severity: 'major' | 'minor' | 'patch';
  package: string;
  description: string;
  affectedTests: string[];
}

class BreakingChangeDetector {
  private breakingChanges: BreakingChange[] = [];

  /**
   * Analyze test results for breaking changes
   */
  analyzeTestResults(currentResults: string, baselineResults?: string): void {
    console.log('🔍 Analyzing test results for breaking changes...\n');

    // Load current results
    if (!existsSync(currentResults)) {
      console.error(`❌ Results file not found: ${currentResults}`);
      process.exit(1);
    }

    const current = JSON.parse(readFileSync(currentResults, 'utf-8'));

    // If no baseline, just validate current
    if (!baselineResults || !existsSync(baselineResults)) {
      console.log('ℹ️  No baseline found - skipping comparison');
      this.validateCurrentResults(current);
      return;
    }

    const baseline = JSON.parse(readFileSync(baselineResults, 'utf-8'));
    this.compareResults(baseline, current);
  }

  /**
   * Validate current results meet quality standards
   */
  private validateCurrentResults(results: any): void {
    const issues: string[] = [];

    // Check for consistent failures
    const failedTests = this.extractFailedTests(results);
    if (failedTests.length > 0) {
      issues.push(
        `${failedTests.length} tests failing consistently: ${failedTests.join(', ')}`
      );
    }

    // Check performance thresholds
    if (results.duration > 300000) {
      // >5 minutes
      issues.push(`Performance regression: ${(results.duration / 1000).toFixed(2)}s (target: <300s)`);
    }

    if (issues.length > 0) {
      console.log('⚠️  Quality Issues Detected:\n');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('');
    } else {
      console.log('✅ All quality checks passed\n');
    }
  }

  /**
   * Compare current results against baseline
   */
  private compareResults(baseline: any, current: any): void {
    // Detect new failures
    const baselineFailures = this.extractFailedTests(baseline);
    const currentFailures = this.extractFailedTests(current);
    const newFailures = currentFailures.filter(
      test => !baselineFailures.includes(test)
    );

    if (newFailures.length > 0) {
      this.breakingChanges.push({
        type: 'behavior-change',
        severity: 'major',
        package: 'unknown',
        description: `${newFailures.length} previously passing tests now fail`,
        affectedTests: newFailures
      });
    }

    // Detect performance regressions
    const baselineDuration = baseline.duration || 0;
    const currentDuration = current.duration || 0;
    const degradation = currentDuration - baselineDuration;
    const degradationPercent = (degradation / baselineDuration) * 100;

    if (degradationPercent > 20) {
      // >20% slower
      this.breakingChanges.push({
        type: 'performance-regression',
        severity: degradationPercent > 50 ? 'major' : 'minor',
        package: 'performance',
        description: `Performance degradation: ${degradationPercent.toFixed(1)}% slower`,
        affectedTests: []
      });
    }

    // Detect API changes based on error patterns
    this.detectAPIChanges(baseline, current);

    this.reportBreakingChanges();
  }

  /**
   * Detect API changes from error messages
   */
  private detectAPIChanges(baseline: any, current: any): void {
    const apiChangePatterns = [
      /TypeError:.*is not a function/,
      /Cannot read property/,
      /undefined is not an object/,
      /has been removed/,
      /deprecated/i
    ];

    const currentErrors = this.extractErrors(current);

    for (const error of currentErrors) {
      if (apiChangePatterns.some(pattern => pattern.test(error.message))) {
        this.breakingChanges.push({
          type: 'api-change',
          severity: 'major',
          package: this.inferPackageFromError(error.message),
          description: error.message,
          affectedTests: [error.testId]
        });
      }
    }
  }

  /**
   * Extract failed test IDs
   */
  private extractFailedTests(results: any): string[] {
    const failed: string[] = [];

    if (results.scenarios) {
      for (const scenario of results.scenarios) {
        if (!scenario.passed) {
          failed.push(scenario.scenarioId?.value || 'unknown');
        }
      }
    }

    return failed;
  }

  /**
   * Extract error information
   */
  private extractErrors(results: any): Array<{ testId: string; message: string }> {
    const errors: Array<{ testId: string; message: string }> = [];

    if (results.scenarios) {
      for (const scenario of results.scenarios) {
        if (!scenario.passed && scenario.error) {
          errors.push({
            testId: scenario.scenarioId?.value || 'unknown',
            message: scenario.error.message || 'Unknown error'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Infer package from error message
   */
  private inferPackageFromError(message: string): string {
    const packagePatterns = [
      { pattern: /performance|flash|hnsw|cache/i, name: 'performance' },
      { pattern: /learning|reasoning|pattern|ewc/i, name: 'learning' },
      { pattern: /security|validate|sanitize|injection/i, name: 'security' },
      { pattern: /cli|command|argument|parse/i, name: 'cli-framework' }
    ];

    for (const { pattern, name } of packagePatterns) {
      if (pattern.test(message)) {
        return name;
      }
    }

    return 'unknown';
  }

  /**
   * Report detected breaking changes
   */
  private reportBreakingChanges(): void {
    if (this.breakingChanges.length === 0) {
      console.log('✅ No breaking changes detected\n');
      return;
    }

    console.log('⚠️  BREAKING CHANGES DETECTED\n');
    console.log('='.repeat(60));

    const major = this.breakingChanges.filter(c => c.severity === 'major');
    const minor = this.breakingChanges.filter(c => c.severity === 'minor');

    if (major.length > 0) {
      console.log('\n🔴 MAJOR BREAKING CHANGES:\n');
      major.forEach(change => this.printChange(change));
    }

    if (minor.length > 0) {
      console.log('\n🟡 MINOR BREAKING CHANGES:\n');
      minor.forEach(change => this.printChange(change));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${this.breakingChanges.length} breaking changes\n`);

    // Exit with error if major breaking changes found
    if (major.length > 0) {
      process.exit(1);
    }
  }

  /**
   * Print breaking change details
   */
  private printChange(change: BreakingChange): void {
    console.log(`Type: ${change.type}`);
    console.log(`Package: ${change.package}`);
    console.log(`Description: ${change.description}`);
    if (change.affectedTests.length > 0) {
      console.log(`Affected Tests: ${change.affectedTests.join(', ')}`);
    }
    console.log('');
  }
}

// Main execution
async function main() {
  const detector = new BreakingChangeDetector();

  const currentResultsPath = join(
    process.cwd(),
    'test-results',
    'results.json'
  );
  const baselineResultsPath = join(
    process.cwd(),
    'test-results',
    'baseline.json'
  );

  detector.analyzeTestResults(currentResultsPath, baselineResultsPath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { BreakingChangeDetector, main };
