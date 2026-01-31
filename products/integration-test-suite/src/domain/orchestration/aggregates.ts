/**
 * Aggregates for Test Orchestration Domain
 */

import {
  TestScenario,
  ScenarioResult,
  TestExecution,
  ExecutionStatus,
  DomainError
} from './entities.js';
import { TestSuiteId, TestConfiguration, Duration } from './value-objects.js';

export interface TestResult {
  suiteId: TestSuiteId;
  scenarios: ScenarioResult[];
  totalDuration: Duration;
  passed: boolean;
  failedCount: number;
  passedCount: number;
  executionId: string;
}

export class TestSuite {
  private readonly id: TestSuiteId;
  private readonly scenarios: TestScenario[];
  private readonly configuration: TestConfiguration;
  private executionHistory: TestExecution[];

  constructor(
    id: TestSuiteId,
    scenarios: TestScenario[],
    config: TestConfiguration
  ) {
    this.validateScenarios(scenarios);
    this.id = id;
    this.scenarios = scenarios;
    this.configuration = config;
    this.executionHistory = [];
  }

  async execute(): Promise<TestResult> {
    const execution = new TestExecution(this.id.value);
    this.executionHistory.push(execution);

    execution.start();
    const startTime = Date.now();

    try {
      const results: ScenarioResult[] = [];

      // Execute scenarios in dependency order
      const executionOrder = this.resolveExecutionOrder();

      for (const scenario of executionOrder) {
        const result = await scenario.execute();
        results.push(result);

        // Stop on first failure if bail is enabled
        if (!result.passed && this.configuration.retryStrategy === 'none') {
          break;
        }
      }

      const totalDuration = new Duration(Date.now() - startTime);
      const passedCount = results.filter(r => r.passed).length;
      const failedCount = results.length - passedCount;

      execution.complete();

      return {
        suiteId: this.id,
        scenarios: results,
        totalDuration,
        passed: failedCount === 0,
        failedCount,
        passedCount,
        executionId: execution.id
      };
    } catch (error) {
      execution.fail();
      throw error;
    }
  }

  addScenario(scenario: TestScenario): void {
    if (this.hasDuplicate(scenario)) {
      throw new DomainError('Duplicate scenario detected');
    }
    this.scenarios.push(scenario);
  }

  getScenarios(): readonly TestScenario[] {
    return [...this.scenarios];
  }

  getId(): TestSuiteId {
    return this.id;
  }

  getConfiguration(): TestConfiguration {
    return this.configuration;
  }

  getExecutionHistory(): readonly TestExecution[] {
    return [...this.executionHistory];
  }

  private validateScenarios(scenarios: TestScenario[]): void {
    // Domain invariant: all scenarios must have unique IDs
    const ids = scenarios.map(s => s.id.value);
    if (new Set(ids).size !== ids.length) {
      throw new DomainError('Scenarios must have unique IDs');
    }
  }

  private hasDuplicate(scenario: TestScenario): boolean {
    return this.scenarios.some(s => s.id.equals(scenario.id));
  }

  private resolveExecutionOrder(): TestScenario[] {
    // Simple topological sort - in production would use proper algorithm
    const visited = new Set<string>();
    const result: TestScenario[] = [];

    const visit = (scenario: TestScenario) => {
      if (visited.has(scenario.id.value)) {
        return;
      }

      visited.add(scenario.id.value);

      // Visit dependencies first
      for (const depId of scenario.dependencies) {
        const dep = this.scenarios.find(s => s.id.equals(depId));
        if (dep) {
          visit(dep);
        }
      }

      result.push(scenario);
    };

    for (const scenario of this.scenarios) {
      visit(scenario);
    }

    return result;
  }
}
