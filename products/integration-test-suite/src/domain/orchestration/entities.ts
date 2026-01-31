/**
 * Entities for Test Orchestration Domain
 */

import { ScenarioId, PackageId, Duration } from './value-objects.js';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export interface ScenarioResult {
  scenarioId: ScenarioId;
  passed: boolean;
  duration: Duration;
  error?: Error;
  metrics?: Record<string, unknown>;
}

export class TestScenario {
  readonly id: ScenarioId;
  readonly name: string;
  readonly packages: PackageId[];
  readonly dependencies: ScenarioId[];
  private timeout: Duration;
  private testFunction?: () => Promise<void>;

  constructor(
    id: ScenarioId,
    name: string,
    packages: PackageId[],
    timeout: Duration = Duration.seconds(30)
  ) {
    this.validatePackages(packages);
    this.id = id;
    this.name = name;
    this.packages = packages;
    this.dependencies = [];
    this.timeout = timeout;
  }

  addDependency(scenarioId: ScenarioId): void {
    if (this.createsCycle(scenarioId)) {
      throw new DomainError('Circular dependency detected');
    }
    this.dependencies.push(scenarioId);
  }

  setTestFunction(fn: () => Promise<void>): void {
    this.testFunction = fn;
  }

  async execute(): Promise<ScenarioResult> {
    const startTime = Date.now();

    try {
      if (!this.testFunction) {
        throw new DomainError('No test function defined for scenario');
      }

      await Promise.race([
        this.testFunction(),
        this.timeoutPromise()
      ]);

      const duration = new Duration(Date.now() - startTime);
      return {
        scenarioId: this.id,
        passed: true,
        duration
      };
    } catch (error) {
      const duration = new Duration(Date.now() - startTime);
      return {
        scenarioId: this.id,
        passed: false,
        duration,
        error: error as Error
      };
    }
  }

  private timeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test scenario timed out after ${this.timeout.seconds}s`));
      }, this.timeout.milliseconds);
    });
  }

  private validatePackages(packages: PackageId[]): void {
    // Domain invariant: integration test must span multiple packages
    if (packages.length < 2) {
      throw new DomainError('Integration test must span at least 2 packages');
    }
  }

  private createsCycle(scenarioId: ScenarioId): boolean {
    // Simple cycle detection - in production would use proper graph algorithm
    return this.dependencies.some(dep => dep.equals(scenarioId));
  }

  getTimeout(): Duration {
    return this.timeout;
  }

  setTimeout(timeout: Duration): void {
    this.timeout = timeout;
  }
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export class TestExecution {
  readonly id: string;
  readonly suiteId: string;
  readonly startTime: Date;
  private endTime?: Date;
  private status: ExecutionStatus;

  constructor(suiteId: string) {
    this.id = `execution-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.suiteId = suiteId;
    this.startTime = new Date();
    this.status = ExecutionStatus.PENDING;
  }

  start(): void {
    this.status = ExecutionStatus.RUNNING;
  }

  complete(): void {
    this.status = ExecutionStatus.COMPLETED;
    this.endTime = new Date();
  }

  fail(): void {
    this.status = ExecutionStatus.FAILED;
    this.endTime = new Date();
  }

  getStatus(): ExecutionStatus {
    return this.status;
  }

  getDuration(): Duration | null {
    if (!this.endTime) {
      return null;
    }
    return new Duration(this.endTime.getTime() - this.startTime.getTime());
  }
}
