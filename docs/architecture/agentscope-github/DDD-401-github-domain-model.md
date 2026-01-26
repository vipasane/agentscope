# DDD-401: GitHub Domain Model

## Status
Accepted

## Context

AgentScope-GitHub operates across multiple GitHub platform concerns that map naturally to Domain-Driven Design (DDD) bounded contexts. Following DDD principles ensures:

1. **Clear Boundaries**: Each context has well-defined responsibilities
2. **Ubiquitous Language**: Domain terms match GitHub's terminology
3. **Encapsulation**: Internal models don't leak across contexts
4. **Independent Evolution**: Contexts can evolve independently
5. **Team Alignment**: Domain experts (GitHub API) align with code structure

### Identified Domains

From analyzing the PRD and GitHub API:

1. **Actions Domain**: GitHub Actions workflow execution
2. **Pull Request Domain**: PR lifecycle, comments, reviews
3. **Code Scanning Domain**: SARIF management, security findings
4. **Repository Domain**: Repository metadata, file access
5. **Security Domain**: Security scanning, vulnerability detection (AgentScope Core)

## Decision

We will implement **3 primary bounded contexts** with clear interfaces:

### Context Map

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────┐                                     │
│  │   Actions     │◄────────────┐                       │
│  │   Context     │              │                       │
│  └───────────────┘              │                       │
│         │                       │                       │
│         │ triggers              │                       │
│         ▼                       │                       │
│  ┌───────────────┐              │ reads                 │
│  │  Repository   │              │                       │
│  │   Context     │──────────────┘                       │
│  └───────────────┘                                     │
│         │                                               │
│         │ provides code                                 │
│         ▼                                               │
│  ┌───────────────┐       ┌──────────────┐             │
│  │   Security    │──────▶│     Code     │             │
│  │   Scanning    │       │   Scanning   │             │
│  │   Context     │       │   Context    │             │
│  └───────────────┘       └──────────────┘             │
│         │                       │                       │
│         │ generates             │ publishes             │
│         │ findings              │ SARIF                 │
│         │                       │                       │
│         ▼                       │                       │
│  ┌───────────────┐              │                       │
│  │ Pull Request  │◄─────────────┘                       │
│  │   Context     │                                     │
│  └───────────────┘                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘

Legend:
◄───── Upstream/Downstream
```

### 1. Actions Context

**Responsibility**: Manage GitHub Actions workflow execution lifecycle

**Aggregates**:

```typescript
// Actions Context - Aggregate Root
export class WorkflowRun {
  readonly id: string;
  readonly repository: RepositoryId;
  readonly ref: string;
  readonly sha: string;
  readonly status: RunStatus;
  readonly startedAt: Date;
  readonly completedAt?: Date;

  private constructor(props: WorkflowRunProps) {
    this.id = props.id;
    this.repository = props.repository;
    this.ref = props.ref;
    this.sha = props.sha;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.completedAt = props.completedAt;
  }

  static create(props: CreateWorkflowRunProps): WorkflowRun {
    return new WorkflowRun({
      ...props,
      status: RunStatus.InProgress,
      startedAt: new Date()
    });
  }

  complete(findings: Finding[]): WorkflowRun {
    return new WorkflowRun({
      ...this,
      status: this.determineStatus(findings),
      completedAt: new Date()
    });
  }

  private determineStatus(findings: Finding[]): RunStatus {
    const hasCritical = findings.some(f => f.severity === 'critical');
    return hasCritical ? RunStatus.Failed : RunStatus.Success;
  }
}

export enum RunStatus {
  Queued = 'queued',
  InProgress = 'in_progress',
  Success = 'success',
  Failed = 'failed',
  Cancelled = 'cancelled'
}
```

**Value Objects**:

```typescript
export class RepositoryId {
  constructor(
    readonly owner: string,
    readonly name: string
  ) {
    if (!owner || !name) {
      throw new Error('Invalid repository ID');
    }
  }

  toString(): string {
    return `${this.owner}/${this.name}`;
  }

  static fromString(id: string): RepositoryId {
    const [owner, name] = id.split('/');
    return new RepositoryId(owner, name);
  }
}

export class GitRef {
  constructor(
    readonly ref: string,
    readonly sha: string
  ) {}

  get branch(): string | null {
    return this.ref.startsWith('refs/heads/')
      ? this.ref.replace('refs/heads/', '')
      : null;
  }

  get isPR(): boolean {
    return this.ref.startsWith('refs/pull/');
  }
}
```

**Domain Services**:

```typescript
export class WorkflowConfigurationService {
  loadConfiguration(
    repository: RepositoryId,
    sha: string
  ): Promise<ScanConfiguration> {
    // Load .agentscope.json from repository
  }

  mergeWithInputs(
    fileConfig: ScanConfiguration,
    workflowInputs: WorkflowInputs
  ): ScanConfiguration {
    // Workflow inputs override file config
  }
}
```

### 2. Pull Request Context

**Responsibility**: Manage pull request lifecycle, comments, and reviews

**Aggregates**:

```typescript
// Pull Request Context - Aggregate Root
export class PullRequest {
  readonly number: number;
  readonly repository: RepositoryId;
  readonly title: string;
  readonly author: Author;
  readonly base: GitRef;
  readonly head: GitRef;
  readonly state: PRState;
  readonly comments: PRComment[];

  private constructor(props: PullRequestProps) {
    Object.assign(this, props);
  }

  static create(props: CreatePRProps): PullRequest {
    return new PullRequest({
      ...props,
      state: PRState.Open,
      comments: []
    });
  }

  addComment(comment: PRComment): PullRequest {
    return new PullRequest({
      ...this,
      comments: [...this.comments, comment]
    });
  }

  updateComment(commentId: string, status: CommentStatus): PullRequest {
    return new PullRequest({
      ...this,
      comments: this.comments.map(c =>
        c.id === commentId ? c.updateStatus(status) : c
      )
    });
  }

  getChangedFiles(): Promise<ChangedFile[]> {
    // Fetch changed files via GitHub API
  }
}

export enum PRState {
  Open = 'open',
  Closed = 'closed',
  Merged = 'merged'
}
```

**Entities**:

```typescript
export class PRComment {
  readonly id: string;
  readonly finding: Finding;
  readonly location: CommentLocation;
  readonly body: string;
  readonly status: CommentStatus;
  readonly createdAt: Date;
  readonly updatedAt?: Date;

  constructor(props: PRCommentProps) {
    Object.assign(this, props);
  }

  updateStatus(status: CommentStatus): PRComment {
    return new PRComment({
      ...this,
      status,
      updatedAt: new Date()
    });
  }

  format(): string {
    return new CommentFormatter().format(this.finding);
  }
}

export enum CommentStatus {
  Active = 'active',
  Fixed = 'fixed',
  StillPresent = 'still_present',
  Resolved = 'resolved'
}
```

**Value Objects**:

```typescript
export class CommentLocation {
  constructor(
    readonly file: string,
    readonly line: number,
    readonly column: number
  ) {}

  equals(other: CommentLocation): boolean {
    return this.file === other.file &&
           this.line === other.line &&
           this.column === other.column;
  }
}

export class ChangedFile {
  constructor(
    readonly path: string,
    readonly status: FileStatus,
    readonly additions: number,
    readonly deletions: number,
    readonly patch?: string
  ) {}

  get isModified(): boolean {
    return this.status === FileStatus.Modified;
  }

  get isNew(): boolean {
    return this.status === FileStatus.Added;
  }
}

export enum FileStatus {
  Added = 'added',
  Modified = 'modified',
  Removed = 'removed',
  Renamed = 'renamed'
}
```

**Domain Services**:

```typescript
export class CommentManager {
  async postInlineComments(
    pr: PullRequest,
    findings: Finding[]
  ): Promise<void> {
    const grouped = this.groupFindingsByFile(findings);

    for (const [file, fileFindings] of grouped) {
      const comment = this.createGroupedComment(fileFindings);
      await this.githubAPI.postComment(pr, file, comment);
    }
  }

  async updateExistingComments(
    pr: PullRequest,
    previousFindings: Finding[],
    currentFindings: Finding[]
  ): Promise<void> {
    // Compare findings, update comment statuses
  }

  private groupFindingsByFile(
    findings: Finding[]
  ): Map<string, Finding[]> {
    // Group findings by file location
  }
}
```

### 3. Code Scanning Context

**Responsibility**: Manage SARIF generation and Code Scanning integration

**Aggregates**:

```typescript
// Code Scanning Context - Aggregate Root
export class SARIFReport {
  readonly version: string = '2.1.0';
  readonly tool: ToolMetadata;
  readonly results: SARIFResult[];
  readonly invocations: Invocation[];

  private constructor(props: SARIFReportProps) {
    Object.assign(this, props);
  }

  static fromFindings(
    findings: Finding[],
    tool: ToolMetadata
  ): SARIFReport {
    return new SARIFReport({
      version: '2.1.0',
      tool,
      results: findings.map(f => SARIFResult.fromFinding(f)),
      invocations: []
    });
  }

  toJSON(): object {
    return {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: this.version,
      runs: [
        {
          tool: this.tool.toJSON(),
          results: this.results.map(r => r.toJSON()),
          invocations: this.invocations.map(i => i.toJSON())
        }
      ]
    };
  }

  validate(): ValidationResult {
    // Validate against SARIF 2.1.0 schema
  }

  optimize(): SARIFReport {
    // Apply size optimizations if needed
    return SARIFOptimizer.optimize(this);
  }
}
```

**Entities**:

```typescript
export class SARIFResult {
  readonly ruleId: string;
  readonly level: ResultLevel;
  readonly message: ResultMessage;
  readonly locations: ResultLocation[];
  readonly fixes: Fix[];

  private constructor(props: SARIFResultProps) {
    Object.assign(this, props);
  }

  static fromFinding(finding: Finding): SARIFResult {
    return new SARIFResult({
      ruleId: finding.ruleId,
      level: this.mapSeverityToLevel(finding.severity),
      message: new ResultMessage(finding.message, finding.markdownMessage),
      locations: [ResultLocation.fromFindingLocation(finding.location)],
      fixes: finding.fixSuggestion ? [Fix.fromSuggestion(finding.fixSuggestion)] : []
    });
  }

  private static mapSeverityToLevel(severity: string): ResultLevel {
    const mapping = {
      critical: ResultLevel.Error,
      high: ResultLevel.Error,
      medium: ResultLevel.Warning,
      low: ResultLevel.Note
    };
    return mapping[severity] || ResultLevel.Warning;
  }

  toJSON(): object {
    return {
      ruleId: this.ruleId,
      level: this.level,
      message: this.message.toJSON(),
      locations: this.locations.map(l => l.toJSON()),
      fixes: this.fixes.map(f => f.toJSON())
    };
  }
}

export enum ResultLevel {
  Error = 'error',
  Warning = 'warning',
  Note = 'note',
  None = 'none'
}
```

**Value Objects**:

```typescript
export class ToolMetadata {
  constructor(
    readonly name: string,
    readonly version: string,
    readonly informationUri: string,
    readonly rules: Rule[]
  ) {}

  toJSON(): object {
    return {
      driver: {
        name: this.name,
        version: this.version,
        informationUri: this.informationUri,
        rules: this.rules.map(r => r.toJSON())
      }
    };
  }
}

export class Rule {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly shortDescription: string,
    readonly fullDescription: string,
    readonly helpUri: string,
    readonly properties: RuleProperties
  ) {}

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      shortDescription: { text: this.shortDescription },
      fullDescription: { text: this.fullDescription },
      helpUri: this.helpUri,
      properties: this.properties
    };
  }
}
```

**Domain Services**:

```typescript
export class SARIFUploader {
  async upload(
    report: SARIFReport,
    repository: RepositoryId,
    sha: string
  ): Promise<UploadResult> {
    const validated = report.validate();
    if (!validated.isValid) {
      throw new Error(`Invalid SARIF: ${validated.errors.join(', ')}`);
    }

    const optimized = report.optimize();

    return this.githubAPI.uploadSARIF(
      repository,
      sha,
      optimized.toJSON()
    );
  }
}

export class SARIFOptimizer {
  static optimize(report: SARIFReport): SARIFReport {
    // Apply size optimizations
    // 1. Truncate long snippets
    // 2. Remove optional fields
    // 3. Prioritize critical findings
  }
}
```

### 4. Security Scanning Context (Shared Kernel)

**Responsibility**: Core security scanning logic (shared with AgentScope Core)

**Aggregates**:

```typescript
// Shared Kernel - Security Context
export class ScanResult {
  readonly repository: RepositoryId;
  readonly sha: string;
  readonly findings: Finding[];
  readonly metrics: ScanMetrics;
  readonly timestamp: Date;

  constructor(props: ScanResultProps) {
    Object.assign(this, props);
  }

  filterBySeverity(
    threshold: Severity
  ): ScanResult {
    const filtered = this.findings.filter(
      f => f.severity >= threshold
    );
    return new ScanResult({ ...this, findings: filtered });
  }

  groupByRule(): Map<string, Finding[]> {
    const grouped = new Map<string, Finding[]>();
    for (const finding of this.findings) {
      if (!grouped.has(finding.ruleId)) {
        grouped.set(finding.ruleId, []);
      }
      grouped.get(finding.ruleId)!.push(finding);
    }
    return grouped;
  }
}
```

**Entities**:

```typescript
export class Finding {
  readonly id: string;
  readonly ruleId: string;
  readonly severity: Severity;
  readonly message: string;
  readonly markdownMessage: string;
  readonly location: FindingLocation;
  readonly fixSuggestion?: FixSuggestion;
  readonly cwe?: string[];

  constructor(props: FindingProps) {
    Object.assign(this, props);
  }

  equals(other: Finding): boolean {
    return this.ruleId === other.ruleId &&
           this.location.equals(other.location);
  }
}

export enum Severity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}
```

**Value Objects**:

```typescript
export class FindingLocation {
  constructor(
    readonly file: string,
    readonly line: number,
    readonly column: number,
    readonly endLine?: number,
    readonly endColumn?: number,
    readonly snippet?: string
  ) {}

  equals(other: FindingLocation): boolean {
    return this.file === other.file &&
           this.line === other.line &&
           this.column === other.column;
  }
}

export class FixSuggestion {
  constructor(
    readonly description: string,
    readonly code: string
  ) {}
}

export class ScanMetrics {
  constructor(
    readonly filesScanned: number,
    readonly rulesExecuted: number,
    readonly duration: number, // milliseconds
    readonly tokensUsed?: number
  ) {}
}
```

### Context Integration Points

**Anti-Corruption Layer** (between GitHub API and domain):

```typescript
// Adapter for GitHub API
export class GitHubAPIAdapter {
  async fetchPullRequest(
    repository: RepositoryId,
    number: number
  ): Promise<PullRequest> {
    // Fetch from GitHub API
    const githubPR = await this.octokit.pulls.get({
      owner: repository.owner,
      repo: repository.name,
      pull_number: number
    });

    // Convert to domain model
    return this.toDomainPR(githubPR.data);
  }

  private toDomainPR(githubPR: any): PullRequest {
    return PullRequest.create({
      number: githubPR.number,
      repository: new RepositoryId(
        githubPR.base.repo.owner.login,
        githubPR.base.repo.name
      ),
      title: githubPR.title,
      author: new Author(githubPR.user.login),
      base: new GitRef(githubPR.base.ref, githubPR.base.sha),
      head: new GitRef(githubPR.head.ref, githubPR.head.sha)
    });
  }
}
```

## Consequences

### Positive

1. **Clear Boundaries**: Each context has well-defined responsibilities
2. **Testability**: Domain logic isolated from GitHub API (easy to mock)
3. **Maintainability**: Changes in one context don't affect others
4. **Ubiquitous Language**: Code matches GitHub's domain terminology
5. **Type Safety**: Value objects prevent invalid states
6. **Evolution**: Contexts can evolve independently

### Negative

1. **Complexity**: DDD adds layers vs. simple procedural code
   - **Mitigation**: Complexity justified by maintainability gains
2. **Learning Curve**: Team must understand DDD patterns
   - **Mitigation**: Comprehensive documentation, examples

### Neutral

1. **Code Volume**: More files/classes vs. monolithic approach
2. **Abstraction**: Anti-corruption layer adds indirection

## Related Decisions

- ADR-401: Native GitHub Integration Architecture
- ADR-402: GitHub Actions Workflow Design
- ADR-403: PR Comment Management

## References

- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design (Vaughn Vernon)](https://vaughnvernon.com/)
- [GitHub REST API](https://docs.github.com/en/rest)
- [TypeScript DDD Example](https://github.com/stemmlerjs/ddd-forum)
