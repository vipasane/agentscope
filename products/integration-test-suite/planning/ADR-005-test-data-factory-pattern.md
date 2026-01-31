# ADR-005: Test Data Factory Pattern

## Status
Proposed

## Context

Integration tests need realistic, consistent test data that spans multiple packages. Manual data creation is error-prone and time-consuming.

## Decision

### Factory Pattern Implementation

```typescript
// products/integration-test-suite/factories/BaseFactory.ts
export abstract class BaseFactory<T> {
  protected abstract create(): T
  
  build(): T {
    return this.create()
  }
  
  buildMany(count: number): T[] {
    return Array.from({ length: count }, () => this.create())
  }
}

// products/integration-test-suite/factories/PerformanceDataFactory.ts
export class PerformanceDataFactory extends BaseFactory<PerformanceTestData> {
  protected create(): PerformanceTestData {
    return {
      vectors: this.generateVectors(1000),
      cacheConfig: this.generateCacheConfig(),
      benchmarkMetrics: this.generateMetrics()
    }
  }
  
  withFlashAttention(): this {
    // Configure for Flash Attention tests
    return this
  }
  
  withHNSW(): this {
    // Configure for HNSW tests
    return this
  }
}

// products/integration-test-suite/factories/SecurityDataFactory.ts
export class SecurityDataFactory extends BaseFactory<SecurityTestData> {
  protected create(): SecurityTestData {
    return {
      validInputs: this.generateValidInputs(),
      maliciousInputs: this.generateMaliciousInputs(),
      secretPatterns: this.generateSecretPatterns()
    }
  }
  
  withInjectionAttempts(): this {
    // Add SQL/command injection patterns
    return this
  }
  
  withPathTraversal(): this {
    // Add path traversal patterns
    return this
  }
}
```

### Builder Pattern for Complex Scenarios

```typescript
export class IntegrationScenarioBuilder {
  private scenario: Partial<IntegrationScenario> = {}
  
  withPerformance(config: PerformanceConfig): this {
    this.scenario.performance = config
    return this
  }
  
  withSecurity(config: SecurityConfig): this {
    this.scenario.security = config
    return this
  }
  
  withLearning(config: LearningConfig): this {
    this.scenario.learning = config
    return this
  }
  
  withCLI(config: CLIConfig): this {
    this.scenario.cli = config
    return this
  }
  
  build(): IntegrationScenario {
    if (!this.validate()) {
      throw new Error('Invalid scenario configuration')
    }
    return this.scenario as IntegrationScenario
  }
}
```

### Realistic Data Generation

Use **Faker.js alternative** (lightweight):

```typescript
class RealisticDataGenerator {
  generateCommand(): string {
    const commands = [
      'agent spawn --type coder',
      'memory search --query "patterns"',
      'hooks route --task "implement feature"'
    ]
    return commands[Math.floor(Math.random() * commands.length)]
  }
  
  generateVectors(count: number, dimensions: number = 768): number[][] {
    return Array.from({ length: count }, () =>
      Array.from({ length: dimensions }, () => Math.random())
    )
  }
  
  generateMaliciousInput(): string {
    const patterns = [
      '; rm -rf /',
      '../../etc/passwd',
      '<script>alert("xss")</script>',
      'AKIAIOSFODNN7EXAMPLE'
    ]
    return patterns[Math.floor(Math.random() * patterns.length)]
  }
}
```

## Consequences

### Positive
✅ Consistent test data
✅ Reduced test duplication
✅ Easy to create complex scenarios
✅ Maintainable and extensible

### Negative
⚠️ Additional abstraction layer
⚠️ Learning curve for factory API

## References
- Factory Pattern: Gang of Four Design Patterns
- Builder Pattern: Effective Java

## Metadata
- **Author**: AgentScope Team
- **Date**: 2026-01-30
