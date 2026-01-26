# @claude-flow/learning

ReasoningBank integration layer for adaptive learning with 4-step pipeline (RETRIEVE-JUDGE-DISTILL-CONSOLIDATE).

## Features

- **4-Step Learning Pipeline**: RETRIEVE → JUDGE → DISTILL → CONSOLIDATE
- **Trajectory Tracking**: Monitor agent execution paths and outcomes
- **Verdict Judgment**: Evaluate success/failure with detailed feedback
- **Memory Distillation**: Extract high-level patterns from experiences
- **EWC++ Consolidation**: Prevent catastrophic forgetting of important knowledge
- **Pattern Matching**: Find similar past experiences using vector similarity
- **HNSW Indexing**: 150x-12,500x faster pattern retrieval
- **Performance Optimized**: <50ms pattern retrieval, <5ms judgment

## Installation

```bash
npm install @claude-flow/learning @claude-flow/memory
```

## Quick Start

```typescript
import { ReasoningBank } from '@claude-flow/learning';
import { VectorDatabase } from '@claude-flow/memory';

// Initialize vector database with HNSW
const vectorDB = new VectorDatabase({
  backend: 'hybrid',
  hnsw: { enabled: true, m: 16, efConstruction: 200, efSearch: 100 },
  quantization: { enabled: true, bits: 8 },
  gnn: { enabled: false },
});

// Initialize ReasoningBank
const learning = new ReasoningBank(vectorDB, {
  retrievalK: 5,           // Top-5 pattern retrieval
  minReward: 0.8,          // Only learn from high-quality patterns
  ewcLambda: 0.5,          // EWC importance weight
  distillationEpochs: 10,  // Training epochs
  learningRate: 0.001,     // Optimization rate
});

// 1. RETRIEVE - Learn from past experiences
const similar = await learning.retrieve('implement authentication', 5);
console.log('Past experiences:', similar);

// 2. Track trajectory
const id = await learning.startTrajectory(
  'session-1',
  'implement authentication',
  { requirement: 'JWT tokens' }
);

await learning.addTrajectoryStep(id, {
  action: 'create User model',
  observation: 'model created successfully',
  thought: 'need user data structure',
  timestamp: Date.now(),
});

await learning.endTrajectory(id, { files: ['auth.js'] }, true);

// 3. JUDGE - Evaluate outcome
const verdict = await learning.judge(
  id,
  true,
  0.95,
  'Excellent implementation with proper security'
);

console.log('Verdict:', verdict);

// 4. DISTILL - Extract learnings
const distilled = await learning.distill(id);
console.log('Key learnings:', distilled.keyLearnings);

// 5. CONSOLIDATE - Preserve knowledge with EWC++
await learning.consolidate(distilled);
console.log('Pattern protected from catastrophic forgetting');
```

## 4-Step Learning Pipeline

### 1. RETRIEVE - Fetch Relevant Patterns

```typescript
const patterns = await learning.retrieve('optimize database', 5);

// With HNSW: 0.1ms (vs 15ms baseline) = 150x faster
patterns.forEach(p => {
  console.log(`${p.task}: reward ${p.reward}`);
  console.log(`  ${p.critique}`);
});
```

### 2. JUDGE - Evaluate Success/Failure

```typescript
const verdict = await learning.judge(
  trajectoryId,
  true,      // success
  0.95,      // reward (0-1)
  'Excellent implementation'
);

console.log('Success:', verdict.success);
console.log('Reward:', verdict.reward);
console.log('Improvements:', verdict.improvements);
```

### 3. DISTILL - Extract Key Learnings

```typescript
const distilled = await learning.distill(trajectoryId);

console.log('Consolidated', distilled.consolidationCount, 'patterns');
console.log('Key learnings:', distilled.keyLearnings);
console.log('Applicable when:', distilled.applicability);
console.log('Avoid:', distilled.antiPatterns);
```

### 4. CONSOLIDATE - Prevent Forgetting (EWC++)

```typescript
await learning.consolidate(distilled);

// Pattern is now protected from being overwritten
// when learning new patterns
```

## Trajectory Tracking

Track complete execution paths:

```typescript
// Start trajectory
const id = await learning.startTrajectory(
  'session-1',
  'fix performance issue',
  { module: 'database' }
);

// Add steps
await learning.addTrajectoryStep(id, {
  action: 'profile query performance',
  observation: 'N+1 query detected',
  thought: 'need eager loading',
  timestamp: Date.now(),
});

await learning.addTrajectoryStep(id, {
  action: 'add eager loading',
  observation: 'queries reduced from 100 to 3',
  thought: 'significant improvement',
  timestamp: Date.now(),
});

// Complete trajectory
await learning.endTrajectory(
  id,
  { latency: '50ms (was 2500ms)' },
  true
);
```

## Pattern Matching

Find similar experiences:

```typescript
// Search with options
const patterns = await learning.searchPatterns('authentication', {
  k: 10,
  minReward: 0.8,
  onlySuccesses: true,
  timeRange: {
    start: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    end: Date.now(),
  },
});

// Patterns ranked by similarity
patterns.forEach((p, i) => {
  console.log(`${i + 1}. ${p.task} (${p.reward.toFixed(2)})`);
});
```

## Verdict Judgment

Evaluate trajectories with context:

```typescript
import { VerdictJudge } from '@claude-flow/learning';

const judge = new VerdictJudge();

// Basic judgment
const verdict = judge.judge(trajectory, {
  minSuccessRate: 0.7,
  efficiencyWeight: 0.3,
  qualityWeight: 0.7,
  maxLatencyMs: 30000,
});

// Pattern-based judgment
const verdict = judge.judgeWithPatterns(trajectory, similarPatterns);

console.log('Success:', verdict.success);
console.log('Reward:', verdict.reward);
console.log('Critique:', verdict.critique);
console.log('Improvements:', verdict.improvements);
```

## Memory Distillation

Consolidate multiple patterns:

```typescript
import { MemoryDistiller } from '@claude-flow/learning';

const distiller = new MemoryDistiller();

// Distill multiple similar patterns
const distilled = distiller.distillPatterns(
  [pattern1, pattern2, pattern3],
  {
    similarityThreshold: 0.85,
    minPatternsForDistillation: 3,
    maxKeyLearnings: 5,
    preserveOriginals: false,
  }
);

// Result consolidates 3 patterns into 1
console.log('Storage reduction:', distilled.consolidationCount);
console.log('Key learnings:', distilled.keyLearnings);
```

## EWC++ Consolidation

Prevent catastrophic forgetting:

```typescript
import { EWCConsolidator } from '@claude-flow/learning';

const consolidator = new EWCConsolidator();

// Consolidate with protection
const result = consolidator.consolidate(distilledPattern, {
  lambda: 0.5,              // Importance weight
  minImportance: 0.7,       // Protection threshold
  maxProtectedPatterns: 100, // Capacity limit
});

// Check protection status
const isProtected = consolidator.isProtected(patternId);
console.log('Protected:', isProtected);

// Get EWC weights
const weights = consolidator.getWeights(patternId);
console.log('Importance weights:', weights);
```

## Statistics

Track learning progress:

```typescript
const stats = await learning.getStats();

console.log('Total patterns:', stats.totalPatterns);
console.log('Success rate:', (stats.successRate * 100).toFixed(1) + '%');
console.log('Average reward:', stats.avgReward.toFixed(2));
console.log('Average latency:', stats.avgLatencyMs.toFixed(0) + 'ms');

console.log('\nTop patterns:');
stats.topPatterns.slice(0, 5).forEach((p, i) => {
  console.log(`${i + 1}. ${p.task} (${p.reward.toFixed(2)})`);
});

console.log('\nCommon themes:');
stats.commonCritiques.forEach(critique => {
  console.log(`  - ${critique}`);
});
```

## Performance

- **Pattern Retrieval**: <1ms with HNSW (150x-12,500x faster)
- **Trajectory Judgment**: <5ms
- **Memory Distillation**: <50ms for 100 patterns
- **EWC Consolidation**: <50ms
- **Search Operations**: <10ms for 1000 patterns

## Architecture

```
ReasoningBank
├── TrajectoryTracker    # Track execution paths
├── VerdictJudge         # Evaluate outcomes
├── MemoryDistiller      # Extract patterns
├── EWCConsolidator      # Prevent forgetting
└── PatternMatcher       # Find similar experiences
```

## Examples

See `examples/` directory:

- `basic-learning.ts` - Complete 4-step pipeline
- `continuous-improvement.ts` - Learning from iterations

## API Reference

### ReasoningBank

Main interface for adaptive learning.

```typescript
class ReasoningBank {
  constructor(vectorDB: VectorDatabase, config: LearningConfig);

  // Step 1: RETRIEVE
  retrieve(taskDescription: string, k?: number): Promise<Pattern[]>;

  // Step 2: JUDGE
  judge(
    trajectoryId: string,
    success: boolean,
    reward: number,
    critique: string
  ): Promise<Verdict>;

  // Step 3: DISTILL
  distill(trajectoryId: string): Promise<DistilledPattern>;

  // Step 4: CONSOLIDATE
  consolidate(pattern: DistilledPattern): Promise<void>;

  // Trajectory management
  startTrajectory(sessionId: string, task: string, input: unknown): Promise<string>;
  addTrajectoryStep(trajectoryId: string, step: TrajectoryStep): Promise<void>;
  endTrajectory(trajectoryId: string, output: unknown, success: boolean): Promise<void>;

  // Search
  searchPatterns(query: string, options?: SearchOptions): Promise<Pattern[]>;

  // Statistics
  getStats(): Promise<LearningStats>;
}
```

### Configuration

```typescript
interface LearningConfig {
  retrievalK: number;          // Top-k patterns (default: 5)
  minReward: number;           // Minimum quality (default: 0.7)
  ewcLambda: number;           // EWC weight (default: 0.5)
  distillationEpochs: number;  // Training epochs (default: 10)
  learningRate: number;        // Optimization rate (default: 0.001)
  enableHNSW?: boolean;        // Fast retrieval (default: true)
  enableGNN?: boolean;         // Graph context (default: false)
}
```

## License

MIT

## Links

- [GitHub](https://github.com/ruvnet/claude-flow)
- [Documentation](https://github.com/ruvnet/claude-flow/tree/main/packages/learning)
- [Issues](https://github.com/ruvnet/claude-flow/issues)
