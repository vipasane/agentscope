/**
 * Integration testing orchestration
 */

import { IntegrationTestConfig, TestReport, TestContext } from '../types';
import { createTestContext, completeTestContext } from '../helpers';

/**
 * Integration test runner
 */
export class IntegrationTestRunner {
  private config: Required<IntegrationTestConfig>;
  private tests: Array<{
    name: string;
    fn: () => Promise<void>;
    timeout?: number;
  }> = [];

  constructor(config: IntegrationTestConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 10000,
      retries: config.retries ?? 3,
      parallel: config.parallel ?? false,
      setupTimeout: config.setupTimeout ?? 5000,
      teardownTimeout: config.teardownTimeout ?? 5000
    };
  }

  add(name: string, fn: () => Promise<void>, timeout?: number): this {
    this.tests.push({ name, fn, timeout });
    return this;
  }

  async run(setup?: () => Promise<void>, teardown?: () => Promise<void>): Promise<TestReport> {
    const startTime = Date.now();
    const results: TestContext[] = [];

    // Setup
    if (setup) {
      try {
        await this.withTimeout(setup(), this.config.setupTimeout);
      } catch (error) {
        console.error('Setup failed:', error);
        throw error;
      }
    }

    try {
      if (this.config.parallel) {
        await this.runParallel(results);
      } else {
        await this.runSequential(results);
      }
    } finally {
      // Teardown
      if (teardown) {
        try {
          await this.withTimeout(teardown(), this.config.teardownTimeout);
        } catch (error) {
          console.error('Teardown failed:', error);
        }
      }
    }

    return this.generateReport(results, startTime);
  }

  private async runSequential(results: TestContext[]): Promise<void> {
    for (const test of this.tests) {
      const context = createTestContext(test.name);
      try {
        await this.withRetry(
          () => this.withTimeout(test.fn(), test.timeout || this.config.timeout),
          this.config.retries
        );
        results.push(completeTestContext(context, 'passed'));
      } catch (error) {
        results.push(completeTestContext(context, 'failed', error as Error));
      }
    }
  }

  private async runParallel(results: TestContext[]): Promise<void> {
    const promises = this.tests.map(async test => {
      const context = createTestContext(test.name);
      try {
        await this.withRetry(
          () => this.withTimeout(test.fn(), test.timeout || this.config.timeout),
          this.config.retries
        );
        return completeTestContext(context, 'passed');
      } catch (error) {
        return completeTestContext(context, 'failed', error as Error);
      }
    });

    const resolved = await Promise.all(promises);
    results.push(...resolved);
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      )
    ]);
  }

  private generateReport(results: TestContext[], startTime: number): TestReport {
    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return {
      totalTests: results.length,
      passed,
      failed,
      skipped,
      duration,
      tests: results,
      coverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      }
    };
  }
}

/**
 * E2E test builder
 */
export class E2ETestBuilder {
  private steps: Array<{
    name: string;
    fn: () => Promise<void>;
    rollback?: () => Promise<void>;
  }> = [];

  addStep(name: string, fn: () => Promise<void>, rollback?: () => Promise<void>): this {
    this.steps.push({ name, fn, rollback });
    return this;
  }

  async execute(): Promise<TestReport> {
    const startTime = Date.now();
    const results: TestContext[] = [];
    const completedSteps: number[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const context = createTestContext(step.name);

      try {
        await step.fn();
        results.push(completeTestContext(context, 'passed'));
        completedSteps.push(i);
      } catch (error) {
        results.push(completeTestContext(context, 'failed', error as Error));

        // Rollback completed steps
        for (let j = completedSteps.length - 1; j >= 0; j--) {
          const stepIndex = completedSteps[j];
          const rollbackFn = this.steps[stepIndex].rollback;
          if (rollbackFn) {
            try {
              await rollbackFn();
            } catch (rollbackError) {
              console.error(`Rollback failed for step ${stepIndex}:`, rollbackError);
            }
          }
        }

        break;
      }
    }

    const duration = Date.now() - startTime;
    return {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: 0,
      duration,
      tests: results,
      coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
    };
  }
}

/**
 * Contract test builder
 */
export class ContractTestBuilder {
  private contracts: Array<{
    name: string;
    provider: () => Promise<unknown>;
    consumer: (data: unknown) => Promise<void>;
  }> = [];

  addContract(
    name: string,
    provider: () => Promise<unknown>,
    consumer: (data: unknown) => Promise<void>
  ): this {
    this.contracts.push({ name, provider, consumer });
    return this;
  }

  async verify(): Promise<TestReport> {
    const startTime = Date.now();
    const results: TestContext[] = [];

    for (const contract of this.contracts) {
      const context = createTestContext(contract.name);

      try {
        const data = await contract.provider();
        await contract.consumer(data);
        results.push(completeTestContext(context, 'passed'));
      } catch (error) {
        results.push(completeTestContext(context, 'failed', error as Error));
      }
    }

    const duration = Date.now() - startTime;
    return {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: 0,
      duration,
      tests: results,
      coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
    };
  }
}

/**
 * Test orchestrator
 */
export class TestOrchestrator {
  private suites: Map<string, Array<() => Promise<void>>> = new Map();

  addSuite(name: string, tests: Array<() => Promise<void>>): this {
    this.suites.set(name, tests);
    return this;
  }

  async runAllSuites(): Promise<Map<string, TestReport>> {
    const results = new Map<string, TestReport>();

    for (const [suiteName, tests] of this.suites) {
      const startTime = Date.now();
      const contexts: TestContext[] = [];

      for (const test of tests) {
        const context = createTestContext(`${suiteName}::${test.name || 'anonymous'}`);
        try {
          await test();
          contexts.push(completeTestContext(context, 'passed'));
        } catch (error) {
          contexts.push(completeTestContext(context, 'failed', error as Error));
        }
      }

      const duration = Date.now() - startTime;
      results.set(suiteName, {
        totalTests: contexts.length,
        passed: contexts.filter(c => c.status === 'passed').length,
        failed: contexts.filter(c => c.status === 'failed').length,
        skipped: 0,
        duration,
        tests: contexts,
        coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
      });
    }

    return results;
  }
}
