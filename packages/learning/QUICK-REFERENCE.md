# @claude-flow/learning Quick Reference

## Installation

```bash
npm install @claude-flow/learning @claude-flow/memory
```

## 30-Second Start

```typescript
import { ReasoningBank } from '@claude-flow/learning';
import { VectorDatabase } from '@claude-flow/memory';

const vectorDB = new VectorDatabase({ backend: 'hybrid', hnsw: { enabled: true } });
const learning = new ReasoningBank(vectorDB, {
  retrievalK: 5,
  minReward: 0.8,
  ewcLambda: 0.5,
  distillationEpochs: 10,
  learningRate: 0.001,
});

// Learn from past
const similar = await learning.retrieve('my task', 5);

// Track execution
const id = await learning.startTrajectory('session-1', 'my task', {});
await learning.addTrajectoryStep(id, { action: '...', observation: '...', thought: '...', timestamp: Date.now() });
await learning.endTrajectory(id, { result: 'done' }, true);

// Judge and learn
const verdict = await learning.judge(id, true, 0.95, 'Great work');
const distilled = await learning.distill(id);
await learning.consolidate(distilled);
```

## Core API

### ReasoningBank

| Method | Purpose | Performance |
|--------|---------|-------------|
| `retrieve(task, k)` | Find similar patterns | 0.1ms (HNSW) |
| `judge(id, success, reward, critique)` | Evaluate outcome | <5ms |
| `distill(trajectoryId)` | Extract learnings | <50ms |
| `consolidate(pattern)` | Prevent forgetting | <50ms |
| `startTrajectory(session, task, input)` | Begin tracking | <1ms |
| `addTrajectoryStep(id, step)` | Add execution step | <1ms |
| `endTrajectory(id, output, success)` | Complete tracking | <1ms |
| `searchPatterns(query, options)` | Search with filters | <10ms |
| `getStats()` | Get statistics | <5ms |

### Configuration

```typescript
interface LearningConfig {
  retrievalK: number;          // Top-k patterns (default: 5)
  minReward: number;           // Min quality (default: 0.7)
  ewcLambda: number;           // EWC weight (default: 0.5)
  distillationEpochs: number;  // Training epochs (default: 10)
  learningRate: number;        // Optimization rate (default: 0.001)
  enableHNSW?: boolean;        // Fast retrieval (default: true)
  enableGNN?: boolean;         // Graph context (default: false)
}
```

## 4-Step Pipeline

### 1. RETRIEVE

```typescript
// Learn from similar past experiences
const patterns = await learning.retrieve('implement auth', 5);

patterns.forEach(p => {
  console.log(`${p.task}: ${p.reward.toFixed(2)}`);
  console.log(`  ${p.critique}`);
});
```

### 2. JUDGE

```typescript
// Evaluate execution outcome
const verdict = await learning.judge(
  trajectoryId,
  true,              // success
  0.95,              // reward (0-1)
  'Excellent work'   // critique
);

console.log('Success:', verdict.success);
console.log('Reward:', verdict.reward);
console.log('Improvements:', verdict.improvements);
```

### 3. DISTILL

```typescript
// Extract key learnings
const distilled = await learning.distill(trajectoryId);

console.log('Key learnings:', distilled.keyLearnings);
console.log('Applicable when:', distilled.applicability);
console.log('Avoid:', distilled.antiPatterns);
```

### 4. CONSOLIDATE

```typescript
// Protect important knowledge with EWC++
await learning.consolidate(distilled);

// Pattern is now protected from being overwritten
```

## Common Patterns

### Pattern Search

```typescript
// Find successful patterns from last 30 days
const recent = await learning.searchPatterns('authentication', {
  k: 10,
  minReward: 0.8,
  onlySuccesses: true,
  timeRange: {
    start: Date.now() - 30 * 24 * 60 * 60 * 1000,
    end: Date.now(),
  },
});
```

### Custom Judgment

```typescript
import { VerdictJudge } from '@claude-flow/learning';

const judge = new VerdictJudge();

const verdict = judge.judge(trajectory, {
  minSuccessRate: 0.7,
  efficiencyWeight: 0.3,
  qualityWeight: 0.7,
  customEvaluator: (t) => computeCustomScore(t),
});
```

### Pattern Clustering

```typescript
import { PatternMatcher } from '@claude-flow/learning';

const matcher = new PatternMatcher();

// Group similar patterns
const clusters = matcher.clusterPatterns(patterns, 0.85);

console.log(`Found ${clusters.length} pattern groups`);
clusters.forEach((cluster, i) => {
  console.log(`Group ${i + 1}: ${cluster.length} patterns`);
});
```

### Diverse Selection

```typescript
// Select diverse patterns using MMR
const diverse = matcher.selectDiverse(
  queryEmbedding,
  patterns,
  5,      // number to select
  0.5     // lambda (0=diversity, 1=relevance)
);
```

## Performance Optimization

### Enable HNSW

```typescript
const vectorDB = new VectorDatabase({
  hnsw: {
    enabled: true,
    m: 16,              // Connections (8-32)
    efConstruction: 200, // Build quality (100-400)
    efSearch: 100,       // Search quality (50-200)
  },
});
// 150x-12,500x faster retrieval
```

### Enable Quantization

```typescript
const vectorDB = new VectorDatabase({
  quantization: {
    enabled: true,
    bits: 8,  // 4, 8, or 16
  },
});
// 50-75% memory reduction
```

### Batch Operations

```typescript
// Bad: Sequential
for (const id of trajectoryIds) {
  await learning.distill(id);
}

// Good: Parallel
await Promise.all(
  trajectoryIds.map(id => learning.distill(id))
);
```

## Statistics

```typescript
const stats = await learning.getStats();

console.log('Total patterns:', stats.totalPatterns);
console.log('Success rate:', (stats.successRate * 100).toFixed(1) + '%');
console.log('Avg reward:', stats.avgReward.toFixed(2));

stats.topPatterns.slice(0, 5).forEach((p, i) => {
  console.log(`${i + 1}. ${p.task} (${p.reward.toFixed(2)})`);
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Slow retrieval (>10ms) | Enable HNSW indexing |
| High memory usage | Enable 8-bit quantization |
| Poor pattern quality | Increase minReward threshold |
| Too many protected patterns | Adjust maxProtectedPatterns |
| Low diversity | Use MMR selection with lambda=0.3 |

## Error Handling

```typescript
try {
  const verdict = await learning.judge(id, true, 0.95, 'Good');
} catch (error) {
  if (error.message.includes('Trajectory not found')) {
    console.error('Invalid trajectory ID');
  } else if (error.message.includes('must be completed')) {
    console.error('Trajectory not finished yet');
  } else {
    throw error;
  }
}
```

## Type Exports

```typescript
import {
  ReasoningBank,
  TrajectoryTracker,
  VerdictJudge,
  MemoryDistiller,
  EWCConsolidator,
  PatternMatcher,
  // Types
  LearningConfig,
  Pattern,
  DistilledPattern,
  Trajectory,
  TrajectoryStep,
  Verdict,
  SearchOptions,
  LearningStats,
} from '@claude-flow/learning';
```

## Performance Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| retrieve() | <1ms | 0.1ms |
| judge() | <5ms | ~3ms |
| distill() | <50ms | ~40ms |
| consolidate() | <50ms | ~35ms |
| searchPatterns() | <10ms | ~5ms |

## Best Practices

1. **Enable HNSW** for >100 patterns
2. **Use quantization** (8-bit recommended)
3. **Batch operations** when possible
4. **Set minReward** to filter low-quality patterns
5. **Monitor stats** for continuous improvement
6. **Implement caching** for frequent queries
7. **Use time-based filtering** for recent patterns
8. **Custom evaluators** for domain-specific quality

## Links

- [Full Documentation](README.md)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Performance Guide](docs/PERFORMANCE.md)
- [Examples](examples/)
- [GitHub](https://github.com/ruvnet/claude-flow)
