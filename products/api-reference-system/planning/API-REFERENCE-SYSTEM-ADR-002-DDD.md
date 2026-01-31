# ADR-002: DDD Bounded Contexts for API Reference System

## Status
Proposed

## Context

The API Reference Documentation System needs a clear domain model to handle:
- Documentation generation from multiple source formats
- Multi-format output (Markdown, HTML, JSON, OpenAPI)
- Vector search and semantic indexing
- Example validation and execution
- Neural learning and quality improvement
- Integration with claude-flow ecosystem

Domain-Driven Design (DDD) helps us identify bounded contexts, aggregates, and ubiquitous language to prevent confusion and maintain clean architecture.

## Decision

We will organize the system into **6 bounded contexts** with clear boundaries and responsibilities.

### Bounded Context Map

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────┐                  ┌──────────────────┐   │
│  │   Source Code    │◀────────────────▶│   Documentation  │   │
│  │   Analysis       │  Conformist      │   Generation     │   │
│  │   Context        │  (ACL)           │   Context        │   │
│  └──────────────────┘                  └──────────────────┘   │
│         │                                       │              │
│         │                                       │              │
│         ▼                                       ▼              │
│  ┌──────────────────┐                  ┌──────────────────┐   │
│  │   Validation     │                  │   Publishing     │   │
│  │   Context        │                  │   Context        │   │
│  └──────────────────┘                  └──────────────────┘   │
│         │                                       │              │
│         │                                       │              │
│         ▼                                       ▼              │
│  ┌──────────────────┐                  ┌──────────────────┐   │
│  │   Search &       │◀────────────────▶│   Learning       │   │
│  │   Discovery      │  Partnership     │   Context        │   │
│  │   Context        │                  │                  │   │
│  └──────────────────┘                  └──────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Source Code Analysis Context

**Responsibility**: Parse and extract documentation from TypeScript source code

**Ubiquitous Language**:
- **Source File**: A TypeScript file containing code and TSDoc comments
- **AST (Abstract Syntax Tree)**: Parsed representation of source code
- **Symbol**: A documented entity (class, function, interface, etc.)
- **TSDoc Comment**: Structured documentation comment following TSDoc standard
- **Type Information**: TypeScript type data (generics, unions, intersections)

**Aggregates**:

```typescript
// Aggregate Root
class SourceAnalysis {
  constructor(
    public readonly id: SourceAnalysisId,
    public readonly filePath: FilePath,
    public readonly packageName: PackageName,
    public readonly version: Version,
    private symbols: Symbol[]
  ) {}

  extractSymbols(): Symbol[] {
    return this.symbols;
  }

  findSymbol(name: string): Symbol | null {
    return this.symbols.find(s => s.name === name) || null;
  }

  addSymbol(symbol: Symbol): void {
    this.symbols.push(symbol);
  }
}

// Entity
class Symbol {
  constructor(
    public readonly id: SymbolId,
    public readonly name: string,
    public readonly kind: SymbolKind, // class | function | interface | type
    public readonly declaration: Declaration,
    public readonly tsDocComment: TSDocComment | null,
    public readonly typeParameters: TypeParameter[]
  ) {}
}

// Value Objects
class TSDocComment {
  constructor(
    public readonly summary: string,
    public readonly description: string,
    public readonly parameters: Parameter[],
    public readonly returns: Returns | null,
    public readonly examples: CodeExample[],
    public readonly throws: ThrowsClause[],
    public readonly tags: CustomTag[]
  ) {}
}
```

**Repository**:
```typescript
interface SourceAnalysisRepository {
  save(analysis: SourceAnalysis): Promise<void>;
  findById(id: SourceAnalysisId): Promise<SourceAnalysis | null>;
  findByPackage(packageName: PackageName): Promise<SourceAnalysis[]>;
}
```

**Domain Services**:
```typescript
class TypeScriptParser {
  parse(filePath: FilePath): Promise<SourceAnalysis>;
}

class TSDocExtractor {
  extract(node: ts.Node): TSDocComment | null;
}
```

---

### 2. Documentation Generation Context

**Responsibility**: Transform source analysis into formatted documentation

**Ubiquitous Language**:
- **Documentation**: Generated output in a specific format
- **Template**: Structure for documentation output
- **Renderer**: Converts domain model to output format
- **Section**: Logical part of documentation (e.g., "Methods", "Examples")

**Aggregates**:

```typescript
// Aggregate Root
class Documentation {
  constructor(
    public readonly id: DocumentationId,
    public readonly sourceAnalysis: SourceAnalysisId,
    public readonly format: OutputFormat, // markdown | html | json | openapi
    public readonly version: Version,
    private sections: Section[],
    private metadata: DocumentationMetadata
  ) {}

  addSection(section: Section): void {
    this.sections.push(section);
  }

  render(): string {
    const renderer = RendererFactory.create(this.format);
    return renderer.render(this);
  }
}

// Value Objects
class Section {
  constructor(
    public readonly type: SectionType,
    public readonly title: string,
    public readonly content: Content,
    public readonly order: number
  ) {}
}

enum SectionType {
  Summary = 'summary',
  Constructor = 'constructor',
  Methods = 'methods',
  Properties = 'properties',
  Examples = 'examples',
  SeeAlso = 'see-also'
}
```

**Domain Services**:
```typescript
class MarkdownRenderer implements Renderer {
  render(doc: Documentation): string;
}

class HTMLRenderer implements Renderer {
  render(doc: Documentation): string;
}

class JSONRenderer implements Renderer {
  render(doc: Documentation): string;
}
```

---

### 3. Validation Context

**Responsibility**: Ensure documentation quality and example correctness

**Ubiquitous Language**:
- **Validation**: Process of checking documentation quality
- **Example Execution**: Running code examples to verify correctness
- **Quality Check**: Automated assessment of documentation
- **Validation Rule**: A specific check to perform

**Aggregates**:

```typescript
// Aggregate Root
class ValidationReport {
  constructor(
    public readonly id: ValidationReportId,
    public readonly documentationId: DocumentationId,
    public readonly executedAt: Date,
    private results: ValidationResult[],
    private overallStatus: ValidationStatus
  ) {}

  addResult(result: ValidationResult): void {
    this.results.push(result);
    this.updateOverallStatus();
  }

  isValid(): boolean {
    return this.overallStatus === ValidationStatus.Passed;
  }
}

// Value Objects
enum ValidationRule {
  ExampleCompiles = 'example-compiles',
  ExampleExecutes = 'example-executes',
  NoSecrets = 'no-secrets',
  NoPII = 'no-pii',
  ParameterCoverage = 'parameter-coverage',
  ReturnTypeDocumented = 'return-type-documented'
}
```

**Domain Services**:
```typescript
class ExampleValidator {
  async validate(example: CodeExample): Promise<ValidationResult>;
}

class SecurityValidator {
  async scanForSecrets(code: string): Promise<ValidationResult>;
  async scanForPII(code: string): Promise<ValidationResult>;
}
```

---

### 4. Publishing Context

**Responsibility**: Deliver documentation to various destinations

**Aggregates**:

```typescript
// Aggregate Root
class Publication {
  constructor(
    public readonly id: PublicationId,
    public readonly documentationId: DocumentationId,
    public readonly destination: Destination,
    public readonly version: Version,
    private status: PublicationStatus,
    private publishedAt: Date | null
  ) {}

  publish(): void {
    if (this.status === PublicationStatus.Published) {
      throw new Error('Already published');
    }
    this.status = PublicationStatus.Publishing;
  }

  markPublished(): void {
    this.status = PublicationStatus.Published;
    this.publishedAt = new Date();
  }
}

enum Destination {
  GitHub = 'github',
  Website = 'website',
  NPM = 'npm',
  LocalFileSystem = 'local'
}
```

---

### 5. Search & Discovery Context

**Responsibility**: Enable fast semantic search across documentation

**Aggregates**:

```typescript
// Aggregate Root
class SearchIndex {
  constructor(
    public readonly id: SearchIndexId,
    public readonly packageName: PackageName,
    public readonly version: Version,
    private entries: IndexEntry[],
    private metadata: IndexMetadata
  ) {}

  async addEntry(entry: IndexEntry): Promise<void> {
    this.entries.push(entry);
    await this.reindex();
  }

  async search(query: Query): Promise<SearchResult[]> {
    const embedding = await this.embed(query.text);
    return this.findNearest(embedding, query.limit);
  }
}

// Entities
class IndexEntry {
  constructor(
    public readonly id: IndexEntryId,
    public readonly symbolId: SymbolId,
    public readonly content: string,
    public readonly embedding: Vector,
    public readonly metadata: EntryMetadata
  ) {}
}

// Value Objects
class Query {
  constructor(
    public readonly text: string,
    public readonly limit: number = 10,
    public readonly filters: QueryFilter[] = []
  ) {}
}
```

**Domain Services**:
```typescript
class EmbeddingGenerator {
  async generate(text: string): Promise<Vector>;
  async generateBatch(texts: string[]): Promise<Vector[]>;
}

class HNSWIndexer {
  async build(entries: IndexEntry[]): Promise<void>;
  async search(vector: Vector, k: number): Promise<SearchResult[]>;
}
```

---

### 6. Learning Context

**Responsibility**: Improve documentation quality through neural learning

**Aggregates**:

```typescript
// Aggregate Root
class LearningSession {
  constructor(
    public readonly id: LearningSessionId,
    public readonly startedAt: Date,
    private trajectories: Trajectory[],
    private learnedPatterns: Pattern[],
    private metrics: LearningMetrics
  ) {}

  recordTrajectory(trajectory: Trajectory): void {
    this.trajectories.push(trajectory);
    this.updateMetrics();
  }

  extractPatterns(): Pattern[] {
    const successful = this.trajectories.filter(t => t.wasSuccessful());
    return this.distill(successful);
  }

  applyPattern(pattern: Pattern, context: GenerationContext): string {
    return pattern.apply(context);
  }
}

// Entities
class Trajectory {
  constructor(
    public readonly id: TrajectoryId,
    public readonly generatedDoc: Documentation,
    public readonly feedback: Feedback[],
    public readonly verdict: Verdict
  ) {}

  wasSuccessful(): boolean {
    return this.verdict === Verdict.Success;
  }
}

// Value Objects
class Feedback {
  constructor(
    public readonly source: FeedbackSource,
    public readonly score: number,
    public readonly comments: string
  ) {}
}

enum Verdict {
  Success = 'success',
  Failure = 'failure',
  Partial = 'partial'
}
```

**Domain Services**:
```typescript
class ReasoningBankIntegration {
  async storeTrajectory(trajectory: Trajectory): Promise<void>;
  async retrievePatterns(context: GenerationContext): Promise<Pattern[]>;
}

class TruthScorer {
  async score(doc: Documentation, actualCode: SourceAnalysis): Promise<number>;
}
```

---

## Context Relationships

### 1. Source Code Analysis → Documentation Generation
- **Type**: Conformist (ACL)
- **Flow**: Source analysis provides symbols, documentation consumes them

```typescript
class SymbolToDocumentationMapper {
  map(symbol: Symbol): Documentation {
    const sections = this.createSections(symbol);
    return new Documentation(
      DocumentationId.generate(),
      symbol.sourceAnalysisId,
      OutputFormat.Markdown,
      symbol.version,
      sections,
      this.createMetadata()
    );
  }
}
```

### 2. Documentation Generation → Validation
- **Type**: Customer-Supplier
- **Flow**: Documentation requests validation before publishing

### 3. Search & Discovery ↔ Learning
- **Type**: Partnership
- **Flow**: Bidirectional - search results inform learning, patterns improve search

---

## Domain Events

```typescript
// Source Code Analysis Context
class SourceFileParsed extends DomainEvent {
  constructor(
    public readonly sourceAnalysisId: SourceAnalysisId,
    public readonly symbolCount: number
  ) {}
}

// Documentation Generation Context
class DocumentationGenerated extends DomainEvent {
  constructor(
    public readonly documentationId: DocumentationId,
    public readonly format: OutputFormat
  ) {}
}

// Validation Context
class ValidationCompleted extends DomainEvent {
  constructor(
    public readonly reportId: ValidationReportId,
    public readonly isValid: boolean
  ) {}
}

// Publishing Context
class PublicationCompleted extends DomainEvent {
  constructor(
    public readonly publicationId: PublicationId,
    public readonly url: string
  ) {}
}

// Search & Discovery Context
class IndexUpdated extends DomainEvent {
  constructor(
    public readonly indexId: SearchIndexId,
    public readonly entriesAdded: number
  ) {}
}

// Learning Context
class PatternLearned extends DomainEvent {
  constructor(
    public readonly patternId: PatternId,
    public readonly confidence: number
  ) {}
}
```

---

## Shared Kernel

```typescript
// Common value objects across all contexts
class PackageName {
  constructor(private readonly value: string) {
    if (!value.startsWith('@claude-flow/')) {
      throw new Error('Invalid package name');
    }
  }
}

class Version {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly prerelease?: string
  ) {}

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}${this.prerelease ? `-${this.prerelease}` : ''}`;
  }
}

class FilePath {
  constructor(private readonly value: string) {}

  isTypeScript(): boolean {
    return this.value.endsWith('.ts') || this.value.endsWith('.tsx');
  }
}
```

---

## Aggregate Design Rules

1. **Small Aggregates** - Each aggregate should be as small as possible
2. **Consistency Boundaries** - Aggregates enforce invariants
3. **Reference by ID** - Aggregates reference each other by ID
4. **Eventually Consistent** - Cross-aggregate operations use domain events

---

## Repository Interfaces

```typescript
interface SourceAnalysisRepository {
  save(analysis: SourceAnalysis): Promise<void>;
  findById(id: SourceAnalysisId): Promise<SourceAnalysis | null>;
  findByPackage(packageName: PackageName): Promise<SourceAnalysis[]>;
}

interface DocumentationRepository {
  save(doc: Documentation): Promise<void>;
  findById(id: DocumentationId): Promise<Documentation | null>;
  findBySourceAnalysis(id: SourceAnalysisId): Promise<Documentation[]>;
}

interface ValidationReportRepository {
  save(report: ValidationReport): Promise<void>;
  findById(id: ValidationReportId): Promise<ValidationReport | null>;
  findByDocumentation(id: DocumentationId): Promise<ValidationReport[]>;
}

interface PublicationRepository {
  save(pub: Publication): Promise<void>;
  findById(id: PublicationId): Promise<Publication | null>;
  findPendingPublications(): Promise<Publication[]>;
}

interface SearchIndexRepository {
  save(index: SearchIndex): Promise<void>;
  findById(id: SearchIndexId): Promise<SearchIndex | null>;
  findByPackage(packageName: PackageName): Promise<SearchIndex | null>;
}

interface LearningSessionRepository {
  save(session: LearningSession): Promise<void>;
  findById(id: LearningSessionId): Promise<LearningSession | null>;
  findActive(): Promise<LearningSession | null>;
}
```

---

## Consequences

### Positive
- Clear boundaries - Each context has well-defined responsibilities
- Independent evolution - Contexts can evolve separately
- Testability - Easy to test aggregates in isolation
- Maintainability - Ubiquitous language prevents confusion

### Negative
- Initial complexity - More structure than simple CRUD
- Learning curve - Team must understand DDD concepts
- More code - Value objects, entities, aggregates require boilerplate

## Related Decisions
- ADR-001: Overall System Architecture
- ADR-003: Neural Learning Integration Strategy
- ADR-004: HNSW Search Configuration

## References
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://vaughnvernon.com/)
- [DDD Aggregate Design Canvas](https://github.com/ddd-crew/aggregate-design-canvas)
