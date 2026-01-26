# DDD v1.2 Quick Reference Guide

**Related:** [DDD-003: Learning-Enhanced Domain Model](../adr/DDD-003-learning-enhanced-domain-model.md)

---

## 5 Bounded Contexts

| Context | Type | Aggregate Root | Learning Capability |
|---------|------|----------------|---------------------|
| **AgentScanning** | Core | `AgentScopeConfiguration` | ✅ Scan patterns, file skips |
| **SecurityValidation** | Core | `SecurityAssessment` | ✅ Threat patterns, false positives |
| **DocumentationGeneration** | Core | `RichDocument` | ✅ Template preferences |
| **ThemeSystem** | Supporting | `ThemePalette` | ⚠️ Minimal (usage tracking) |
| **Intelligence** | Supporting | `IntelligenceCoordinator` | ✅ ACL to external systems |

---

## 5 Aggregate Roots

### 1. AgentScopeConfiguration (AgentScanning)

**Purpose:** Scan and parse AI agent configurations

**Invariants:**
- All agents must have unique names
- All delegation targets must reference existing agents
- MCP server URLs must be secure (https://)

**Learning:**
- Stores scan patterns (files scanned, duration, parser order)
- Learns file skip patterns (irrelevant files)
- Optimizes parser order based on success rate

**Events:**
- `AgentConfigScanned` - After successful scan
- `ScanPatternLearned` - After pattern stored
- `ValidationErrorLearned` - After error correction

---

### 2. SecurityAssessment (SecurityValidation)

**Purpose:** Validate security posture of agent configurations

**Invariants:**
- Risk scores must be 0-10
- All findings must have DREAD scores
- Critical findings must have mitigation steps

**Learning:**
- Stores threat patterns (regex, severity, confidence)
- Learns from false positives (reduces noise)
- Adjusts DREAD weights based on feedback

**Events:**
- `SecurityAssessmentCompleted` - After validation
- `ThreatPatternLearned` - After pattern stored
- `FalsePositiveReported` - After user feedback

---

### 3. RichDocument (DocumentationGeneration)

**Purpose:** Generate rich, navigable documentation

**Invariants:**
- Must have at least one section
- Navigation anchors must reference existing sections
- Security summary must include all critical findings

**Learning:**
- Stores template preferences (sections, order, verbosity)
- Learns from user edits (edit distance)
- Optimizes diagram selection

**Events:**
- `DocumentGenerated` - After generation
- `TemplatePreferenceLearned` - After pattern stored
- `UserEditRecorded` - After user changes

---

### 4. ThemePalette (ThemeSystem)

**Purpose:** Provide visual theming for diagrams

**Invariants:**
- All colors must be valid hex or 'none'
- Text colors must meet accessibility contrast ratios

**Learning:**
- Minimal - tracks theme usage by time of day
- No complex pattern storage

**Events:**
- `ThemeResolved` - After theme selected
- `ThemeLoadFailed` - After load error

---

### 5. IntelligenceCoordinator (Intelligence Context)

**Purpose:** Anti-Corruption Layer to external learning systems

**Invariants:**
- All stored patterns must have embeddings
- Confidence scores must be 0-1

**Role:**
- Translate domain events ↔ claude-flow hooks
- Translate domain queries ↔ AgentDB HNSW searches
- Translate domain operations ↔ ReasoningBank trajectories

**Events:**
- `PatternStoredInMemory` - After storage
- `SimilarPatternsFound` - After search
- `TrajectoryCompleted` - After operation

---

## Learning Integration Pattern

### 4-Step Learning Cycle

```
1. PRE-OPERATION
   ↓
   Aggregate.getOptimizations(context)
   ↓
   IntelligenceCoordinator.searchSimilarPatterns(query, k=5)
   ↓
   AgentDB.searchHNSW(embedding, k)
   ↓
   Return domain optimizations

2. OPERATION
   ↓
   Aggregate.executeOperation(params, optimizations)
   ↓
   Apply learned enhancements (file skips, parser order, etc.)

3. POST-OPERATION
   ↓
   Aggregate.recordOperationPattern(result)
   ↓
   IntelligenceCoordinator.storePattern(event)
   ↓
   Store in AgentDB (embedding) + ReasoningBank (trajectory)

4. FEEDBACK
   ↓
   User provides feedback (corrections, ratings)
   ↓
   Aggregate.learnFromFeedback(feedback)
   ↓
   IntelligenceCoordinator.adjustConfidence(patternId, delta)
   ↓
   Update pattern confidence scores
```

---

## Key Design Decisions

### 1. Intelligence Context is NOT a Core Domain

**Rationale:**
- Core domains (AgentScanning, SecurityValidation, DocumentationGeneration) contain pure business logic
- Intelligence Context is an anti-corruption layer that protects core domains from external system complexity
- External systems (claude-flow, AgentDB, ReasoningBank) are infrastructure concerns

**Pattern:**
```
Core Domain → Intelligence Context (ACL) → External Systems
```

---

### 2. Learning is Aggregate Behavior, Not a Separate Domain

**Rationale:**
- Learning is NOT a separate "Learning Domain"
- Each aggregate root has learning-enhanced behavior (`getOptimizations`, `recordPattern`, `learnFromFeedback`)
- Intelligence Context coordinates learning across aggregates

**Anti-Pattern (Rejected):**
```
❌ LearningDomain (separate context)
   - PatternLibrary (aggregate)
   - LearningEngine (service)
```

**Correct Pattern:**
```
✅ AgentScopeConfiguration (aggregate in AgentScanning)
   - getOptimizations() → uses Intelligence Context
   - recordPattern() → uses Intelligence Context
   - learnFromFeedback() → uses Intelligence Context
```

---

### 3. Anti-Corruption Layer Prevents External System Leakage

**Problem:**
External systems have their own concepts (hook events, vectors, trajectories) that don't map to domain concepts.

**Solution:**
Intelligence Context translates between domain language and external system language.

**Example:**

```typescript
// Domain Event (pure business logic)
interface AgentConfigScanned {
  type: 'AgentConfigScanned';
  configId: string;
  agentCount: number;
  duration: number;
  pattern: ScanPattern; // Domain value object
}

// Intelligence Context translates to external formats
class IntelligenceCoordinator {
  async storePattern(event: AgentConfigScanned): Promise<void> {
    // Translate to claude-flow hook event
    const hookEvent = this.claudeFlowAdapter.toHookEvent(event);

    // Translate to AgentDB embedding
    const embedding = this.agentDBAdapter.toEmbedding(event.pattern);

    // Translate to ReasoningBank trajectory
    const trajectory = this.reasoningBankAdapter.toTrajectory(event);

    // Store in external systems
    await Promise.all([
      this.claudeFlowAdapter.publishEvent(hookEvent),
      this.agentDBAdapter.storeEmbedding(embedding),
      this.reasoningBankAdapter.recordTrajectory(trajectory),
    ]);
  }
}
```

---

## Context Relationships

| Upstream | Downstream | Pattern | Description |
|----------|------------|---------|-------------|
| AgentScanning | SecurityValidation | Customer-Supplier | Config provides data |
| AgentScanning | DocumentationGeneration | Customer-Supplier | Config provides data |
| SecurityValidation | DocumentationGeneration | Customer-Supplier | Findings included |
| ThemeSystem | DocumentationGeneration | Open Host Service | Standard palette API |
| Core Domains | Intelligence | Published Events | Learning events |
| Intelligence | Core Domains | Published Events | Suggestions |
| Intelligence | External Systems | Anti-Corruption Layer | Protected domain |

---

## Storage Strategy

### AgentDB/HNSW (Vector Search)

**Storage:**
- 64-dimensional embeddings
- HNSW index for fast similarity search (<100ms)

**What is stored:**
- Scan patterns (config signature → optimal settings)
- Threat patterns (signature → detection rules)
- Template preferences (config signature → section order)

**Search:**
```typescript
// Query: Find similar scan patterns
const results = await agentDB.searchHNSW({
  embedding: computeEmbedding(configSignature),
  k: 5, // Top 5 results
});
```

---

### SQLite (Structured Data)

**Storage:**
- Pattern metadata (confidence, usage count, last used)
- User preferences (theme, verbosity)
- Statistics (daily usage metrics)

**Schema:**
```sql
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  config_hash TEXT NOT NULL,
  agent_count INTEGER,
  confidence REAL, -- 0-1
  usage_count INTEGER,
  last_used TIMESTAMP,
  embedding BLOB -- 64 * 8 bytes
);
```

---

### ReasoningBank (Trajectory Storage)

**Storage:**
- Operation trajectories (sequence of steps)
- Verdicts (success/failure judgments)
- Learned strategies

**Example:**
```typescript
// Trajectory: Scan operation
trajectory = {
  operation: 'scan-agent-config',
  steps: [
    { action: 'parse-claude-settings', success: true, duration: 50 },
    { action: 'parse-claude-md', success: true, duration: 30 },
    { action: 'validate-delegations', success: false, error: 'circular' },
  ],
  verdict: 'failure', // Learn from this
};
```

---

## Ubiquitous Language

### Core Terms

| Term | Definition | Context |
|------|------------|---------|
| **Agent** | Autonomous unit that performs tasks | AgentScanning |
| **Configuration** | Complete set of agent definitions | AgentScanning |
| **Assessment** | Security evaluation with DREAD scores | SecurityValidation |
| **Finding** | Security issue with severity | SecurityValidation |
| **Document** | Rich output with navigation | DocumentationGeneration |
| **Pattern** | Learned strategy stored in memory | Intelligence |
| **Embedding** | 64-dimensional vector | Intelligence |
| **Trajectory** | Sequence of operations with verdict | Intelligence |

### Learning Terms

| Term | Definition | Context |
|------|------------|---------|
| **Optimization** | Learned improvement suggestion | All Core Domains |
| **Confidence** | Pattern reliability score (0-1) | Intelligence |
| **Similarity** | Vector distance metric | Intelligence |
| **Feedback** | User correction that adjusts confidence | Intelligence |
| **Verdict** | Success/failure judgment | Intelligence |
| **False Positive** | Incorrect finding | SecurityValidation |

### Technical Terms

| Term | Definition | Context |
|------|------------|---------|
| **HNSW** | Hierarchical Navigable Small World (fast vector search) | Intelligence |
| **DREAD** | Damage, Reproducibility, Exploitability, Affected Users, Discoverability | SecurityValidation |
| **ACL** | Anti-Corruption Layer | Intelligence |
| **ReasoningBank** | Trajectory storage for self-learning | Intelligence |
| **AgentDB** | Vector database with HNSW indexing | Intelligence |

---

## Architecture Rules

### ✅ DO

1. **Use Intelligence Context for all learning**
   ```typescript
   // Correct
   const optimizations = await intelligenceContext.searchSimilarPatterns(query);
   ```

2. **Publish domain events after operations**
   ```typescript
   // Correct
   await aggregate.recordOperationPattern(result);
   ```

3. **Apply optimizations before operations**
   ```typescript
   // Correct
   const optimizations = await aggregate.getOptimizations(context);
   const result = await aggregate.executeOperation(params, optimizations);
   ```

4. **Learn from user feedback**
   ```typescript
   // Correct
   await aggregate.learnFromFeedback({ patternId, wasCorrect: false });
   ```

---

### ❌ DON'T

1. **Import external systems directly from core domains**
   ```typescript
   // WRONG
   import { AgentDB } from 'agentdb';
   class AgentScopeConfiguration {
     async scan() {
       await AgentDB.storePattern(); // ❌ Direct coupling
     }
   }

   // Correct
   class AgentScopeConfiguration {
     async scan() {
       await intelligenceContext.storePattern(); // ✅ Via ACL
     }
   }
   ```

2. **Create circular dependencies**
   ```typescript
   // WRONG
   AgentScanning → SecurityValidation → AgentScanning // ❌ Circular
   ```

3. **Skip learning steps**
   ```typescript
   // WRONG
   const result = await aggregate.executeOperation(params); // ❌ No optimizations
   ```

---

## Testing Strategy

### Unit Tests

**Core Domains:**
- Test aggregate invariants
- Test learning behavior (mock Intelligence Context)
- Test domain events
- Coverage target: 90%+

**Intelligence Context:**
- Test ACL translation (mock external systems)
- Test pattern storage
- Test similarity search
- Coverage target: 80%+

---

### Integration Tests

**Cross-Context:**
- Test AgentScanning → SecurityValidation → DocumentationGeneration flow
- Test learning cycle (store → retrieve → apply)
- Test feedback loop (adjust confidence)
- Coverage target: 85%+

---

### Architecture Tests

**Enforce Rules:**
```typescript
describe('DDD Architecture', () => {
  it('should not have circular dependencies', () => {
    const graph = analyzeDependencies('./src/core');
    expect(graph.hasCycles()).toBe(false);
  });

  it('should not import external systems from core domains', () => {
    const coreImports = findImports(['./src/core/scanning', './src/core/security']);
    const externalImports = coreImports.filter(imp =>
      imp.includes('claude-flow') || imp.includes('agentdb')
    );
    expect(externalImports).toHaveLength(0);
  });
});
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Scan Speed Improvement** | 25%+ faster after 10 scans | Time measurement |
| **False Positive Reduction** | 40%+ reduction after 20 scans | User feedback |
| **Template Accuracy** | 80%+ user satisfaction | Survey/edits |
| **Pattern Confidence** | >0.85 after 15+ uses | Confidence scores |
| **Memory Footprint** | <50MB for 100 patterns | Storage measurement |
| **HNSW Search Speed** | <100ms for k=10 | Performance test |

---

## Implementation Checklist

- [ ] Define all aggregate roots with invariants
- [ ] Implement learning behavior (`getOptimizations`, `recordPattern`, `learnFromFeedback`)
- [ ] Create Intelligence Context as ACL
- [ ] Implement adapters (ClaudeFlow, AgentDB, ReasoningBank)
- [ ] Define domain events
- [ ] Implement event publishing
- [ ] Setup AgentDB/HNSW storage
- [ ] Setup ReasoningBank trajectory storage
- [ ] Write unit tests (90%+ coverage)
- [ ] Write integration tests (85%+ coverage)
- [ ] Write architecture tests (enforce rules)
- [ ] Measure learning metrics (speed, accuracy, satisfaction)

---

*Generated by AgentScope DDD Expert*
*Last Updated: 2026-01-25*
