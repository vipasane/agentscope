# API Reference System - Claude Flow Integration Points

## Overview

Comprehensive integration strategy between the API Reference Documentation System and the claude-flow ecosystem.

---

## 1. Hooks System Integration

### 1.1 post-edit Hook

**Purpose**: Regenerate documentation when source code changes

**Trigger**: After any file edit

**Implementation**:
```typescript
import { registerHook } from '@claude-flow/hooks';

registerHook('post-edit', async (context) => {
  const { file, operation, success } = context;

  // Only process TypeScript files
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
    return;
  }

  // Only regenerate if edit was successful
  if (!success) {
    return;
  }

  // Determine affected documentation
  const affectedDocs = await findAffectedDocumentation(file);

  // Regenerate incrementally
  for (const doc of affectedDocs) {
    await regenerateDoc(doc);
  }

  // Update search index
  await updateSearchIndex(affectedDocs);

  // Store metrics
  await storeMetrics({
    hook: 'post-edit',
    file,
    docsRegenerated: affectedDocs.length,
    timestamp: new Date()
  });
});
```

**Configuration**:
```json
{
  "hooks": {
    "post-edit": {
      "enabled": true,
      "incremental": true,
      "debounce": 1000,
      "patterns": ["**/*.ts", "**/*.tsx"]
    }
  }
}
```

**Metrics Tracked**:
- Number of docs regenerated
- Regeneration time
- Files affected

---

### 1.2 pre-task Hook

**Purpose**: Route documentation tasks to appropriate agents

**Trigger**: Before task execution

**Implementation**:
```typescript
registerHook('pre-task', async (context) => {
  const { description, metadata } = context;

  // Detect documentation tasks
  if (isDocumentationTask(description)) {
    const recommendation = await routeDocTask(description);

    return {
      agentType: recommendation.agentType,
      model: recommendation.model,
      priority: recommendation.priority,
      tools: ['TypeScript', 'TSDoc', 'Markdown']
    };
  }
});

function isDocumentationTask(description: string): boolean {
  const docKeywords = [
    'document', 'docs', 'api reference', 'tsdoc',
    'example', 'documentation', 'generate docs'
  ];
  return docKeywords.some(kw => description.toLowerCase().includes(kw));
}

async function routeDocTask(description: string) {
  // Use intelligence system for routing
  const patterns = await searchMemory('doc-task-routing', description);

  if (patterns.length > 0) {
    return patterns[0]; // Use learned routing
  }

  // Default routing
  return {
    agentType: 'api-docs',
    model: 'haiku', // Use Haiku for doc generation (fast, cheap)
    priority: 'normal'
  };
}
```

**Agent Types for Documentation**:
- `api-docs`: General API documentation
- `example-validator`: Validate code examples
- `openapi-generator`: Generate OpenAPI specs
- `doc-reviewer`: Review documentation quality

---

### 1.3 post-task Hook

**Purpose**: Store successful documentation patterns for learning

**Trigger**: After task completion

**Implementation**:
```typescript
registerHook('post-task', async (context) => {
  const { taskId, success, results } = context;

  if (!success || !results.documentation) {
    return;
  }

  // Create trajectory for ReasoningBank
  const trajectory = {
    taskId,
    generated: results.documentation,
    context: results.context,
    feedback: results.userFeedback || null,
    verdict: success ? 'success' : 'failure'
  };

  // Store in ReasoningBank
  await ReasoningBank.storeTrajectory('documentation', trajectory);

  // If high-quality, extract and store pattern
  if (results.qualityScore > 0.9) {
    const pattern = extractPattern(trajectory);
    await storePattern('doc-patterns', pattern);
  }

  // Update neural model
  if (results.trainNeural) {
    await trainNeuralModel(trajectory);
  }
});
```

---

### 1.4 session-start Hook

**Purpose**: Initialize documentation session with context restoration

**Implementation**:
```typescript
registerHook('session-start', async (context) => {
  const { sessionId } = context;

  // Restore previous documentation state
  const state = await restoreSessionState(sessionId);

  if (state) {
    // Reload learned patterns
    await loadLearnedPatterns(state.patterns);

    // Restore search index
    await loadSearchIndex(state.indexId);

    // Resume any pending documentation tasks
    await resumePendingTasks(state.pendingTasks);
  }

  return {
    documentation: {
      patternsLoaded: state?.patterns?.length || 0,
      indexReady: !!state?.indexId
    }
  };
});
```

---

### 1.5 session-end Hook

**Purpose**: Persist documentation session state

**Implementation**:
```typescript
registerHook('session-end', async (context) => {
  const { sessionId, exportMetrics } = context;

  // Save current state
  await saveSessionState(sessionId, {
    patterns: getCurrentPatterns(),
    indexId: getCurrentIndexId(),
    pendingTasks: getPendingTasks(),
    metrics: exportMetrics ? getSessionMetrics() : null
  });

  // Export metrics if requested
  if (exportMetrics) {
    await exportDocMetrics(sessionId);
  }
});
```

---

## 2. Memory Storage Integration

### 2.1 Memory Namespaces

**Structure**:
```
api-docs/
├── generated/          # Generated documentation
│   ├── @claude-flow/core:Agent:3.0.0
│   ├── @claude-flow/core:Task:3.0.0
│   └── ...
├── patterns/           # Learned documentation patterns
│   ├── class-template
│   ├── function-template
│   └── example-format
├── trajectories/       # ReasoningBank trajectories
│   ├── trajectory-001
│   └── ...
└── metrics/            # Quality metrics
    ├── coverage
    ├── truth-scores
    └── user-feedback
```

### 2.2 Storage Operations

**Store Generated Documentation**:
```typescript
import { memoryStore } from '@claude-flow/memory';

async function storeGeneratedDoc(doc: Documentation) {
  const key = `${doc.packageName}:${doc.symbolName}:${doc.version}`;

  await memoryStore('api-docs/generated', key, {
    content: doc.render(),
    metadata: {
      format: doc.format,
      generatedAt: new Date(),
      qualityScore: doc.metadata.qualityScore,
      exampleCount: doc.examples.length
    }
  });
}
```

**Retrieve Documentation**:
```typescript
async function retrieveDoc(packageName: string, symbolName: string, version: string) {
  const key = `${packageName}:${symbolName}:${version}`;
  return await memoryRetrieve('api-docs/generated', key);
}
```

**Search Documentation**:
```typescript
async function searchDocs(query: string) {
  return await memorySearch('api-docs/generated', query, {
    limit: 10,
    threshold: 0.7
  });
}
```

---

### 2.3 Pattern Storage

**Store Learned Pattern**:
```typescript
async function storePattern(pattern: DocumentationPattern) {
  await memoryStore('api-docs/patterns', pattern.id, {
    template: pattern.template,
    applicability: pattern.applicability,
    confidence: pattern.confidence,
    learnedFrom: pattern.trajectoryIds,
    createdAt: new Date()
  });
}
```

**Retrieve Patterns**:
```typescript
async function getApplicablePatterns(context: GenerationContext) {
  const allPatterns = await memoryList('api-docs/patterns');

  return allPatterns.filter(p =>
    p.applicability.matches(context) &&
    p.confidence > 0.8
  ).sort((a, b) => b.confidence - a.confidence);
}
```

---

## 3. HNSW Search Integration

### 3.1 Index Configuration

**AgentDB HNSW Settings**:
```typescript
import { AgentDB } from 'agentdb';

const db = new AgentDB({
  backend: 'hybrid',
  hnsw: {
    M: 16,                // Number of connections per node
    efConstruction: 200,  // Search width during construction
    efSearch: 50,         // Search width during query
    metric: 'cosine'      // Distance metric
  },
  quantization: {
    enabled: true,
    type: 'scalar',       // Scalar quantization for 4x memory reduction
    bits: 8
  }
});
```

**Performance Expectations**:
| Doc Count | Build Time | Search Latency | Memory |
|-----------|------------|----------------|--------|
| 1K | 2s | 0.3ms | 10MB |
| 10K | 20s | 3ms | 80MB |
| 100K | 5min | 40ms | 600MB |
| 1M | 50min | 4ms | 4GB |

---

### 3.2 Embedding Generation

**Using claude-flow embeddings package**:
```typescript
import { generateEmbedding } from '@claude-flow/embeddings';

async function embedDocumentation(doc: Documentation) {
  // Combine title, description, and examples for embedding
  const text = [
    doc.title,
    doc.description,
    ...doc.examples.map(e => e.code)
  ].join('\n\n');

  const embedding = await generateEmbedding(text, {
    model: 'text-embedding-3-small',
    dimensions: 384,
    normalization: 'l2'
  });

  return embedding;
}
```

---

### 3.3 Indexing Workflow

**Initial Index Build**:
```typescript
async function buildSearchIndex(packages: string[]) {
  const startTime = Date.now();

  for (const packageName of packages) {
    const docs = await getAllDocsForPackage(packageName);

    for (const doc of docs) {
      const embedding = await embedDocumentation(doc);

      await db.insert('api-docs-index', {
        id: doc.id,
        embedding,
        content: doc.render(),
        metadata: {
          package: doc.packageName,
          symbol: doc.symbolName,
          type: doc.symbolType,
          version: doc.version
        }
      });
    }
  }

  const buildTime = Date.now() - startTime;
  console.log(`Index built in ${buildTime}ms`);

  return {
    totalDocs: await db.count('api-docs-index'),
    buildTime
  };
}
```

**Incremental Updates**:
```typescript
async function updateSearchIndex(updatedDocs: Documentation[]) {
  for (const doc of updatedDocs) {
    const embedding = await embedDocumentation(doc);

    // Update or insert
    await db.upsert('api-docs-index', {
      id: doc.id,
      embedding,
      content: doc.render(),
      metadata: { /* ... */ }
    });
  }
}
```

---

### 3.4 Search Queries

**Semantic Search**:
```typescript
async function searchDocumentation(query: string, options: SearchOptions = {}) {
  const queryEmbedding = await generateEmbedding(query);

  const results = await db.search('api-docs-index', queryEmbedding, {
    limit: options.limit || 10,
    filters: options.filters || [],
    threshold: options.threshold || 0.7
  });

  return results.map(r => ({
    doc: r.metadata,
    score: r.score,
    snippet: extractSnippet(r.content, query)
  }));
}
```

**Filtered Search**:
```typescript
async function searchByPackage(query: string, packageName: string) {
  return await searchDocumentation(query, {
    filters: [
      { field: 'metadata.package', op: '=', value: packageName }
    ]
  });
}

async function searchByType(query: string, symbolType: string) {
  return await searchDocumentation(query, {
    filters: [
      { field: 'metadata.type', op: '=', value: symbolType }
    ]
  });
}
```

---

## 4. Neural Learning Integration

### 4.1 ReasoningBank Integration

**Trajectory Storage**:
```typescript
import { ReasoningBank } from '@claude-flow/learning';

async function recordDocGenerationTrajectory(
  generated: Documentation,
  feedback: Feedback
) {
  const trajectory = {
    id: generateTrajectoryId(),
    type: 'documentation-generation',
    steps: [
      { action: 'parse-source', result: 'success' },
      { action: 'extract-tsdoc', result: 'success' },
      { action: 'generate-markdown', result: 'success' },
      { action: 'validate-examples', result: 'success' }
    ],
    generated: {
      content: generated.render(),
      format: generated.format,
      metadata: generated.metadata
    },
    feedback: {
      source: feedback.source,
      score: feedback.score,
      comments: feedback.comments
    },
    verdict: feedback.score > 3.5 ? 'success' : 'failure',
    timestamp: new Date()
  };

  await ReasoningBank.storeTrajectory(trajectory);
}
```

**Pattern Retrieval**:
```typescript
async function getLearnedDocPatterns(context: GenerationContext) {
  const patterns = await ReasoningBank.retrievePatterns({
    type: 'documentation-generation',
    context: {
      symbolType: context.symbolType,
      packageName: context.packageName
    },
    limit: 5,
    minConfidence: 0.8
  });

  return patterns;
}
```

---

### 4.2 SONA Adaptation

**Apply Neural Adaptation**:
```typescript
import { SONA } from '@claude-flow/learning';

async function improveDocumentation(
  generated: Documentation,
  patterns: Pattern[]
) {
  // SONA adapts in <0.05ms
  const improved = await SONA.adapt(generated.render(), {
    patterns: patterns.map(p => p.template),
    context: {
      symbolType: generated.symbolType,
      hasExamples: generated.examples.length > 0
    },
    objectives: [
      'clarity',
      'completeness',
      'example-quality'
    ]
  });

  return improved;
}
```

---

### 4.3 Truth Scoring

**Validate Documentation Accuracy**:
```typescript
async function scoreTruthfulness(
  doc: Documentation,
  sourceCode: SourceAnalysis
) {
  const scores = {
    parameterAccuracy: checkParameterAccuracy(doc, sourceCode),
    returnTypeAccuracy: checkReturnTypeAccuracy(doc, sourceCode),
    exampleValidity: await validateExamples(doc.examples),
    typeConsistency: checkTypeConsistency(doc, sourceCode)
  };

  const truthScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;

  // Store for learning
  await storeMetric('truth-scores', {
    docId: doc.id,
    score: truthScore,
    breakdown: scores,
    timestamp: new Date()
  });

  return {
    score: truthScore,
    breakdown: scores,
    threshold: 0.95,
    passed: truthScore >= 0.95
  };
}
```

---

## 5. Security Integration

### 5.1 Secret Scanning

**Using @claude-flow/security**:
```typescript
import { InputValidator } from '@claude-flow/security';

async function scanExamplesForSecrets(examples: CodeExample[]) {
  const results = [];

  for (const example of examples) {
    const validation = await InputValidator.validate(example.code, {
      checkSecrets: true,
      checkPII: false
    });

    if (validation.hasSecrets) {
      results.push({
        example: example.id,
        secrets: validation.secrets,
        severity: 'critical'
      });
    }
  }

  return {
    totalExamples: examples.length,
    secretsFound: results.length,
    results
  };
}
```

---

### 5.2 PII Detection

**Scan for Personal Information**:
```typescript
async function scanForPII(documentation: Documentation) {
  const text = documentation.render();

  const validation = await InputValidator.validate(text, {
    checkSecrets: false,
    checkPII: true
  });

  if (validation.hasPII) {
    return {
      found: true,
      types: validation.piiTypes, // ['email', 'phone']
      locations: validation.piiLocations,
      recommendation: 'redact-or-anonymize'
    };
  }

  return { found: false };
}
```

---

### 5.3 Path Validation

**Safe Output Paths**:
```typescript
import { PathValidator } from '@claude-flow/security';

async function writeDocumentation(doc: Documentation, outputPath: string) {
  // Validate path to prevent traversal
  const safePath = PathValidator.sanitize(outputPath);

  // Ensure output directory
  await fs.mkdir(path.dirname(safePath), { recursive: true });

  // Write documentation
  await fs.writeFile(safePath, doc.render(), 'utf-8');

  return safePath;
}
```

---

## 6. Performance Monitoring

### 6.1 Metrics Collection

**Track Documentation Generation**:
```typescript
import { metrics } from '@claude-flow/metrics';

async function generateWithMetrics(sourceFile: string) {
  const timer = metrics.startTimer('doc_generation_duration');

  try {
    const doc = await generateDocumentation(sourceFile);

    timer.end();
    metrics.increment('docs_generated_total');
    metrics.gauge('doc_quality_score', doc.metadata.qualityScore);

    return doc;
  } catch (error) {
    timer.end();
    metrics.increment('doc_generation_errors_total');
    throw error;
  }
}
```

---

### 6.2 Quality Dashboards

**Real-time Quality Monitoring**:
```typescript
async function getQualityDashboard() {
  return {
    coverage: await getCoverageMetrics(),
    quality: await getQualityMetrics(),
    performance: await getPerformanceMetrics(),
    trends: await getTrendData()
  };
}

async function getCoverageMetrics() {
  const total = await countAllPublicAPIs();
  const documented = await countDocumentedAPIs();

  return {
    percentage: (documented / total) * 100,
    total,
    documented,
    missing: total - documented
  };
}

async function getQualityMetrics() {
  const scores = await getAllTruthScores();

  return {
    average: scores.reduce((a, b) => a + b, 0) / scores.length,
    median: scores.sort()[Math.floor(scores.length / 2)],
    belowThreshold: scores.filter(s => s < 0.95).length
  };
}
```

---

## 7. CLI Integration

### 7.1 Documentation Commands

**Add to claude-flow CLI**:
```bash
# Generate documentation for a package
npx @claude-flow/cli@latest docs generate --package @claude-flow/core

# Generate all formats
npx @claude-flow/cli@latest docs generate --package @claude-flow/core --format all

# Watch mode
npx @claude-flow/cli@latest docs watch --package @claude-flow/core

# Search documentation
npx @claude-flow/cli@latest docs search "how to spawn agent"

# Validate examples
npx @claude-flow/cli@latest docs validate --package @claude-flow/core

# Quality report
npx @claude-flow/cli@latest docs quality --package @claude-flow/core
```

---

## 8. Event-Driven Architecture

### 8.1 Domain Events

**Publish Events**:
```typescript
import { EventBus } from '@claude-flow/events';

// When documentation is generated
EventBus.publish('DocumentationGenerated', {
  documentationId: doc.id,
  packageName: doc.packageName,
  symbolName: doc.symbolName,
  format: doc.format,
  timestamp: new Date()
});

// When search index is updated
EventBus.publish('SearchIndexUpdated', {
  indexId: index.id,
  entriesAdded: count,
  timestamp: new Date()
});
```

**Subscribe to Events**:
```typescript
// Update cache when docs regenerate
EventBus.subscribe('DocumentationGenerated', async (event) => {
  await invalidateCache(event.documentationId);
});

// Trigger deployment when docs change
EventBus.subscribe('DocumentationGenerated', async (event) => {
  if (event.format === 'html') {
    await triggerDeployment(event.documentationId);
  }
});
```

---

## References
- [Claude Flow Hooks System](../.claude-flow/hooks/)
- [AgentDB Documentation](https://github.com/ruvnet/agentdb)
- [ReasoningBank](https://github.com/reasoning-bank)
- [@claude-flow/security](https://github.com/ruvnet/claude-flow/tree/main/packages/security)
