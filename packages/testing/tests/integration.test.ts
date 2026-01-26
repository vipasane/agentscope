/**
 * Tests for integration testing utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IntegrationTestRunner,
  E2ETestBuilder,
  ContractTestBuilder,
  TestOrchestrator
} from '../src/integration';

describe('Integration Testing', () => {
  describe('Integration Test Runner', () => {
    it('should run sequential tests', async () => {
      const runner = new IntegrationTestRunner({
        timeout: 1000,
        parallel: false
      });

      let executed = 0;
      runner.add('test1', async () => {
        executed++;
      });
      runner.add('test2', async () => {
        executed++;
      });

      const report = await runner.run();

      expect(report.totalTests).toBe(2);
      expect(report.passed).toBe(2);
      expect(executed).toBe(2);
    });

    it('should run parallel tests', async () => {
      const runner = new IntegrationTestRunner({
        timeout: 1000,
        parallel: true
      });

      let executedCount = 0;
      runner.add('test1', async () => {
        executedCount++;
      });
      runner.add('test2', async () => {
        executedCount++;
      });

      const report = await runner.run();

      expect(report.totalTests).toBe(2);
      expect(report.passed).toBe(2);
    });

    it('should handle test failures', async () => {
      const runner = new IntegrationTestRunner({
        timeout: 1000,
        parallel: false
      });

      runner.add('success', async () => {
        // Pass
      });
      runner.add('failure', async () => {
        throw new Error('Test failed');
      });

      const report = await runner.run();

      expect(report.totalTests).toBe(2);
      expect(report.passed).toBe(1);
      expect(report.failed).toBe(1);
    });

    it('should retry failed tests', async () => {
      const runner = new IntegrationTestRunner({
        timeout: 1000,
        retries: 2
      });

      let attempts = 0;
      runner.add('retry-test', async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Fail once');
        }
      });

      const report = await runner.run();

      expect(report.passed).toBe(1);
      expect(attempts).toBeGreaterThanOrEqual(2);
    });

    it('should run setup and teardown', async () => {
      let setupRun = false;
      let teardownRun = false;

      const runner = new IntegrationTestRunner();
      runner.add('test', async () => {
        // Pass
      });

      const report = await runner.run(
        async () => {
          setupRun = true;
        },
        async () => {
          teardownRun = true;
        }
      );

      expect(setupRun).toBe(true);
      expect(teardownRun).toBe(true);
    });
  });

  describe('E2E Test Builder', () => {
    it('should execute steps in order', async () => {
      const builder = new E2ETestBuilder();
      const executed: string[] = [];

      builder
        .addStep('step1', async () => {
          executed.push('step1');
        })
        .addStep('step2', async () => {
          executed.push('step2');
        });

      const report = await builder.execute();

      expect(executed).toEqual(['step1', 'step2']);
      expect(report.passed).toBe(2);
    });

    it('should rollback on failure', async () => {
      const builder = new E2ETestBuilder();
      const executed: string[] = [];

      builder
        .addStep(
          'step1',
          async () => {
            executed.push('step1');
          },
          async () => {
            executed.push('rollback1');
          }
        )
        .addStep('step2', async () => {
          executed.push('step2');
          throw new Error('Failed');
        });

      const report = await builder.execute();

      expect(report.failed).toBe(1);
      expect(executed).toContain('rollback1');
    });
  });

  describe('Contract Test Builder', () => {
    it('should verify contracts', async () => {
      const builder = new ContractTestBuilder();

      builder.addContract(
        'user-api',
        async () => ({ id: 1, name: 'test' }),
        async (data) => {
          expect(data).toHaveProperty('id');
          expect(data).toHaveProperty('name');
        }
      );

      const report = await builder.verify();

      expect(report.passed).toBe(1);
    });

    it('should handle contract violations', async () => {
      const builder = new ContractTestBuilder();

      builder.addContract(
        'user-api',
        async () => ({}),
        async (data) => {
          expect(data).toHaveProperty('id');
        }
      );

      const report = await builder.verify();

      expect(report.failed).toBe(1);
    });
  });

  describe('Test Orchestrator', () => {
    it('should run multiple test suites', async () => {
      const orchestrator = new TestOrchestrator();
      let suite1Executed = false;
      let suite2Executed = false;

      orchestrator.addSuite('suite1', [
        async () => {
          suite1Executed = true;
        }
      ]);

      orchestrator.addSuite('suite2', [
        async () => {
          suite2Executed = true;
        }
      ]);

      const results = await orchestrator.runAllSuites();

      expect(results.size).toBe(2);
      expect(suite1Executed).toBe(true);
      expect(suite2Executed).toBe(true);
    });

    it('should generate reports for each suite', async () => {
      const orchestrator = new TestOrchestrator();

      orchestrator.addSuite('suite1', [
        async () => {
          // Pass
        },
        async () => {
          // Pass
        }
      ]);

      const results = await orchestrator.runAllSuites();
      const suite1Report = results.get('suite1');

      expect(suite1Report?.totalTests).toBe(2);
      expect(suite1Report?.passed).toBe(2);
    });
  });
});
