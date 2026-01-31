# API Reference System - Technology Stack

## Overview

Detailed technology choices and justifications for the Claude Flow API Reference Documentation System.

---

## Core Technologies

### 1. TypeScript Compiler API

**Purpose**: Parse TypeScript source code and extract type information

**Justification**:
- Official Microsoft TypeScript parser
- Accurate AST representation
- Preserves all type information (generics, unions, intersections)
- Active maintenance and updates
- Well-documented API

**Alternatives Considered**:
- **Babel**: Loses TypeScript-specific type info
- **Custom parser**: Massive effort, high maintenance
- **ts-morph**: Wrapper around TS API, adds overhead

**Usage**:
```typescript
import * as ts from 'typescript';

const program = ts.createProgram(fileNames, compilerOptions);
const sourceFile = program.getSourceFile('agent.ts');
const checker = program.getTypeChecker();

// Visit AST nodes
ts.forEachChild(sourceFile, visit);

function visit(node: ts.Node) {
  if (ts.isClassDeclaration(node)) {
    const symbol = checker.getSymbolAtLocation(node.name);
    const type = checker.getTypeOfSymbolAtLocation(symbol, node);
    // Extract documentation
  }
}
```

**Dependencies**:
- `typescript`: ^5.3.0

---

### 2. TSDoc

**Purpose**: Parse structured documentation comments

**Justification**:
- Microsoft standard for TypeScript documentation
- Extensible with custom tags
- Used by TypeDoc, API Extractor
- Rich metadata: @param, @returns, @example, @throws

**Alternatives Considered**:
- **JSDoc**: Less TypeScript-specific
- **Custom format**: No ecosystem support

**Usage**:
```typescript
import { TSDocParser } from '@microsoft/tsdoc';

const parser = new TSDocParser();
const parserContext = parser.parseString(commentText);
const docComment = parserContext.docComment;

// Extract sections
const summary = docComment.summarySection;
const params = docComment.params;
const returns = docComment.returnsBlock;
```

**Dependencies**:
- `@microsoft/tsdoc`: ^0.14.2

---

### 3. AgentDB (HNSW Vector Search)

**Purpose**: Semantic search across documentation

**Justification**:
- **150x-12,500x faster** than linear search
- Hierarchical Navigable Small World (HNSW) algorithm
- Built-in embeddings generation
- Part of claude-flow ecosystem
- SQL.js backend (no native dependencies)

**Alternatives Considered**:
- **Elasticsearch**: Overkill for docs, complex setup
- **Lunr.js**: Client-side only, no semantic search
- **Meilisearch**: No vector search support

**Performance**:
| Docs | Linear Search | HNSW | Speedup |
|------|---------------|------|---------|
| 1K | 50ms | 0.33ms | 150x |
| 10K | 500ms | 3ms | 166x |
| 100K | 5s | 40ms | 125x |
| 1M | 50s | 4ms | 12,500x |

**Usage**:
```typescript
import { AgentDB } from 'agentdb';

const db = new AgentDB({
  backend: 'hybrid',
  hnsw: {
    M: 16,
    efConstruction: 200,
    efSearch: 50
  }
});

// Index documentation
await db.insert('api-docs', {
  id: 'agent-execute',
  content: 'Execute an agent task...',
  metadata: { package: '@claude-flow/core', type: 'method' }
});

// Semantic search
const results = await db.search('api-docs', 'how to run an agent?', { limit: 10 });
```

**Dependencies**:
- `agentdb`: ^2.0.0

---

### 4. Vitest

**Purpose**: Testing framework

**Justification**:
- Vite-native (fast, modern)
- Compatible with Vite-based build
- ESM-first
- TypeScript support out-of-box
- Snapshot testing, coverage

**Alternatives Considered**:
- **Jest**: Slower, CommonJS-focused
- **Mocha**: More setup required

**Usage**:
```typescript
import { describe, it, expect } from 'vitest';
import { TypeScriptParser } from './typescript-parser';

describe('TypeScriptParser', () => {
  it('should parse class declarations', async () => {
    const parser = new TypeScriptParser();
    const analysis = await parser.parse('src/agent.ts');

    expect(analysis.symbols).toHaveLength(1);
    expect(analysis.symbols[0].kind).toBe('class');
  });
});
```

**Dependencies**:
- `vitest`: ^1.2.0
- `@vitest/coverage-v8`: ^1.2.0

---

### 5. Vitepress

**Purpose**: HTML documentation site generation

**Justification**:
- Vue-powered static site generator
- Markdown-native
- Fast build times
- Built-in search
- Customizable theme

**Alternatives Considered**:
- **Docusaurus**: React-based, more complex
- **MkDocs**: Python-based, less integrated
- **Nextra**: Newer, less mature

**Usage**:
```typescript
// .vitepress/config.ts
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Claude Flow API Reference',
  description: 'Comprehensive API documentation',
  themeConfig: {
    nav: [
      { text: 'Core', link: '/packages/core/' },
      { text: 'Performance', link: '/packages/performance/' }
    ],
    sidebar: {
      '/packages/core/': [
        { text: 'Agent', link: '/packages/core/agent' },
        { text: 'Task', link: '/packages/core/task' }
      ]
    }
  }
});
```

**Dependencies**:
- `vitepress`: ^1.0.0

---

### 6. Chokidar

**Purpose**: File system watching for watch mode

**Justification**:
- Cross-platform (Windows, macOS, Linux)
- Efficient event handling
- Debouncing support
- Used by Vite, Webpack

**Alternatives Considered**:
- **fs.watch**: Platform inconsistencies
- **nodemon**: CLI tool, not library

**Usage**:
```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch('src/**/*.ts', {
  ignored: /(^|[\/\\])\../,
  persistent: true
});

watcher.on('change', async (path) => {
  console.log(`File changed: ${path}`);
  await regenerateDocs(path);
});
```

**Dependencies**:
- `chokidar`: ^3.5.3

---

## Claude Flow Integration

### 1. @claude-flow/security

**Purpose**: Secret scanning, PII detection, path validation

**Features**:
- `InputValidator`: Zod-based validation
- `PathValidator`: Path traversal prevention
- `SafeExecutor`: Injection protection

**Usage**:
```typescript
import { InputValidator, PathValidator } from '@claude-flow/security';

// Scan example for secrets
const validation = await InputValidator.validate(exampleCode, {
  checkSecrets: true,
  checkPII: true
});

if (validation.hasSecrets) {
  throw new Error('Example contains secrets');
}

// Validate output path
const safePath = PathValidator.sanitize(userPath);
await fs.writeFile(safePath, documentation);
```

**Dependencies**:
- `@claude-flow/security`: ^3.0.0-alpha

---

### 2. @claude-flow/hooks

**Purpose**: Integration with claude-flow hooks system

**Hooks Used**:
- `post-edit`: Regenerate docs when code changes
- `pre-task`: Route documentation tasks
- `post-task`: Store successful patterns

**Usage**:
```typescript
// Register hook
import { registerHook } from '@claude-flow/hooks';

registerHook('post-edit', async ({ file }) => {
  if (file.endsWith('.ts')) {
    await regenerateDocs(file);
  }
});

// Trigger hook manually
import { triggerHook } from '@claude-flow/hooks';

await triggerHook('post-task', {
  taskId: 'doc-gen-123',
  success: true,
  results: { docsGenerated: 42 }
});
```

**Dependencies**:
- `@claude-flow/hooks`: ^3.0.0-alpha

---

### 3. RuVector (SONA + ReasoningBank)

**Purpose**: Neural learning for documentation quality improvement

**Components**:
- **SONA**: Self-Optimizing Neural Architecture (<0.05ms adaptation)
- **ReasoningBank**: Pattern learning and distillation
- **EWC++**: Elastic Weight Consolidation (prevent forgetting)

**Usage**:
```typescript
import { ReasoningBank, SONA } from '@claude-flow/learning';

// Record trajectory
const trajectory = {
  generated: generatedDoc,
  feedback: userFeedback,
  verdict: feedback.score > 4 ? 'success' : 'failure'
};

await ReasoningBank.storeTrajectory(trajectory);

// Retrieve learned patterns
const patterns = await ReasoningBank.retrievePatterns({
  context: 'function documentation',
  limit: 5
});

// Apply SONA adaptation
const improved = await SONA.adapt(generatedDoc, patterns);
```

**Dependencies**:
- `@claude-flow/learning`: ^3.0.0-alpha

---

## Output Formats

### 1. Markdown

**Generator**: Custom template-based

**Features**:
- GitHub-flavored Markdown
- Code syntax highlighting
- Automatic table of contents
- Cross-references

**Example Output**:
```markdown
# Agent

Agent executes tasks with configurable behavior.

## Constructor

\`\`\`typescript
new Agent(options: AgentOptions)
\`\`\`

### Parameters
- `options: AgentOptions` - Configuration

## Methods

### execute(task: string): Promise<Result>

Execute a task.

#### Example
\`\`\`typescript
const agent = new Agent({ type: 'coder' });
const result = await agent.execute('Write hello world');
\`\`\`
```

---

### 2. HTML (Vitepress)

**Generator**: Vitepress markdown + custom components

**Features**:
- Search functionality
- Dark mode
- Responsive design
- Interactive examples

**Custom Components**:
```vue
<APIReference
  name="Agent"
  package="@claude-flow/core"
  version="3.0.0-alpha.190"
/>

<CodeExample
  language="typescript"
  runnable
  code="const agent = new Agent({ type: 'coder' });"
/>
```

---

### 3. JSON

**Generator**: Domain model serialization

**Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "package": { "type": "string" },
    "version": { "type": "string" },
    "exports": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "enum": ["class", "function", "interface"] },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "signature": { "type": "string" }
        }
      }
    }
  }
}
```

---

### 4. OpenAPI 3.0

**Generator**: Extract REST endpoints from code

**Features**:
- Automatic schema generation from types
- Request/response examples
- Authentication documentation

**Example**:
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
              $ref: '#/components/schemas/SpawnRequest'
      responses:
        '200':
          description: Agent spawned successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentResponse'
```

---

## Build and Deployment

### 1. Build Tool: Vite

**Purpose**: Fast builds with ESM support

**Configuration**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['typescript', 'agentdb']
    }
  }
});
```

---

### 2. Package Manager: pnpm

**Purpose**: Efficient monorepo management

**Workspace Structure**:
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'docs'
```

---

### 3. CI/CD: GitHub Actions

**Pipeline**:
```yaml
name: Generate Docs

on:
  push:
    branches: [main]
  pull_request:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm doc-gen --format all
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs-output
```

---

## Performance Optimizations

### 1. Parallel Processing

**Library**: Node.js worker threads

```typescript
import { Worker } from 'worker_threads';

const workers = packages.map(pkg =>
  new Worker('./generate-worker.js', {
    workerData: { package: pkg }
  })
);

await Promise.all(workers.map(w =>
  new Promise(resolve => w.on('message', resolve))
));
```

---

### 2. Caching

**Library**: LRU cache

```typescript
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 60 // 1 hour
});

const key = `${fileHash}-${version}`;
const cached = cache.get(key);
if (cached) return cached;

const parsed = await parseFile(file);
cache.set(key, parsed);
```

**Dependencies**:
- `lru-cache`: ^10.0.0

---

### 3. Incremental Compilation

**Strategy**: Only recompile changed files

```typescript
import * as ts from 'typescript';

const host = ts.createIncrementalCompilerHost(compilerOptions);
const program = ts.createIncrementalProgram({
  rootNames: fileNames,
  options: compilerOptions,
  host
});

// On file change, only affected files recompile
program.emit(undefined, undefined, undefined, undefined, {
  afterDeclarations: [transformer]
});
```

---

## Security

### 1. Secret Patterns

**Regex patterns** for common secrets:
- API keys: `/sk-[A-Za-z0-9]{32,}/`
- AWS keys: `/AKIA[0-9A-Z]{16}/`
- GitHub tokens: `/ghp_[A-Za-z0-9]{36}/`
- JWT: `/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/`

---

### 2. PII Patterns

- Email: RFC 5322 regex
- Phone: E.164 format
- SSN: `/\d{3}-\d{2}-\d{4}/`
- Credit card: Luhn algorithm validation

---

## Monitoring

### 1. Metrics Collection

**Library**: Prometheus client

```typescript
import { Counter, Histogram } from 'prom-client';

const docsGenerated = new Counter({
  name: 'docs_generated_total',
  help: 'Total docs generated'
});

const generationTime = new Histogram({
  name: 'doc_generation_duration_seconds',
  help: 'Doc generation duration'
});

const end = generationTime.startTimer();
await generateDocs();
end();
docsGenerated.inc();
```

---

### 2. Error Tracking

**Library**: Sentry (optional)

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

try {
  await generateDocs();
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

---

## Complete Dependency List

```json
{
  "dependencies": {
    "typescript": "^5.3.3",
    "@microsoft/tsdoc": "^0.14.2",
    "agentdb": "^2.0.0",
    "@claude-flow/security": "^3.0.0-alpha",
    "@claude-flow/hooks": "^3.0.0-alpha",
    "@claude-flow/learning": "^3.0.0-alpha",
    "chokidar": "^3.5.3",
    "lru-cache": "^10.0.0"
  },
  "devDependencies": {
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0",
    "vitepress": "^1.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## References
- [TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [TSDoc Specification](https://tsdoc.org/)
- [AgentDB](https://github.com/ruvnet/agentdb)
- [HNSW Paper](https://arxiv.org/abs/1603.09320)
- [Vitepress](https://vitepress.dev/)
