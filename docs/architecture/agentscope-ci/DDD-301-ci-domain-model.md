# DDD-301: CI/CD Domain Model

## Status
Proposed

## Context

AgentScope-CI needs a clear domain model following Domain-Driven Design (DDD) principles to:

1. **Separate Concerns**: Policy, Enforcement, Reporting are distinct bounded contexts
2. **Ensure Consistency**: Aggregates maintain invariants
3. **Enable Testing**: Clear boundaries facilitate unit testing
4. **Support Evolution**: Domain model can evolve independently

### DDD Principles Applied

- **Bounded Contexts**: Clear boundaries between Policy, Enforcement, Reporting
- **Aggregates**: Root entities with consistency boundaries
- **Value Objects**: Immutable objects (PolicyConfig, Violation)
- **Domain Services**: Cross-aggregate operations
- **Repositories**: Data access abstractions

## Decision

Define **3 bounded contexts** with clear aggregates and services.

### 1. Domain Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  AgentScope-CI Domain                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Policy Context   │  │ Enforcement      │  │ Reporting │ │
│  │                  │  │ Context          │  │ Context   │ │
│  │ - PolicyConfig   │──│ - ScanSession    │──│ - Report  │ │
│  │ - PolicyRule     │  │ - Violation      │  │ - Format  │ │
│  │ - Override       │  │ - Cache          │  │           │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Bounded Context: Policy

**Purpose**: Define and manage security policies

#### Aggregates

##### PolicyConfig (Aggregate Root)

```typescript
// domain/policy/policy-config.ts
export class PolicyConfig {
  constructor(
    private readonly id: PolicyId,
    private version: string,
    private mode: PolicyMode,
    private policies: Policies,
    private overrides: Override[]
  ) {}

  // Query methods
  getId(): PolicyId {
    return this.id;
  }

  getMode(): PolicyMode {
    return this.mode;
  }

  getPolicies(): Policies {
    return this.policies;
  }

  getOverrides(): Override[] {
    return this.overrides;
  }

  // Command methods
  updateMode(mode: PolicyMode): void {
    this.mode = mode;
  }

  addOverride(override: Override): void {
    this.overrides.push(override);
  }

  removeOverride(path: string): void {
    this.overrides = this.overrides.filter(o => o.path !== path);
  }

  // Domain logic
  shouldBlock(violation: Violation): boolean {
    // Apply overrides first
    const override = this.findOverride(violation.file);
    if (override) {
      return override.shouldBlock(violation, this.mode);
    }

    // Apply default policy
    return this.policies.shouldBlock(violation, this.mode);
  }

  private findOverride(filePath: string): Override | null {
    return this.overrides.find(o => this.matchPath(filePath, o.path)) || null;
  }

  private matchPath(filePath: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(filePath);
  }
}
```

##### PolicyId (Value Object)

```typescript
// domain/policy/policy-id.ts
export class PolicyId {
  private readonly value: string;

  constructor(organization: string, team: string, repository: string) {
    this.value = `${organization}:${team}:${repository}`;
  }

  toString(): string {
    return this.value;
  }

  equals(other: PolicyId): boolean {
    return this.value === other.value;
  }
}
```

##### PolicyMode (Value Object)

```typescript
// domain/policy/policy-mode.ts
export enum PolicyModeType {
  AUDIT = 'audit',
  WARNING = 'warning',
  BLOCKING = 'blocking'
}

export class PolicyMode {
  private readonly mode: PolicyModeType;

  constructor(mode: PolicyModeType) {
    this.mode = mode;
  }

  isAudit(): boolean {
    return this.mode === PolicyModeType.AUDIT;
  }

  isWarning(): boolean {
    return this.mode === PolicyModeType.WARNING;
  }

  isBlocking(): boolean {
    return this.mode === PolicyModeType.BLOCKING;
  }

  shouldFailOnWarnings(): boolean {
    return this.mode === PolicyModeType.BLOCKING;
  }

  toString(): string {
    return this.mode;
  }
}
```

##### Policies (Value Object)

```typescript
// domain/policy/policies.ts
export class Policies {
  constructor(
    private readonly security: SecurityPolicy,
    private readonly secrets: SecretsPolicy,
    private readonly promptInjection: PromptInjectionPolicy,
    private readonly mcpServers: McpServersPolicy,
    private readonly permissions: PermissionsPolicy
  ) {}

  shouldBlock(violation: Violation, mode: PolicyMode): boolean {
    switch (violation.type) {
      case 'DREAD_SCORE_EXCEEDED':
        return this.security.shouldBlock(violation);
      case 'SECRET_EXPOSURE':
        return this.secrets.shouldBlock(violation);
      case 'PROMPT_INJECTION':
        return this.promptInjection.shouldBlock(violation);
      case 'UNAPPROVED_MCP_SERVER':
        return this.mcpServers.shouldBlock(violation);
      case 'PERMISSION_VIOLATION':
        return this.permissions.shouldBlock(violation);
      default:
        // Unknown violation type - default to severity-based blocking
        return violation.severity === 'critical' ||
               (violation.severity === 'high' && mode.shouldFailOnWarnings());
    }
  }
}
```

##### Override (Value Object)

```typescript
// domain/policy/override.ts
export class Override {
  constructor(
    private readonly path: string,
    private readonly mode: PolicyMode,
    private readonly policies?: Policies
  ) {}

  shouldBlock(violation: Violation, defaultMode: PolicyMode): boolean {
    // Use override mode, or fall back to default
    const effectiveMode = this.mode || defaultMode;

    // Use override policies if defined
    if (this.policies) {
      return this.policies.shouldBlock(violation, effectiveMode);
    }

    // Fall back to default severity-based blocking
    return violation.severity === 'critical' ||
           (violation.severity === 'high' && effectiveMode.shouldFailOnWarnings());
  }

  getPath(): string {
    return this.path;
  }
}
```

#### Repository

```typescript
// domain/policy/policy-repository.ts
export interface PolicyRepository {
  /**
   * Find policy by ID
   */
  findById(id: PolicyId): Promise<PolicyConfig | null>;

  /**
   * Save policy
   */
  save(policy: PolicyConfig): Promise<void>;

  /**
   * Load policy chain (org → team → repo)
   */
  loadChain(repoPath: string): Promise<PolicyConfig>;

  /**
   * Search for similar policies
   */
  findSimilar(policy: PolicyConfig, k: number): Promise<PolicyConfig[]>;
}
```

### 3. Bounded Context: Enforcement

**Purpose**: Execute scans and enforce policies

#### Aggregates

##### ScanSession (Aggregate Root)

```typescript
// domain/enforcement/scan-session.ts
export class ScanSession {
  private violations: Violation[] = [];
  private scannedFiles: string[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    private readonly id: SessionId,
    private readonly policy: PolicyConfig,
    private readonly startTime: Date
  ) {}

  // Query methods
  getId(): SessionId {
    return this.id;
  }

  getViolations(): Violation[] {
    return [...this.violations]; // Return copy
  }

  getScannedFiles(): string[] {
    return [...this.scannedFiles];
  }

  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }

  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }

  // Command methods
  addViolation(violation: Violation): void {
    this.violations.push(violation);
  }

  recordScan(filePath: string, fromCache: boolean): void {
    this.scannedFiles.push(filePath);
    if (fromCache) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  // Domain logic
  determineExitCode(): ExitCode {
    // Critical violations always fail
    if (this.hasCriticalViolations()) {
      return ExitCode.CRITICAL;
    }

    // Warnings only fail in blocking mode
    if (this.hasWarnings()) {
      return this.policy.getMode().shouldFailOnWarnings()
        ? ExitCode.WARNINGS
        : ExitCode.SUCCESS;
    }

    return ExitCode.SUCCESS;
  }

  hasCriticalViolations(): boolean {
    return this.violations.some(v => v.severity === 'critical');
  }

  hasWarnings(): boolean {
    return this.violations.some(v =>
      v.severity === 'high' || v.severity === 'medium'
    );
  }

  filterViolationsByMode(): Violation[] {
    // Apply policy mode filtering
    return this.violations.filter(v =>
      this.policy.shouldBlock(v)
    );
  }
}
```

##### SessionId (Value Object)

```typescript
// domain/enforcement/session-id.ts
export class SessionId {
  private readonly value: string;

  constructor(value?: string) {
    this.value = value || this.generateId();
  }

  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toString(): string {
    return this.value;
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }
}
```

##### Violation (Value Object)

```typescript
// domain/enforcement/violation.ts
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export class Violation {
  constructor(
    public readonly severity: Severity,
    public readonly type: string,
    public readonly policy: string,
    public readonly file: string,
    public readonly line: number | undefined,
    public readonly message: string,
    public readonly remediation: string,
    public readonly dreadScore?: number
  ) {}

  isCritical(): boolean {
    return this.severity === 'critical';
  }

  isHigh(): boolean {
    return this.severity === 'high';
  }

  isWarning(): boolean {
    return this.severity === 'high' || this.severity === 'medium';
  }

  getLocation(): string {
    return this.line ? `${this.file}:${this.line}` : this.file;
  }
}
```

##### CacheEntry (Value Object)

```typescript
// domain/enforcement/cache-entry.ts
export class CacheEntry {
  constructor(
    private readonly fileHash: string,
    private readonly policyHash: string,
    private readonly violations: Violation[],
    private readonly timestamp: Date,
    private readonly ttl: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ) {}

  isExpired(): boolean {
    return Date.now() - this.timestamp.getTime() > this.ttl;
  }

  getViolations(): Violation[] {
    return [...this.violations];
  }

  matches(fileHash: string, policyHash: string): boolean {
    return this.fileHash === fileHash && this.policyHash === policyHash;
  }
}
```

#### Domain Services

```typescript
// domain/enforcement/policy-enforcer.ts
export class PolicyEnforcer {
  constructor(
    private readonly scanService: ScanService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Enforce policy on files (domain service)
   */
  async enforce(
    session: ScanSession,
    files: string[],
    policy: PolicyConfig
  ): Promise<void> {
    for (const file of files) {
      // Try cache first
      const cached = await this.cacheService.get(file, policy);

      if (cached && !cached.isExpired()) {
        // Use cached violations
        for (const v of cached.getViolations()) {
          session.addViolation(v);
        }
        session.recordScan(file, true);
      } else {
        // Run scan
        const scanResult = await this.scanService.scan(file);

        // Convert to violations
        const violations = this.convertToViolations(scanResult, policy);

        for (const v of violations) {
          session.addViolation(v);
        }

        // Cache result
        await this.cacheService.set(file, policy, violations);

        session.recordScan(file, false);
      }
    }
  }

  private convertToViolations(
    scanResult: ScanResult,
    policy: PolicyConfig
  ): Violation[] {
    const violations: Violation[] = [];

    for (const issue of scanResult.issues) {
      const violation = new Violation(
        issue.severity,
        issue.type,
        this.inferPolicy(issue.type),
        issue.file,
        issue.line,
        issue.message,
        issue.remediation || 'No remediation provided',
        issue.dreadScore
      );

      violations.push(violation);
    }

    return violations;
  }

  private inferPolicy(type: string): string {
    const policyMap: Record<string, string> = {
      DREAD_SCORE_EXCEEDED: 'security.maxDreadScore',
      SECRET_EXPOSURE: 'secrets.allowHardcodedSecrets',
      PROMPT_INJECTION: 'promptInjection.confidenceThreshold',
      UNAPPROVED_MCP_SERVER: 'mcpServers.allowed',
      PERMISSION_VIOLATION: 'permissions.requireDefaultMode'
    };

    return policyMap[type] || 'unknown';
  }
}
```

#### Repository

```typescript
// domain/enforcement/cache-repository.ts
export interface CacheRepository {
  /**
   * Get cached entry
   */
  get(fileHash: string, policyHash: string): Promise<CacheEntry | null>;

  /**
   * Set cache entry
   */
  set(entry: CacheEntry): Promise<void>;

  /**
   * Invalidate all entries
   */
  invalidateAll(): Promise<void>;

  /**
   * Invalidate entries for policy
   */
  invalidatePolicy(policyHash: string): Promise<void>;
}
```

### 4. Bounded Context: Reporting

**Purpose**: Generate reports in multiple formats

#### Aggregates

##### Report (Aggregate Root)

```typescript
// domain/reporting/report.ts
export class Report {
  constructor(
    private readonly id: ReportId,
    private readonly session: ScanSession,
    private readonly policy: PolicyConfig,
    private readonly timestamp: Date
  ) {}

  // Query methods
  getId(): ReportId {
    return this.id;
  }

  getSession(): ScanSession {
    return this.session;
  }

  getExitCode(): ExitCode {
    return this.session.determineExitCode();
  }

  getSummary(): ViolationSummary {
    const violations = this.session.getViolations();

    return new ViolationSummary(
      violations.filter(v => v.severity === 'critical').length,
      violations.filter(v => v.severity === 'high').length,
      violations.filter(v => v.severity === 'medium').length,
      violations.filter(v => v.severity === 'low').length
    );
  }

  // Domain logic
  generateOutput(format: ReportFormat): ReportOutput {
    const data = {
      violations: this.session.getViolations(),
      policy: this.policy,
      exitCode: this.getExitCode(),
      timestamp: this.timestamp,
      duration: this.session.getDuration(),
      scannedFiles: this.session.getScannedFiles()
    };

    return format.generate(data);
  }
}
```

##### ReportId (Value Object)

```typescript
// domain/reporting/report-id.ts
export class ReportId {
  private readonly value: string;

  constructor(value?: string) {
    this.value = value || this.generateId();
  }

  private generateId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toString(): string {
    return this.value;
  }
}
```

##### ViolationSummary (Value Object)

```typescript
// domain/reporting/violation-summary.ts
export class ViolationSummary {
  constructor(
    public readonly critical: number,
    public readonly high: number,
    public readonly medium: number,
    public readonly low: number
  ) {}

  getTotal(): number {
    return this.critical + this.high + this.medium + this.low;
  }

  hasCritical(): boolean {
    return this.critical > 0;
  }

  hasWarnings(): boolean {
    return this.high > 0 || this.medium > 0;
  }
}
```

##### ReportFormat (Strategy Pattern)

```typescript
// domain/reporting/report-format.ts
export interface ReportFormat {
  generate(data: ReportData): ReportOutput;
}

export class ConsoleFormat implements ReportFormat {
  generate(data: ReportData): ReportOutput {
    // Implementation in ConsoleReporter
    return new ReportOutput('console', consoleText);
  }
}

export class JSONFormat implements ReportFormat {
  generate(data: ReportData): ReportOutput {
    // Implementation in JSONReporter
    return new ReportOutput('json', jsonObject);
  }
}

// ... other formats
```

##### ReportOutput (Value Object)

```typescript
// domain/reporting/report-output.ts
export class ReportOutput {
  constructor(
    public readonly format: string,
    public readonly content: string | object
  ) {}

  toString(): string {
    if (typeof this.content === 'string') {
      return this.content;
    }
    return JSON.stringify(this.content, null, 2);
  }

  toObject(): object {
    if (typeof this.content === 'object') {
      return this.content;
    }
    return { text: this.content };
  }
}
```

### 5. Context Map

```
┌─────────────────┐
│ Policy Context  │
│                 │
│ - PolicyConfig  │
│ - PolicyRule    │
│ - Override      │
└────────┬────────┘
         │
         │ Upstream (provides policy)
         ▼
┌─────────────────────┐
│ Enforcement Context │
│                     │
│ - ScanSession       │
│ - Violation         │◄──────────┐
│ - Cache             │           │
└────────┬────────────┘           │
         │                        │
         │ Upstream (provides violations)
         ▼                        │
┌─────────────────┐               │
│ Reporting       │               │
│ Context         │               │
│                 │               │
│ - Report        │               │
│ - Format        │───────────────┘
│ - Output        │ Shared Kernel (Violation)
└─────────────────┘
```

### 6. Anti-Corruption Layer

```typescript
// infrastructure/anti-corruption/agentscope-adapter.ts
export class AgentScopeAdapter {
  /**
   * Adapt AgentScope ScanResult to domain Violation[]
   */
  adaptScanResult(scanResult: ScanResult): Violation[] {
    return scanResult.issues.map(issue => new Violation(
      issue.severity as Severity,
      issue.type,
      this.inferPolicy(issue.type),
      issue.file,
      issue.line,
      issue.message,
      issue.remediation || 'No remediation provided',
      issue.dreadScore
    ));
  }

  private inferPolicy(type: string): string {
    // Map AgentScope issue types to policies
    // ...
  }
}
```

## Consequences

### Positive

1. **Clear Boundaries**: Each bounded context has single responsibility
2. **Testable**: Aggregates and value objects are easy to unit test
3. **Immutable**: Value objects prevent accidental mutations
4. **Consistency**: Aggregates maintain invariants
5. **Separation**: Anti-corruption layer isolates from AgentScope changes
6. **Domain-Driven**: Business logic in domain, not infrastructure

### Negative

1. **Complexity**: More types and abstractions than simple implementation
2. **Boilerplate**: Value objects require more code
3. **Learning Curve**: Team needs to understand DDD concepts

### Neutral

1. **Repository Pattern**: Abstraction allows swapping storage implementations
2. **Domain Services**: Handle cross-aggregate operations
3. **Context Map**: Documents relationships between contexts

## Related Decisions

- ADR-301: CI/CD Integration Architecture (overall architecture)
- ADR-302: Policy Engine Design (Policy context)
- ADR-305: Caching Strategy (Enforcement context)
- ADR-306: Reporting Formats (Reporting context)

## References

- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design (Vaughn Vernon)](https://vaughnvernon.com/)
- [Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html)
- [Aggregates](https://martinfowler.com/bliki/DDD_Aggregate.html)
