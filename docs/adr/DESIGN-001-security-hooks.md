# DESIGN-001: Security and Hooks Integration for Generator Enhancement

> **Status**: Draft
> **Created**: January 2026
> **Component**: AgentScope Diagram Generator Security & Self-Learning Integration
> **Related ADRs**: [ADR-001-mermaid-theme-system](./ADR-001-mermaid-theme-system.md), [SECURITY-theme-system](./SECURITY-theme-system.md)

---

## 1. Overview

This design document specifies the integration of Claude Flow V3 hooks system and security measures into AgentScope's diagram generator. The goal is to enable self-learning capabilities, security scanning, and optimization patterns for the generation pipeline.

### 1.1 Goals

- Integrate pre/post-generate hooks for validation and learning
- Apply security controls from existing security review
- Enable pattern storage for successful generations
- Implement performance optimizations (caching, lazy generation, parallel processing)

### 1.2 Non-Goals

- Implementation of hooks themselves (claude-flow provides these)
- Modification of existing Mermaid rendering logic
- Changes to core diagram generation algorithms

---

## 2. Hook Integration Points

### 2.1 Hook Architecture Overview

```
                                  +-------------------+
                                  |   Claude Flow V3  |
                                  |   Hooks System    |
                                  +-------------------+
                                           |
    +--------------------------------------+--------------------------------------+
    |                                      |                                      |
    v                                      v                                      v
+-------------------+            +-------------------+            +-------------------+
|   pre-generate    |            |   generation      |            |   post-generate   |
|   hook            |   ----->   |   (component-map) |   ----->   |   hook            |
+-------------------+            +-------------------+            +-------------------+
    |                                                                      |
    v                                                                      v
+-------------------+                                            +-------------------+
| Input Validation  |                                            | Quality Metrics   |
| Security Scanning |                                            | Pattern Storage   |
| Cache Lookup      |                                            | Learning Feedback |
+-------------------+                                            +-------------------+
```

### 2.2 Pre-Generate Hook

**Purpose**: Validate input, check security, lookup cached results, and route to optimal generation strategy.

**Integration Point**: Before `generateComponentMap()` in [component-map.ts](../../src/core/generators/diagrams/component-map.ts)

**Hook Invocation**:
```typescript
interface PreGenerateHookInput {
  config: AgentScopeConfig;
  options: ComponentMapOptions;
  requestId: string;
  context: {
    timestamp: number;
    caller: string;
    version: string;
  };
}

interface PreGenerateHookOutput {
  validated: boolean;
  securityScore: number;        // 0-1, reject if < 0.5
  cachedResult?: string;        // Return early if found
  suggestedLevel?: ZoomLevel;   // Adaptive template selection
  sanitizedOptions: ComponentMapOptions;
  warnings: string[];
}
```

**CLI Hook Invocation**:
```bash
npx @claude-flow/cli@latest hooks pre-task \
  --description "Generate diagram: ${level} level for ${agentCount} agents" \
  --coordinate-swarm false
```

**Validation Checks**:
1. **Config Schema Validation** - Verify AgentScopeConfig structure
2. **Security Scanning** - Check for injection patterns in agent names/descriptions
3. **Resource Limits** - Reject if agent count > threshold (prevent DoS)
4. **Theme Validation** - Validate theme name against allowlist (see [SECURITY-theme-system.md](./SECURITY-theme-system.md#31-theme-name-validation))

### 2.3 Post-Generate Hook

**Purpose**: Validate output, calculate quality metrics, store successful patterns for learning.

**Integration Point**: After diagram generation completes

**Hook Invocation**:
```typescript
interface PostGenerateHookInput {
  requestId: string;
  input: PreGenerateHookInput;
  output: {
    diagram: string;
    generationTimeMs: number;
    nodeCount: number;
    edgeCount: number;
  };
  success: boolean;
  error?: Error;
}

interface PostGenerateHookOutput {
  stored: boolean;
  patternId?: string;
  qualityScore: number;       // 0-1 based on metrics
  learningFeedback: {
    shouldCache: boolean;
    suggestedOptimizations: string[];
  };
}
```

**CLI Hook Invocation**:
```bash
npx @claude-flow/cli@latest hooks post-task \
  --task-id "${requestId}" \
  --success ${success} \
  --store-results true

npx @claude-flow/cli@latest hooks post-edit \
  --file "diagram-output" \
  --train-neural true
```

**Post-Processing Tasks**:
1. **Output Validation** - Verify Mermaid syntax is valid
2. **Security Scan** - Check output for XSS/injection vulnerabilities
3. **Quality Metrics** - Calculate complexity, readability scores
4. **Pattern Storage** - Store successful generation patterns

### 2.4 Learning Hook

**Purpose**: Store successful patterns for future reference and enable adaptive improvements.

**Integration Point**: On successful generation with high quality score (>0.8)

**Memory Storage Pattern**:
```bash
npx @claude-flow/cli@latest memory store \
  --namespace "diagram-patterns" \
  --key "generation-${timestamp}-${hash}" \
  --value "${patternData}" \
  --tags "diagram,${level},${themeId}"
```

**Pattern Data Structure**:
```typescript
interface GenerationPattern {
  inputSignature: {
    agentCount: number;
    categoryDistribution: Record<string, number>;
    level: ZoomLevel;
    theme: string;
  };
  outputMetrics: {
    lineCount: number;
    nodeCount: number;
    edgeCount: number;
    generationTimeMs: number;
  };
  qualityScore: number;
  successRate: number;        // Historical success rate
  usageCount: number;
  lastUsed: number;
}
```

---

## 3. Security Considerations

### 3.1 Input Sanitization for Mermaid

**Reference**: [SECURITY-theme-system.md, Section 5.3](./SECURITY-theme-system.md#53-directive-injection-prevention)

**Required Sanitization Functions**:

| Function | Purpose | Location |
|----------|---------|----------|
| `sanitizeId()` | Sanitize node IDs | [component-map.ts:530](../../src/core/generators/diagrams/component-map.ts#L530) |
| `sanitizeNodeLabel()` | Sanitize user-provided labels | New function needed |
| `validateThemeName()` | Allowlist theme names | [loader.ts](../../src/core/themes/loader.ts) |
| `validateColor()` | Validate hex colors | [generator.ts](../../src/core/themes/generator.ts) |

**Sanitization Pipeline**:
```
User Input --> Length Check --> Pattern Detection --> Character Escape --> Safe Output
                  |                    |                    |
                  v                    v                    v
            Reject if >100       Block %%{, <script>   Replace []{}()#|;>
```

**Existing ID Sanitization** (enhance per [SECURITY-theme-system.md, Section 6.2](./SECURITY-theme-system.md#62-id-sanitization-enhancement)):
```typescript
// Current implementation in component-map.ts:530
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Enhanced version (proposed)
const MERMAID_RESERVED = ['end', 'graph', 'subgraph', 'direction', 'class', 'style'];

function sanitizeId(str: string): string {
  let sanitized = str.replace(/[^a-zA-Z0-9_]/g, '_');

  // Ensure starts with letter
  if (/^[0-9]/.test(sanitized)) {
    sanitized = 'n_' + sanitized;
  }

  // Avoid reserved words
  if (MERMAID_RESERVED.includes(sanitized.toLowerCase())) {
    sanitized = sanitized + '_node';
  }

  // Limit length
  return sanitized.slice(0, 50);
}
```

### 3.2 Path Traversal Prevention

**Reference**: [SECURITY-theme-system.md, Section 4](./SECURITY-theme-system.md#4-path-traversal-prevention)

**Allowed Config Directories**:
- `.claude/`
- `.agentscope/`
- `config/`

**Validation Flow**:
```
Theme Path Input --> Normalize --> Check ".." --> Resolve Absolute -->
                         |              |               |
                         v              v               v
                    Reject null    Reject if yes    Verify in allowed dir -->
                                                                |
                                                    Resolve symlinks --> Final path
```

**Theme Loading Security**:
```typescript
// In loader.ts - resolveTheme()
interface ThemeResolutionSecurity {
  allowedDirs: readonly string[];
  maxConfigSize: number;        // 100KB limit
  allowedExtensions: readonly string[];  // ['.json', '.yaml', '.yml']
  requireStrictSchema: boolean;
}
```

### 3.3 Safe Markdown Generation

**Mermaid Security Level** (mandatory):
```typescript
// Always use 'strict' - prevents click events and scripts
const MERMAID_SECURITY = {
  securityLevel: 'strict',  // NEVER allow 'loose'
  maxTextSize: 50000,
  maxEdges: 5000,
} as const;
```

**Output Escaping**:

| Context | Escape Function | Example |
|---------|-----------------|---------|
| Node labels | `sanitizeNodeLabel()` | `["Label"]` |
| Comments | Strip or escape `%%` | `%% Comment %%` |
| Subgraph titles | `sanitizeNodeLabel()` | `subgraph Title["..."]` |
| Link text | `sanitizeNodeLabel()` | `-->|text|` |

**Injection Patterns to Block** (from [SECURITY-theme-system.md, Section 5.3](./SECURITY-theme-system.md#53-directive-injection-prevention)):
```typescript
const DIRECTIVE_PATTERNS = [
  /%%\{/g,          // Directive start
  /\}%%/g,          // Directive end
  /init\s*:/i,      // init directive
  /config\s*:/i,    // config directive
  /<[^>]*>/,        // HTML tags
  /javascript:/i,   // javascript protocol
];
```

---

## 4. Self-Learning Integration

### 4.1 Pattern Storage for Successful Generations

**Storage Strategy**:
```
+-------------------+     +-------------------+     +-------------------+
|   Generation      | --> |   Quality Check   | --> |   Pattern Store   |
|   Complete        |     |   Score > 0.8?    |     |   (Memory API)    |
+-------------------+     +-------------------+     +-------------------+
                                   |
                                   | No
                                   v
                          +-------------------+
                          |   Log & Learn     |
                          |   From Failure    |
                          +-------------------+
```

**Pattern Namespace Organization**:
```
diagram-patterns/
  |-- summary/          # ZoomLevel = 'summary'
  |-- category/         # ZoomLevel = 'category'
  |-- detail/           # ZoomLevel = 'detail'
  |-- themes/           # Theme-specific patterns
  |-- failures/         # Failed generation patterns (for learning)
```

**Memory CLI Commands**:
```bash
# Store successful pattern
npx @claude-flow/cli@latest memory store \
  --namespace "diagram-patterns/category" \
  --key "pattern-${hash}" \
  --value '{"agentCount":50,"generationTimeMs":120,"qualityScore":0.92}'

# Search for similar patterns before generation
npx @claude-flow/cli@latest memory search \
  --namespace "diagram-patterns" \
  --query "category level 50 agents dark theme"
```

### 4.2 Quality Metrics Tracking

**Metrics Collected**:

| Metric | Description | Formula |
|--------|-------------|---------|
| Generation Time | Time to generate diagram | `endTime - startTime` |
| Node Density | Nodes per category | `totalNodes / categoryCount` |
| Edge Ratio | Connections per node | `totalEdges / totalNodes` |
| Complexity Score | Overall diagram complexity | `(nodes + edges) / area` |
| Readability Score | Based on label lengths | `avgLabelLength < 30 ? 1 : 0.5` |

**Quality Score Calculation**:
```typescript
interface QualityMetrics {
  generationTimeMs: number;
  nodeCount: number;
  edgeCount: number;
  categoryCount: number;
  avgLabelLength: number;
}

function calculateQualityScore(metrics: QualityMetrics): number {
  const weights = {
    time: 0.2,        // Faster is better
    density: 0.3,     // Balanced density
    readability: 0.3, // Clear labels
    completeness: 0.2 // All data represented
  };

  const timeScore = metrics.generationTimeMs < 500 ? 1 :
                    metrics.generationTimeMs < 2000 ? 0.7 : 0.4;
  const densityScore = metrics.nodeCount / metrics.categoryCount < 20 ? 1 :
                       metrics.nodeCount / metrics.categoryCount < 50 ? 0.7 : 0.4;
  const readabilityScore = metrics.avgLabelLength < 30 ? 1 : 0.5;
  const completenessScore = metrics.edgeCount > 0 ? 1 : 0.5;

  return (
    timeScore * weights.time +
    densityScore * weights.density +
    readabilityScore * weights.readability +
    completenessScore * weights.completeness
  );
}
```

### 4.3 Adaptive Template Selection

**Decision Tree**:
```
                    Input Config
                         |
                         v
              +---------------------+
              | Agent Count Check   |
              +---------------------+
                /        |        \
               /         |         \
           <20        20-100       >100
            |            |           |
            v            v           v
         Detail      Category     Summary
            |            |           |
            v            v           v
       Full labels   Grouped    Counts only
       All edges     Limited    No edges
```

**Adaptive Selection Hook**:
```bash
# Query learned patterns for best level
npx @claude-flow/cli@latest hooks route \
  --task "Generate diagram for ${agentCount} agents" \
  --context "theme:${theme},categories:${categoryCount}"
```

**Pattern-Based Recommendation**:
```typescript
interface AdaptiveSelection {
  suggestedLevel: ZoomLevel;
  confidence: number;        // 0-1
  basedOnPatterns: number;   // How many similar patterns
  reasoning: string;
}

async function selectAdaptiveLevel(
  agentCount: number,
  categoryCount: number
): Promise<AdaptiveSelection> {
  // Search for similar past generations
  const similarPatterns = await searchPatterns({
    query: `agents:${agentCount} categories:${categoryCount}`,
    namespace: 'diagram-patterns',
    limit: 10
  });

  if (similarPatterns.length === 0) {
    // Fall back to heuristics
    return {
      suggestedLevel: agentCount > 100 ? 'summary' :
                      agentCount > 20 ? 'category' : 'detail',
      confidence: 0.6,
      basedOnPatterns: 0,
      reasoning: 'Heuristic-based selection (no historical data)'
    };
  }

  // Find highest quality pattern
  const bestPattern = similarPatterns.reduce((best, p) =>
    p.qualityScore > best.qualityScore ? p : best
  );

  return {
    suggestedLevel: bestPattern.level,
    confidence: bestPattern.qualityScore,
    basedOnPatterns: similarPatterns.length,
    reasoning: `Selected based on ${similarPatterns.length} similar patterns`
  };
}
```

---

## 5. Performance Optimizations

### 5.1 Caching Strategies

**Cache Layers**:

```
+-------------------+     +-------------------+     +-------------------+
|   Memory Cache    | --> |   Disk Cache      | --> |   Pattern Cache   |
|   (LRU, 100 items)|     |   (SQLite)        |     |   (Claude Flow)   |
+-------------------+     +-------------------+     +-------------------+
      TTL: 5min              TTL: 1hour              TTL: 24hours
      Size: 10MB             Size: 100MB             Size: Unlimited
```

**Cache Key Generation**:
```typescript
function generateCacheKey(
  config: AgentScopeConfig,
  options: ComponentMapOptions
): string {
  const hash = crypto.createHash('sha256');

  hash.update(JSON.stringify({
    agentCount: config.agents.length,
    agentNames: config.agents.map(a => a.name).sort(),
    mcpServerCount: config.mcpServers.length,
    skillCount: config.skills.length,
    level: options.level,
    theme: options.theme,
    compact: options.compact,
  }));

  return `diagram-${hash.digest('hex').slice(0, 16)}`;
}
```

**Cache Invalidation Triggers**:
- Config file changes
- Theme file changes
- Explicit `--no-cache` flag
- Cache entry age > TTL

### 5.2 Lazy Generation

**Lazy Loading Strategy**:
```typescript
interface LazyDiagram {
  metadata: {
    level: ZoomLevel;
    nodeCount: number;
    generatedAt: number;
  };
  generate: () => Promise<string>;  // Deferred execution
}

function createLazyDiagram(
  config: AgentScopeConfig,
  options: ComponentMapOptions
): LazyDiagram {
  return {
    metadata: {
      level: options.level ?? 'category',
      nodeCount: config.agents.length,
      generatedAt: Date.now(),
    },
    generate: async () => {
      // Check cache first
      const cached = await checkCache(config, options);
      if (cached) return cached;

      // Generate on demand
      return generateComponentMap(config, options);
    }
  };
}
```

**Progressive Rendering**:
```
Phase 1: Generate skeleton (subgraphs only)
         |
         v
Phase 2: Add nodes (without connections)
         |
         v
Phase 3: Add connections (delegation)
         |
         v
Phase 4: Add tool connections
         |
         v
Phase 5: Apply styling
```

### 5.3 Parallel Processing Opportunities

**Parallelizable Operations**:

| Operation | Parallelization Strategy | Speedup |
|-----------|-------------------------|---------|
| Category grouping | Worker threads per category | 2-4x |
| Label formatting | Promise.all for batch | 1.5-2x |
| Security scanning | Concurrent pattern matching | 2x |
| Theme resolution | Async loading + caching | 1.3x |

**Parallel Category Generation**:
```typescript
async function generateCategoriesParallel(
  categorized: CategorizedAgents[],
  options: GenerationOptions
): Promise<string[][]> {
  // Generate each category subgraph in parallel
  const categoryPromises = categorized.map(async (cat) => {
    const lines: string[] = [];
    const catId = sanitizeId(cat.category);

    lines.push(`subgraph ${catId}["${cat.icon} ${cat.label}"]`);

    // Generate agent nodes
    for (const agent of cat.agents) {
      lines.push(`  ${sanitizeId(agent.name)}["${formatLabel(agent)}"]`);
    }

    lines.push('end');
    return lines;
  });

  return Promise.all(categoryPromises);
}
```

**Worker Pool Configuration** (via claude-flow):
```bash
# Dispatch parallel workers for large diagrams
npx @claude-flow/cli@latest hooks worker dispatch \
  --trigger optimize \
  --context "diagram-generation" \
  --priority high
```

---

## 6. Integration with Existing Codebase

### 6.1 Files to Modify

| File | Modification | Priority |
|------|--------------|----------|
| [component-map.ts](../../src/core/generators/diagrams/component-map.ts) | Add hook calls, enhance sanitization | High |
| [generator.ts](../../src/core/themes/generator.ts) | Add validation, security checks | High |
| [loader.ts](../../src/core/themes/loader.ts) | Path validation, safe loading | High |
| [hierarchy.ts](../../src/core/generators/diagrams/hierarchy.ts) | Apply same patterns | Medium |
| [dataflow.ts](../../src/core/generators/diagrams/dataflow.ts) | Apply same patterns | Medium |

### 6.2 New Files to Create

| File | Purpose |
|------|---------|
| `src/security/validators.ts` | Centralized validation functions |
| `src/security/sanitizers.ts` | Input/output sanitization |
| `src/hooks/generator-hooks.ts` | Hook integration layer |
| `src/cache/diagram-cache.ts` | Caching implementation |
| `tests/security/generator-security.test.ts` | Security test suite |

### 6.3 Hook Integration Points

**Pre-Generate Integration** in `generateComponentMap()`:
```typescript
// At start of generateComponentMap()
const preHookResult = await invokePreGenerateHook({
  config,
  options,
  requestId: generateRequestId(),
  context: { timestamp: Date.now(), caller: 'componentMap', version: '1.0.0' }
});

if (!preHookResult.validated) {
  throw new SecurityError('Input validation failed', preHookResult.warnings);
}

if (preHookResult.cachedResult) {
  return preHookResult.cachedResult;
}

// Use sanitized options
const sanitizedOptions = preHookResult.sanitizedOptions;
```

**Post-Generate Integration**:
```typescript
// At end of generateComponentMap()
const diagram = lines.join('\n');

await invokePostGenerateHook({
  requestId,
  input: preHookInput,
  output: {
    diagram,
    generationTimeMs: Date.now() - startTime,
    nodeCount: countNodes(diagram),
    edgeCount: countEdges(diagram),
  },
  success: true,
});

return diagram;
```

---

## 7. Testing Strategy

### 7.1 Security Tests

**Test Categories**:

| Category | Tests | Reference |
|----------|-------|-----------|
| Theme validation | Allowlist enforcement | [SECURITY Section 3.1](./SECURITY-theme-system.md#31-theme-name-validation) |
| Color validation | CSS injection prevention | [SECURITY Section 3.2](./SECURITY-theme-system.md#32-custom-color-validation) |
| Path validation | Traversal prevention | [SECURITY Section 4](./SECURITY-theme-system.md#4-path-traversal-prevention) |
| Label sanitization | Mermaid injection | [SECURITY Section 5](./SECURITY-theme-system.md#5-mermaid-specific-security) |

### 7.2 Hook Integration Tests

```typescript
// tests/integration/hooks/generator-hooks.test.ts
describe('Generator Hooks Integration', () => {
  it('should invoke pre-generate hook before generation', async () => {
    const hookSpy = vi.spyOn(hooks, 'preGenerate');
    await generateComponentMap(mockConfig, { theme: 'dark' });
    expect(hookSpy).toHaveBeenCalled();
  });

  it('should return cached result when available', async () => {
    const cachedDiagram = '```mermaid\ngraph TB\nA-->B\n```';
    vi.mocked(hooks.preGenerate).mockResolvedValue({
      validated: true,
      cachedResult: cachedDiagram,
      sanitizedOptions: {},
      warnings: [],
      securityScore: 1.0,
    });

    const result = await generateComponentMap(mockConfig, {});
    expect(result).toBe(cachedDiagram);
  });

  it('should store pattern on successful generation', async () => {
    const storeSpy = vi.spyOn(memory, 'store');
    await generateComponentMap(mockConfig, { theme: 'light' });
    expect(storeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'diagram-patterns' })
    );
  });
});
```

### 7.3 Performance Tests

```typescript
// tests/performance/generation.bench.ts
describe('Generation Performance', () => {
  bench('small config (10 agents)', async () => {
    await generateComponentMap(smallConfig, { level: 'detail' });
  });

  bench('medium config (100 agents)', async () => {
    await generateComponentMap(mediumConfig, { level: 'category' });
  });

  bench('large config (500 agents)', async () => {
    await generateComponentMap(largeConfig, { level: 'summary' });
  });

  bench('cached generation', async () => {
    // Second call should hit cache
    await generateComponentMap(mediumConfig, { level: 'category' });
    await generateComponentMap(mediumConfig, { level: 'category' });
  });
});
```

---

## 8. Migration Path

### 8.1 Phase 1: Security Hardening (Week 1)

- [ ] Implement `sanitizeNodeLabel()` function
- [ ] Enhance `sanitizeId()` with reserved word handling
- [ ] Add validation to theme loader
- [ ] Add security tests

### 8.2 Phase 2: Hook Integration (Week 2)

- [ ] Create `generator-hooks.ts` integration layer
- [ ] Add pre-generate hook call to `generateComponentMap()`
- [ ] Add post-generate hook call
- [ ] Integrate with claude-flow memory API

### 8.3 Phase 3: Learning System (Week 3)

- [ ] Implement pattern storage
- [ ] Add quality metrics calculation
- [ ] Create adaptive template selection
- [ ] Add learning feedback loop

### 8.4 Phase 4: Performance Optimization (Week 4)

- [ ] Implement caching layer
- [ ] Add lazy generation support
- [ ] Implement parallel category processing
- [ ] Performance testing and tuning

---

## 9. References

- [ADR-001: Mermaid Theme System](./ADR-001-mermaid-theme-system.md)
- [SECURITY: Theme System Security Review](./SECURITY-theme-system.md)
- [ARCHITECTURE: Theme System](./ARCHITECTURE-theme-system.md)
- [Claude Flow V3 Hooks Documentation](../../CLAUDE.md#v3-hooks-system-27-hooks--12-workers)
- [Component Map Generator](../../src/core/generators/diagrams/component-map.ts)
- [Theme Generator](../../src/core/themes/generator.ts)

---

*This design document should be reviewed by the security-architect agent before implementation begins.*
