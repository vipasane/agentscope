**Architecture Guide**

# API Reference System Architecture

## Overview

The API Reference Documentation System is built using Domain-Driven Design (DDD) principles with clear bounded contexts and separation of concerns.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   CLI Interface                             │
│  (generate, watch, search, validate commands)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Documentation Generator                        │
│  (Orchestrates parsing, rendering, validation)              │
└─────┬───────┬───────┬───────┬───────┬─────────────────────┘
      │       │       │       │       │
      ▼       ▼       ▼       ▼       ▼
┌─────────┐ ┌────┐ ┌────┐ ┌────┐ ┌────────┐
│ Parser  │ │Gen │ │Val │ │Pub │ │ Search │
│ Context │ │Ctx │ │Ctx │ │Ctx │ │ Context│
└─────────┘ └────┘ └────┘ └────┘ └────────┘
```

## Bounded Contexts

### 1. Source Code Analysis Context

**Responsibility**: Parse TypeScript and extract symbols

**Key Components**:
- `TypeScriptParser` - Uses TS Compiler API
- `TSDocExtractor` - Parses TSDoc comments
- `SourceAnalysis` - Aggregate root
- `Symbol` - Entity for code symbols

**Flow**:
1. Load TypeScript file
2. Create TS program with compiler options
3. Visit AST nodes
4. Extract symbols (classes, functions, interfaces, etc.)
5. Parse TSDoc comments
6. Build SourceAnalysis aggregate

### 2. Documentation Generation Context

**Responsibility**: Transform source analysis into documentation

**Key Components**:
- `Documentation` - Aggregate root
- `MarkdownRenderer` - Generates Markdown
- `JSONRenderer` - Generates JSON
- `HTMLRenderer` - Generates HTML (Vitepress)
- `OpenAPIRenderer` - Generates OpenAPI specs

**Flow**:
1. Receive SourceAnalysis
2. Create Documentation aggregate
3. Add sections (summary, parameters, examples, etc.)
4. Render with chosen renderer
5. Write to output directory

### 3. Validation Context

**Responsibility**: Ensure documentation quality

**Key Components**:
- `ExampleValidator` - Validates code examples
- `SecurityValidator` - Scans for secrets/PII
- `ValidationReport` - Aggregate root

**Flow**:
1. Extract code examples from TSDoc
2. Compile with TypeScript
3. Scan for secrets (API keys, tokens)
4. Scan for PII (emails, phone numbers)
5. Generate validation report

### 4. Search & Discovery Context

**Responsibility**: Enable fast semantic search

**Key Components**:
- `HNSWIndexer` - HNSW algorithm implementation
- `EmbeddingGenerator` - Generate vector embeddings
- `SemanticSearchService` - High-level search API
- `SearchIndex` - Aggregate root

**Flow**:
1. Extract searchable content from symbols
2. Generate embeddings via API
3. Build HNSW index
4. Query with semantic search
5. Return ranked results

### 5. Watch Context

**Responsibility**: Monitor file changes

**Key Components**:
- `DocWatcher` - File system watcher
- `chokidar` - File watching library

**Flow**:
1. Watch source directory
2. Detect file changes (add/modify/delete)
3. Debounce rapid changes
4. Trigger regeneration
5. Update documentation

## Data Flow

```
Source Files (.ts)
    │
    ▼
TypeScript Parser
    │
    ▼
Source Analysis (Domain Model)
    │
    ├──▶ Validation ──▶ Reports
    │
    ├──▶ Generation ──▶ Documentation
    │                       │
    │                       ├──▶ Markdown
    │                       ├──▶ HTML
    │                       ├──▶ JSON
    │                       └──▶ OpenAPI
    │
    └──▶ Indexing ──▶ Search Index
                          │
                          ▼
                    Search Results
```

## Key Design Patterns

### Domain-Driven Design (DDD)

**Aggregates**:
- `SourceAnalysis` - Root for source code entities
- `Documentation` - Root for generated docs
- `ValidationReport` - Root for validation results
- `SearchIndex` - Root for search entries

**Value Objects**:
- `PackageName` - Validated package identifier
- `Version` - Semantic version
- `FilePath` - File system path
- `TSDocComment` - Structured documentation

**Repositories**:
- `SourceAnalysisRepository` - Persistence interface
- `DocumentationRepository` - Documentation storage
- `SearchIndexRepository` - Index persistence

### Event-Driven Architecture

**Domain Events**:
- `SourceFileParsed` - Emitted after parsing
- `DocumentationGenerated` - After rendering
- `ValidationCompleted` - After validation
- `IndexUpdated` - After search indexing

**Event Bus**:
```typescript
eventBus.subscribe('SourceFileParsed', (event) => {
  // Trigger validation
  // Update search index
});
```

### Strategy Pattern

**Renderers**:
```typescript
interface Renderer {
  render(doc: Documentation): string;
}

class MarkdownRenderer implements Renderer { ... }
class JSONRenderer implements Renderer { ... }
class HTMLRenderer implements Renderer { ... }
```

### Template Method Pattern

**Parser**:
```typescript
abstract class BaseParser {
  parse() {
    this.loadFile();
    this.parseAST();
    this.extractSymbols();
    this.buildAnalysis();
  }

  abstract extractSymbols(): void;
}
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Parsing** | TypeScript Compiler API | AST parsing |
| **TSDoc** | @microsoft/tsdoc | Comment parsing |
| **CLI** | Commander.js | Command-line interface |
| **Watching** | Chokidar | File system monitoring |
| **Testing** | Vitest | Unit/integration tests |
| **Validation** | Zod | Schema validation |
| **Search** | HNSW Algorithm | Vector similarity search |
| **Rendering** | Markdown/HTML | Output generation |

## Performance Optimizations

### 1. Incremental Compilation
- Cache parsed AST by file hash
- Only reparse changed files
- Incremental TypeScript compilation

### 2. Parallel Processing
```typescript
await Promise.all([
  parseFile('a.ts'),
  parseFile('b.ts'),
  parseFile('c.ts'),
]);
```

### 3. HNSW Indexing
- 150x-12,500x faster than linear search
- Configurable M (connections per node)
- Tunable efConstruction and efSearch

### 4. Lazy Loading
- Load search index on demand
- Stream large file processing
- Paginated search results

## Security Considerations

### 1. Secret Scanning
```typescript
const patterns = [
  /sk-[a-zA-Z0-9]{20,}/, // API keys
  /ghp_[a-zA-Z0-9]{36,}/, // GitHub tokens
  /AKIA[0-9A-Z]{16}/, // AWS keys
];
```

### 2. PII Detection
```typescript
const piiPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Emails
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
];
```

### 3. Safe Execution
- Compile examples in isolated TypeScript program
- No actual execution by default
- Optional sandboxed execution

## Extensibility

### Adding New Renderers

```typescript
class CustomRenderer implements Renderer {
  render(doc: Documentation): string {
    // Custom rendering logic
    return customOutput;
  }
}

// Register
rendererFactory.register('custom', CustomRenderer);
```

### Adding Validation Rules

```typescript
class CustomValidationRule implements ValidationRule {
  validate(example: CodeExample): ValidationResult {
    // Custom validation
  }
}

validator.addRule(new CustomValidationRule());
```

### Custom Search Filters

```typescript
searchService.search('query', {
  filters: [
    { field: 'customField', value: 'customValue' }
  ]
});
```

## Error Handling

### Parser Errors
- Graceful degradation
- Continue parsing other files
- Report errors with context

### Validation Errors
- Non-blocking warnings
- Errors prevent publishing
- Detailed error messages

### Search Errors
- Fallback to linear search
- Rebuild index on corruption
- Log and continue

## Monitoring & Metrics

### Performance Metrics
```typescript
{
  parseTime: 150, // ms
  renderTime: 50, // ms
  validationTime: 200, // ms
  totalTime: 400 // ms
}
```

### Quality Metrics
```typescript
{
  coverage: 0.95, // 95%
  symbolsDocumented: 150,
  symbolsTotal: 158,
  exampleCoverage: 0.80 // 80%
}
```

### Search Metrics
```typescript
{
  indexSize: 10000,
  avgQueryTime: 50, // ms
  cacheHitRate: 0.85 // 85%
}
```

## Testing Strategy

### Unit Tests
- Domain models (aggregates, value objects)
- Parsers (TypeScript, TSDoc)
- Renderers (Markdown, JSON, HTML)
- Validators (examples, secrets, PII)

### Integration Tests
- End-to-end generation
- Watch mode
- Search indexing

### E2E Tests
- CLI commands
- Real-world packages
- Multi-format output

## Deployment

### NPM Package
```bash
npm publish @claude-flow/api-reference-system
```

### Docker Image
```dockerfile
FROM node:20-alpine
COPY . /app
RUN npm install && npm run build
CMD ["node", "dist/cli.js"]
```

### CI/CD
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test
- name: Check coverage
  run: npm run test:coverage
```

## Future Enhancements

1. **Neural Learning**
   - ReasoningBank integration
   - SONA adaptation
   - Self-improving quality

2. **Multi-Language Support**
   - JavaScript (JSDoc)
   - Python (docstrings)
   - Rust (rustdoc)

3. **IDE Integration**
   - VS Code extension
   - IntelliJ plugin
   - Language server protocol

4. **Advanced Search**
   - Fuzzy matching
   - Filter by date
   - Popularity ranking

5. **Collaboration**
   - Comment on docs
   - Suggest improvements
   - Crowdsourced examples
