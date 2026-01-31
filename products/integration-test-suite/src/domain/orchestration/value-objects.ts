/**
 * Value Objects for Test Orchestration Domain
 */

export class TestSuiteId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('TestSuiteId cannot be empty');
    }
  }

  static generate(): TestSuiteId {
    return new TestSuiteId(`suite-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  }

  equals(other: TestSuiteId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class ScenarioId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ScenarioId cannot be empty');
    }
  }

  static generate(): ScenarioId {
    return new ScenarioId(`scenario-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  }

  equals(other: ScenarioId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class PackageId {
  constructor(public readonly value: string) {
    const validPackages = ['performance', 'learning', 'security', 'cli-framework'];
    if (!validPackages.includes(value)) {
      throw new Error(`Invalid package: ${value}. Must be one of: ${validPackages.join(', ')}`);
    }
  }

  equals(other: PackageId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class Duration {
  constructor(public readonly milliseconds: number) {
    if (milliseconds < 0) {
      throw new Error('Duration cannot be negative');
    }
  }

  static seconds(value: number): Duration {
    return new Duration(value * 1000);
  }

  static minutes(value: number): Duration {
    return new Duration(value * 60 * 1000);
  }

  get seconds(): number {
    return this.milliseconds / 1000;
  }

  get minutes(): number {
    return this.milliseconds / (60 * 1000);
  }

  isLessThan(other: Duration): boolean {
    return this.milliseconds < other.milliseconds;
  }

  isGreaterThan(other: Duration): boolean {
    return this.milliseconds > other.milliseconds;
  }
}

export enum RetryStrategy {
  NONE = 'none',
  EXPONENTIAL_BACKOFF = 'exponential-backoff',
  LINEAR = 'linear',
  IMMEDIATE = 'immediate'
}

export enum TestEnvironment {
  CI = 'ci',
  LOCAL = 'local',
  STAGING = 'staging'
}

export class TestConfiguration {
  constructor(
    public readonly parallelism: number,
    public readonly timeout: Duration,
    public readonly retryStrategy: RetryStrategy,
    public readonly environment: TestEnvironment
  ) {
    this.validateParallelism(parallelism);
  }

  private validateParallelism(value: number): void {
    if (value < 1 || value > 16) {
      throw new Error('Parallelism must be between 1 and 16');
    }
  }

  static default(): TestConfiguration {
    return new TestConfiguration(
      4,
      Duration.minutes(5),
      RetryStrategy.EXPONENTIAL_BACKOFF,
      TestEnvironment.LOCAL
    );
  }
}

export enum TestCategory {
  PERFORMANCE_LEARNING = 'performance-learning',
  SECURITY_LEARNING = 'security-learning',
  CLI_PERFORMANCE = 'cli-performance',
  CLI_SECURITY = 'cli-security',
  ALL_PACKAGES = 'all-packages'
}
