# ADR-001: API Reference Documentation System Architecture

## Status
Proposed

## Context

The claude-flow ecosystem requires comprehensive API documentation across 4 major packages:
1. **Performance Package** - HNSW indexing, Flash Attention, optimization utilities
2. **Learning Package** - ReasoningBank, neural patterns, SONA architecture
3. **Security Package** - CVE remediation, input validation, safe execution
4. **CLI Framework** - 26 commands with 140+ subcommands

### Current Challenges
- **Manual documentation drift** - Code changes without doc updates
- **Inconsistent formats** - Different styles across packages
- **No code-to-doc traceability** - Hard to verify accuracy
- **Limited search capability** - No semantic search across docs
- **Missing examples** - Insufficient real-world usage patterns
- **No version tracking** - Historical API changes not documented

### Business Requirements
- Auto-generate docs from TypeScript source code (TSDoc/JSDoc)
- Support multiple output formats (Markdown, HTML, JSON, OpenAPI)
- Include runnable code examples with validation
- Real-time updates when code changes
- Semantic search with HNSW indexing (150x-12,500x faster)
- Integration with existing claude-flow hooks system
- Self-learning documentation quality improvement

## Decision

We will implement a **Claude Flow API Reference Documentation System** with the following architecture:

### 1. Core Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Source Parser** | TypeScript Compiler API + TSDoc | Official, accurate, maintains type info |
| **Doc Generator** | Custom generator leveraging TypeDoc | Extensible, TSDoc-compliant |
| **Output Formats** | Markdown, HTML (Vitepress), JSON, OpenAPI | Multi-purpose: GitHub, website, API clients |
| **Search Engine** | HNSW vector search via AgentDB | 150x-12,500x faster than linear search |
| **Example Validation** | TypeScript compiler + Vitest | Ensure examples actually work |
| **Watch Mode** | Chokidar + TypeScript incremental compilation | Fast rebuild on changes |
| **Neural Learning** | RuVector SONA + ReasoningBank | Improve doc quality over time |

### 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   API Reference System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Source     │───▶│  Doc Engine  │───▶│   Output     │    │
│  │   Parser     │    │  Generator   │    │   Writers    │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                    │                    │            │
│         ▼                    ▼                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  TSDoc/AST   │    │  Example     │    │  Markdown    │    │
│  │  Extraction  │    │  Validator   │    │  HTML/JSON   │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                   Integration Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  HNSW Search │    │  Hooks       │    │  Memory      │    │
│  │  (AgentDB)   │    │  Integration │    │  Storage     │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                    │                    │            │
│         ▼                    ▼                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  Vector      │    │  Pre/Post    │    │  Pattern     │    │
│  │  Embeddings  │    │  Edit Hooks  │    │  Learning    │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                   Neural Learning Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  SONA        │    │  Reasoning   │    │  Quality     │    │
│  │  Adaptation  │    │  Bank        │    │  Metrics     │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                    │                    │            │
│         ▼                    ▼                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  Auto        │    │  Pattern     │    │  Truth       │    │
│  │  Improvement │    │  Storage     │    │  Scoring     │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Key Architectural Decisions

#### 3.1 TypeScript-First Approach
- **Decision**: Parse TypeScript directly, not compiled JavaScript
- **Rationale**: Preserve type information, generics, decorators
- **Tradeoff**: More complex parser, but accurate documentation

#### 3.2 Multi-Format Output
- **Decision**: Generate Markdown (primary), HTML, JSON, OpenAPI
- **Rationale**:
  - Markdown: GitHub README, version control-friendly
  - HTML: Website (Vitepress/Docusaurus)
  - JSON: Programmatic access, IDE integration
  - OpenAPI: REST API documentation
- **Tradeoff**: More generation logic, but maximum flexibility

#### 3.3 HNSW Vector Search Integration
- **Decision**: Embed all documentation in vector space via AgentDB
- **Rationale**:
  - 150x-12,500x faster than linear search
  - Semantic search: "how to authenticate?" finds auth docs
  - Cross-package discovery
- **Tradeoff**: Initial indexing overhead, but massive speedup

#### 3.4 Example Validation Pipeline
- **Decision**: Compile and optionally run examples
- **Rationale**: Prevent broken code in documentation
- **Implementation**:
  ```typescript
  // Example in doc comment
  /**
   * @example
   * ```typescript
   * import { Agent } from '@claude-flow/core';
   * const agent = new Agent({ type: 'coder' });
   * await agent.execute('Write hello world');
   * ```
   */
  ```
  - Extract example → TypeScript compile check → Optional runtime test
- **Tradeoff**: Slower doc generation, but guaranteed correctness

#### 3.5 Self-Learning Documentation Quality
- **Decision**: Use ReasoningBank to learn documentation patterns
- **Rationale**:
  - Track which docs get read most (signals clarity)
  - Track GitHub issues mentioning "unclear docs"
  - Learn from manual edits (human overrides = learning signal)
- **Implementation**:
  - Store trajectory: [generated doc → user feedback → manual edit]
  - Distill patterns: "Always include error handling in examples"
  - Apply learned patterns to future generation
- **Tradeoff**: More complex, but docs improve over time

#### 3.6 Hooks Integration
- **Decision**: Trigger doc generation via `post-edit` hook
- **Rationale**: Automatic re-generation when code changes
- **Workflow**:
  ```bash
  # Developer edits src/agent.ts
  # post-edit hook triggers:
  hooks post-edit --file src/agent.ts --action regenerate-docs
  # System re-generates only affected documentation
  ```
- **Tradeoff**: Slight overhead on edits, but always up-to-date

#### 3.7 Incremental Generation
- **Decision**: Only regenerate docs for changed files
- **Rationale**: Fast feedback loop during development
- **Implementation**:
  - Track file hash → doc mapping
  - On file change, regenerate only dependent docs
  - Full rebuild only on request
- **Tradeoff**: More complex invalidation logic, but 100x faster rebuilds

### 4. Security Considerations

#### 4.1 Secret Scanning in Examples
- **Decision**: Use `@claude-flow/security` to scan examples
- **Implementation**:
  ```typescript
  import { InputValidator } from '@claude-flow/security';

  // Before including example in docs
  const example = extractCodeExample(docComment);
  const validation = await InputValidator.validate(example, {
    checkSecrets: true,
    checkPII: true
  });

  if (validation.hasSecrets) {
    throw new Error('Example contains secrets - redact before publishing');
  }
  ```
- **Protected against**: API keys, tokens, passwords in examples

#### 4.2 Path Traversal Prevention
- **Decision**: Validate all output paths
- **Implementation**:
  ```typescript
  import { PathValidator } from '@claude-flow/security';

  const outputPath = PathValidator.sanitize(userProvidedPath);
  await fs.writeFile(outputPath, documentation);
  ```

#### 4.3 Safe Example Execution
- **Decision**: Run examples in sandboxed environment if validation enabled
- **Implementation**: Use `SafeExecutor` from security package

### 5. Performance Optimizations

#### 5.1 Parallel Processing
- **Decision**: Generate docs for packages in parallel
- **Implementation**:
  ```typescript
  await Promise.all([
    generatePackageDocs('@claude-flow/performance'),
    generatePackageDocs('@claude-flow/learning'),
    generatePackageDocs('@claude-flow/security'),
    generatePackageDocs('@claude-flow/cli')
  ]);
  ```
- **Expected speedup**: 4x on quad-core systems

#### 5.2 HNSW Indexing
- **Decision**: Use HNSW for vector search (not brute force)
- **Performance**: 150x faster for 10K docs, 12,500x for 1M docs
- **Memory**: 50-75% reduction with quantization

#### 5.3 Caching Strategy
- **Decision**: Cache parsed AST and embeddings
- **Implementation**:
  ```typescript
  // Cache key: file hash + TSDoc version
  const cacheKey = `${fileHash}-${tsdocVersion}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const ast = parseTypeScript(sourceFile);
  await cache.set(cacheKey, ast);
  ```

### 6. Integration Points

#### 6.1 Claude Flow Hooks
- `pre-edit`: Check if edit affects documented APIs
- `post-edit`: Regenerate affected documentation
- `pre-task`: Route documentation tasks to specialized agent
- `post-task`: Store successful documentation patterns

#### 6.2 Memory Storage
- **Namespace**: `api-docs`
- **Keys**: `{package}:{symbol}:{version}`
- **Values**: Generated documentation + metadata
- **TTL**: No expiration (historical docs)

#### 6.3 Neural Learning
- **Training data**: User feedback on doc quality
- **Patterns stored**: Documentation templates that work
- **Metrics tracked**:
  - Clarity score (human ratings)
  - Completeness (parameter coverage %)
  - Example quality (compile success rate)

### 7. Output Format Specifications

#### 7.1 Markdown Format
```markdown
# ClassName

Description from TSDoc

## Constructor

### Parameters
- `param1: Type` - Description
- `param2: Type` - Description

## Methods

### methodName(param: Type): ReturnType

Description

#### Parameters
- `param: Type` - Description

#### Returns
`ReturnType` - Description

#### Example
\`\`\`typescript
const instance = new ClassName();
instance.methodName(value);
\`\`\`

#### Throws
- `ErrorType` - When X happens
```

#### 7.2 JSON Format (API Structure)
```json
{
  "package": "@claude-flow/core",
  "version": "3.0.0-alpha.190",
  "exports": [
    {
      "type": "class",
      "name": "Agent",
      "description": "...",
      "constructor": {
        "parameters": [...]
      },
      "methods": [
        {
          "name": "execute",
          "parameters": [...],
          "returnType": "Promise<Result>",
          "description": "...",
          "examples": [...]
        }
      ]
    }
  ]
}
```

#### 7.3 OpenAPI Format (REST APIs)
```yaml
openapi: 3.0.0
info:
  title: Claude Flow API
  version: 3.0.0-alpha.190
paths:
  /api/agent/spawn:
    post:
      summary: Spawn a new agent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                type:
                  type: string
                  enum: [coder, tester, reviewer]
```

### 8. Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Coverage** | 100% public APIs | % symbols with TSDoc |
| **Example coverage** | >80% methods | % methods with examples |
| **Example validity** | 100% | % examples that compile |
| **Freshness** | <5 min | Time from code change to doc update |
| **Search latency** | <100ms | HNSW search response time |
| **Truth score** | >0.95 | Doc accuracy vs actual code behavior |

## Consequences

### Positive
- **Always up-to-date** - Docs regenerated automatically
- **Consistent quality** - Single source of truth (code)
- **Fast search** - HNSW semantic search (150x faster)
- **Validated examples** - No broken code in docs
- **Self-improving** - Neural learning from feedback
- **Multi-format** - Supports all use cases
- **Secure** - Secret scanning prevents leaks
- **Performant** - Parallel generation, incremental rebuilds

### Negative
- **Initial complexity** - More moving parts than manual docs
- **Build time overhead** - Parsing + validation takes time
- **Storage requirements** - Vector embeddings need space
- **Learning curve** - TSDoc conventions must be followed

### Neutral
- **TypeScript dependency** - Only works for TS codebases
- **Requires hooks setup** - Best with full claude-flow integration
- **Initial indexing time** - First HNSW build is slow (one-time cost)

## Options Considered

### Option 1: TypeDoc + Custom Plugin (SELECTED)
- **Pros**:
  - Mature, battle-tested TSDoc parser
  - Extensible plugin system
  - Active maintenance
- **Cons**:
  - Less control over output format
  - Harder to integrate custom learning
- **Decision**: Selected for stability, extended with custom plugins

### Option 2: Custom Parser from Scratch
- **Pros**:
  - Full control
  - Exact integration with claude-flow
- **Cons**:
  - Huge development effort
  - Reimplementing TypeScript parser logic
  - Maintenance burden
- **Decision**: Rejected - not worth the effort

### Option 3: JSDoc with Babel
- **Pros**:
  - Works with JavaScript too
  - Simpler parser
- **Cons**:
  - Loses TypeScript type information
  - Can't document generics accurately
- **Decision**: Rejected - need full TypeScript support

### Option 4: AI-Generated Docs Only
- **Pros**:
  - Natural language quality
  - Can infer intent
- **Cons**:
  - Hallucination risk (inaccurate docs)
  - No type safety
  - Expensive (API costs)
- **Decision**: Rejected - use AI for enhancement, not primary generation

## Related Decisions
- ADR-002: DDD Bounded Contexts for Documentation Domain
- ADR-003: Neural Learning Integration Strategy
- ADR-004: HNSW Search Configuration
- ADR-026: 3-Tier Model Routing (Booster/Haiku/Sonnet)

## References
- [TSDoc Specification](https://tsdoc.org/)
- [TypeDoc Documentation](https://typedoc.org/)
- [TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320)
- [AgentDB Documentation](https://github.com/ruvnet/agentdb)
- [Claude Flow Hooks System](../.claude-flow/hooks/)
- [ReasoningBank Pattern Learning](https://github.com/reasoning-bank)

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up TypeScript parser with TSDoc extraction
- Implement basic Markdown generator
- Create example validator
- Set up test infrastructure

### Phase 2: Integration (Weeks 3-4)
- Integrate HNSW vector search
- Add hooks integration (post-edit, pre-task)
- Implement memory storage
- Create watch mode

### Phase 3: Multi-Format (Weeks 5-6)
- Add HTML generator (Vitepress)
- Add JSON output format
- Add OpenAPI generator for REST endpoints
- Create unified CLI

### Phase 4: Neural Learning (Weeks 7-8)
- Integrate ReasoningBank pattern storage
- Implement SONA-based quality improvement
- Add truth scoring for documentation accuracy
- Create feedback collection system

### Phase 5: Production Readiness (Weeks 9-10)
- Security hardening (secret scanning, safe execution)
- Performance optimization (caching, parallelization)
- Comprehensive testing (unit, integration, e2e)
- Documentation and examples

### Phase 6: Deployment (Week 11-12)
- CI/CD pipeline integration
- GitHub Pages deployment
- Package publishing
- Migration guide for existing docs

## Success Criteria
- All 4 packages have complete API documentation
- 100% TSDoc coverage for public APIs
- >80% methods have validated examples
- Search latency <100ms for 10K+ docs
- Automatic regeneration on code changes (<5 min)
- Truth score >0.95 for generated documentation
- Zero secrets exposed in examples
