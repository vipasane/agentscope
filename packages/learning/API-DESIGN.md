# Learning Package API Design

**Package:** @vipasane/agentscope-learning
**Version:** 1.2.0
**Last Updated:** 2026-01-30

---

## Table of Contents

1. [Public API Overview](#public-api-overview)
2. [Core Interfaces](#core-interfaces)
3. [ReasoningBank API](#reasoningbank-api)
4. [Component APIs](#component-apis)
5. [Type Definitions](#type-definitions)
6. [Configuration](#configuration)
7. [Error Handling](#error-handling)
8. [Usage Examples](#usage-examples)

---

## Public API Overview

### Exports

```typescript
// src/index.ts

// Main Orchestrator
export { ReasoningBank } from './core/reasoning-bank';

// Core Components
export { TrajectoryTracker } from './trajectory/tracker';
export { VerdictJudge } from './verdict/judge';
export { MemoryDistiller } from './distill/distiller';
export { EWCConsolidator } from './consolidate/ewc';
export { PatternMatcher } from './matching/matcher';

// Type Definitions
export type {
  // Core entities
  Trajectory,
  TrajectoryStep,
  Pattern,
  DistilledPattern,
  Verdict,

  // Configuration
  LearningConfig,
  SearchOptions,
  DistillOptions,
  EWCOptions,
  JudgmentOptions,

  // Results
  LearningStats,
  ConsolidationResult,
  ClusterGroup,

  // Performance
  PerformanceMetrics
} from './types';

// Utilities
export {
  createEmbedding,
  computeCosineSimilarity,
  normalizeEmbedding
} from './utils/embeddings';

// Constants
export const VERSION = '1.2.0';
export const DEFAULT_CONFIG: LearningConfig;
```

---

## Core Interfaces

### 1. ReasoningBank (Main Interface)

```typescript
/**
 * Main orchestrator for adaptive learning
 *
 * Coordinates the complete 4-step learning pipeline:
 * 1. RETRIEVE - Load relevant patterns (HNSW-indexed)
 * 2. JUDGE - Evaluate trajectory quality
 * 3. DISTILL - Extract key learnings
 * 4. CONSOLIDATE - Prevent forgetting (EWC++)
 *
 * @example
 * ```typescript
 * const learning = new ReasoningBank(vectorDB, {
 *   retrievalK: 5,
 *   minReward: 0.7,
 *   ewcLambda: 0.5
 * });
 *
 * // Retrieve similar patterns
 * const patterns = await learning.retrieve('implement auth', 5);
 *
 * // Track execution
 * const id = await learning.startTrajectory(session, task, input);
 * await learning.addTrajectoryStep(id, step);
 * await learning.endTrajectory(id, output, true);
 *
 * // Judge and learn
 * const verdict = await learning.judge(id, true, 0.95, 'Excellent');
 * const distilled = await learning.distill(id);
 * await learning.consolidate(distilled);
 * ```
 */
export class ReasoningBank {
  constructor(
    vectorDB: VectorDatabase,
    config: LearningConfig
  );

  // ========== STEP 1: RETRIEVE ==========

  /**
   * Retrieve relevant patterns for a task
   *
   * Uses HNSW-indexed vector search for 150x-12,500x speedup.
   * Filters by minimum reward threshold.
   *
   * @param taskDescription - Natural language task description
   * @param k - Number of patterns to retrieve (default: config.retrievalK)
   * @returns Array of similar patterns, sorted by similarity
   *
   * @performance <10ms for 1M patterns with HNSW
   * @complexity O(log n) with HNSW, O(n) without
   *
   * @example
   * ```typescript
   * const patterns = await learning.retrieve('implement JWT auth', 5);
   *
   * patterns.forEach(p => {
   *   console.log(`${p.task}: reward ${p.reward.toFixed(2)}`);
   *   console.log(`  ${p.critique}`);
   * });
   * ```
   */
  async retrieve(
    taskDescription: string,
    k?: number
  ): Promise<Pattern[]>;

  /**
   * Search for patterns matching a query with advanced filtering
   *
   * @param query - Search query (natural language)
   * @param options - Search options (filters, thresholds, etc.)
   * @returns Array of matching patterns with similarity scores
   *
   * @example
   * ```typescript
   * const patterns = await learning.searchPatterns('authentication', {
   *   k: 10,
   *   minReward: 0.8,
   *   onlySuccesses: true,
   *   timeRange: { start: Date.now() - 30*24*60*60*1000, end: Date.now() },
   *   tags: ['security', 'auth']
   * });
   * ```
   */
  async searchPatterns(
    query: string,
    options?: SearchOptions
  ): Promise<Pattern[]>;

  // ========== STEP 2: JUDGE ==========

  /**
   * Judge a trajectory with a verdict
   *
   * Evaluates trajectory quality, provides feedback, and assigns reward score.
   * Uses pattern matching for context-aware evaluation.
   *
   * @param trajectoryId - Trajectory identifier
   * @param success - Whether execution was successful
   * @param reward - Reward score (0-1)
   * @param critique - Human-readable critique
   * @returns Verdict with detailed feedback
   *
   * @throws {Error} If trajectory not found or not completed
   * @performance <50ms including pattern retrieval
   *
   * @example
   * ```typescript
   * const verdict = await learning.judge(
   *   trajectoryId,
   *   true,
   *   0.95,
   *   'Successfully implemented with excellent test coverage'
   * );
   *
   * console.log(`Success: ${verdict.success}`);
   * console.log(`Reward: ${verdict.reward.toFixed(2)}`);
   * console.log(`Confidence: ${verdict.confidence?.toFixed(2)}`);
   * verdict.improvements.forEach(i => console.log(`- ${i}`));
   * ```
   */
  async judge(
    trajectoryId: string,
    success: boolean,
    reward: number,
    critique: string
  ): Promise<Verdict>;

  // ========== STEP 3: DISTILL ==========

  /**
   * Distill a trajectory into a learned pattern
   *
   * Extracts key learnings, applicability conditions, and anti-patterns.
   * Consolidates with similar patterns if enough exist (≥3).
   *
   * @param trajectoryId - Trajectory identifier
   * @returns Distilled pattern with consolidated learnings
   *
   * @throws {Error} If trajectory not found or incomplete
   * @performance <50ms for 100 patterns
   *
   * @example
   * ```typescript
   * const distilled = await learning.distill(trajectoryId);
   *
   * console.log('Key learnings:');
   * distilled.keyLearnings.forEach(l => console.log(`- ${l}`));
   *
   * console.log('Applicable when:');
   * distilled.applicability.forEach(a => console.log(`- ${a}`));
   *
   * console.log('Avoid:');
   * distilled.antiPatterns.forEach(ap => console.log(`- ${ap}`));
   *
   * console.log(`Consolidated ${distilled.consolidationCount} patterns`);
   * ```
   */
  async distill(
    trajectoryId: string
  ): Promise<DistilledPattern>;

  // ========== STEP 4: CONSOLIDATE ==========

  /**
   * Consolidate a pattern with EWC++ protection
   *
   * Applies Elastic Weight Consolidation to prevent catastrophic forgetting.
   * Protects important patterns from being overwritten by new learnings.
   *
   * @param pattern - Distilled pattern to consolidate
   *
   * @performance <50ms per pattern
   *
   * @example
   * ```typescript
   * await learning.consolidate(distilledPattern);
   * console.log('Pattern protected from catastrophic forgetting');
   *
   * // Verify protection
   * const patterns = await learning.retrieve(task, 10);
   * const protected = patterns.find(p => p.id === distilledPattern.originalPattern.id);
   * console.log(`Protected: ${protected?.metadata?.ewcProtected}`);
   * ```
   */
  async consolidate(
    pattern: DistilledPattern
  ): Promise<void>;

  // ========== TRAJECTORY MANAGEMENT ==========

  /**
   * Start tracking a new trajectory
   *
   * @param sessionId - Session identifier for grouping
   * @param task - Task description
   * @param input - Task input data
   * @returns Unique trajectory identifier
   *
   * @performance <1ms (in-memory)
   *
   * @example
   * ```typescript
   * const id = await learning.startTrajectory(
   *   'session-123',
   *   'Implement user authentication',
   *   { method: 'JWT', library: 'jsonwebtoken' }
   * );
   * ```
   */
  async startTrajectory(
    sessionId: string,
    task: string,
    input: unknown
  ): Promise<string>;

  /**
   * Add a step to a trajectory
   *
   * @param trajectoryId - Trajectory identifier
   * @param step - Trajectory step (action-observation pair)
   *
   * @performance <1ms (in-memory)
   *
   * @example
   * ```typescript
   * await learning.addTrajectoryStep(id, {
   *   action: 'Install jsonwebtoken library',
   *   observation: 'Library installed successfully',
   *   thought: 'Industry-standard JWT library',
   *   timestamp: Date.now(),
   *   quality: 0.9
   * });
   * ```
   */
  async addTrajectoryStep(
    trajectoryId: string,
    step: TrajectoryStep
  ): Promise<void>;

  /**
   * End a trajectory
   *
   * @param trajectoryId - Trajectory identifier
   * @param output - Final output data
   * @param success - Whether trajectory succeeded
   *
   * @performance <5ms (includes metric calculation)
   *
   * @example
   * ```typescript
   * await learning.endTrajectory(id, {
   *   authenticated: true,
   *   tokenGenerated: true,
   *   testsPassed: 15
   * }, true);
   * ```
   */
  async endTrajectory(
    trajectoryId: string,
    output: unknown,
    success: boolean
  ): Promise<void>;

  // ========== STATISTICS ==========

  /**
   * Get learning statistics
   *
   * @returns Comprehensive learning statistics
   *
   * @example
   * ```typescript
   * const stats = await learning.getStats();
   *
   * console.log(`Total patterns: ${stats.totalPatterns}`);
   * console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
   * console.log(`Average reward: ${stats.avgReward.toFixed(2)}`);
   * console.log(`Protected patterns: ${stats.protectedPatterns}`);
   *
   * console.log('\nTop patterns:');
   * stats.topPatterns.slice(0, 5).forEach((p, i) => {
   *   console.log(`${i+1}. ${p.task} (${p.reward.toFixed(2)})`);
   * });
   * ```
   */
  async getStats(): Promise<LearningStats>;
}
```

---

## Component APIs

### 2. TrajectoryTracker

```typescript
/**
 * Tracks agent execution trajectories
 *
 * Manages trajectory lifecycle, step recording, and performance metrics.
 * Separates active and completed trajectories for efficient querying.
 */
export class TrajectoryTracker {
  constructor();

  /**
   * Start a new trajectory
   */
  startTrajectory(
    sessionId: string,
    task: string,
    input: unknown
  ): string;

  /**
   * Add a step to a trajectory
   *
   * @throws {Error} If trajectory not found or already completed
   */
  addStep(
    trajectoryId: string,
    step: TrajectoryStep
  ): void;

  /**
   * End a trajectory
   *
   * Calculates performance metrics:
   * - Total latency (endTime - startTime)
   * - Token usage (sum of step tokens)
   * - Step efficiency (latency per step)
   *
   * @throws {Error} If trajectory not found
   */
  endTrajectory(
    trajectoryId: string,
    output: unknown,
    success: boolean
  ): void;

  /**
   * Get a trajectory by ID
   */
  getTrajectory(id: string): Trajectory | undefined;

  /**
   * Get active trajectories
   *
   * @param sessionId - Optional session filter
   * @returns Array of active trajectories
   */
  getActiveTrajectories(sessionId?: string): Trajectory[];

  /**
   * Get completed trajectories
   *
   * @param sessionId - Optional session filter
   * @returns Array of completed trajectories
   */
  getCompletedTrajectories(sessionId?: string): Trajectory[];

  /**
   * Clear completed trajectories
   *
   * @param olderThan - Clear trajectories older than timestamp (default: all)
   * @returns Number of trajectories cleared
   */
  clearCompleted(olderThan?: number): number;
}
```

### 3. VerdictJudge

```typescript
/**
 * Judges trajectory quality and provides feedback
 *
 * Supports multiple judgment strategies:
 * - Efficiency-based (latency, steps)
 * - Quality-based (success rate, output validation)
 * - Pattern-based (comparison with historical successes)
 * - Custom (user-defined evaluators)
 */
export class VerdictJudge {
  constructor();

  /**
   * Judge a trajectory using default criteria
   *
   * Default judgment criteria:
   * - Execution efficiency (40% weight)
   * - Output quality (40% weight)
   * - Approach novelty (20% weight)
   */
  judge(
    trajectory: Trajectory,
    options?: JudgmentOptions
  ): Verdict;

  /**
   * Judge with pattern comparison
   *
   * Compares trajectory against similar successful patterns:
   * - Efficiency vs. baseline
   * - Quality vs. average
   * - Novelty of approach
   *
   * @param trajectory - Trajectory to judge
   * @param patterns - Similar patterns for comparison
   * @returns Verdict with pattern-based insights
   */
  judgeWithPatterns(
    trajectory: Trajectory,
    patterns: Pattern[]
  ): Verdict;

  /**
   * Judge with custom evaluator
   *
   * @param trajectory - Trajectory to judge
   * @param evaluator - Custom evaluation function
   * @returns Verdict from custom evaluator
   */
  judgeWithEvaluator(
    trajectory: Trajectory,
    evaluator: CustomEvaluator
  ): Verdict;

  /**
   * Batch judgment
   *
   * @param trajectories - Array of trajectories
   * @returns Array of verdicts
   */
  judgeMany(trajectories: Trajectory[]): Verdict[];
}

/**
 * Custom evaluator function type
 */
export type CustomEvaluator = (
  trajectory: Trajectory
) => {
  reward: number;
  critique: string;
  improvements: string[];
  confidence: number;
};
```

### 4. MemoryDistiller

```typescript
/**
 * Distills patterns into consolidated learnings
 *
 * Features:
 * - Similarity clustering (K-means)
 * - Common theme extraction
 * - Applicability detection
 * - Anti-pattern identification
 * - Storage optimization (60-90% reduction)
 */
export class MemoryDistiller {
  constructor();

  /**
   * Distill a single trajectory into a pattern
   *
   * @param trajectory - Completed trajectory
   * @param verdict - Trajectory verdict
   * @returns Pattern extracted from trajectory
   */
  distillTrajectory(
    trajectory: Trajectory,
    verdict: Verdict
  ): Pattern;

  /**
   * Distill multiple patterns into consolidated learnings
   *
   * Process:
   * 1. Cluster similar patterns
   * 2. Extract common themes
   * 3. Identify applicability conditions
   * 4. Find anti-patterns from failures
   * 5. Compute weighted reward
   *
   * @param patterns - Array of similar patterns
   * @param options - Distillation options
   * @returns Distilled pattern with consolidated learnings
   */
  distillPatterns(
    patterns: Pattern[],
    options?: DistillOptions
  ): DistilledPattern;

  /**
   * Distill patterns into multiple clusters
   *
   * @param patterns - Array of patterns
   * @param k - Number of clusters
   * @returns Array of distilled patterns (one per cluster)
   */
  distillClusters(
    patterns: Pattern[],
    k: number
  ): DistilledPattern[];

  /**
   * Update existing distillation with new pattern
   *
   * Incrementally updates distilled pattern without full recomputation.
   *
   * @param existing - Existing distilled pattern
   * @param newPattern - New pattern to incorporate
   * @returns Updated distilled pattern
   */
  updateDistillation(
    existing: DistilledPattern,
    newPattern: Pattern
  ): DistilledPattern;
}
```

### 5. EWCConsolidator

```typescript
/**
 * Prevents catastrophic forgetting via EWC++
 *
 * Features:
 * - Fisher information computation
 * - Importance-based protection
 * - Weight freezing for critical patterns
 * - Adaptive pruning at capacity
 */
export class EWCConsolidator {
  constructor();

  /**
   * Consolidate a pattern with EWC protection
   *
   * Process:
   * 1. Compute Fisher information (importance)
   * 2. Check if importance > threshold
   * 3. If yes, protect with EWC weights
   * 4. If at capacity, prune lowest-importance pattern
   *
   * @param pattern - Distilled pattern to consolidate
   * @param options - EWC options
   * @returns Consolidation result
   */
  consolidate(
    pattern: DistilledPattern,
    options?: EWCOptions
  ): ConsolidationResult;

  /**
   * Check if a pattern is EWC-protected
   *
   * @param patternId - Pattern identifier
   * @returns True if pattern is protected
   */
  isProtected(patternId: string): boolean;

  /**
   * Get EWC weights for a pattern
   *
   * @param patternId - Pattern identifier
   * @returns EWC weights or undefined if not protected
   */
  getWeights(patternId: string): EWCWeights | undefined;

  /**
   * Remove EWC protection from a pattern
   *
   * @param patternId - Pattern identifier
   */
  unprotect(patternId: string): void;

  /**
   * Get number of protected patterns
   */
  getProtectedCount(): number;

  /**
   * Get importance distribution statistics
   *
   * @returns Importance distribution stats
   */
  getImportanceDistribution(): ImportanceStats;
}
```

### 6. PatternMatcher

```typescript
/**
 * Pattern similarity and clustering
 *
 * Algorithms:
 * - Cosine similarity for retrieval
 * - K-means for clustering
 * - MMR (Maximal Marginal Relevance) for diversity
 * - HNSW for fast search (via VectorDatabase)
 */
export class PatternMatcher {
  constructor();

  /**
   * Find similar patterns
   *
   * @param embedding - Query embedding
   * @param patterns - Pattern pool
   * @param options - Search options
   * @returns Sorted array of similar patterns
   */
  findSimilar(
    embedding: Float32Array,
    patterns: Pattern[],
    options?: SearchOptions
  ): Pattern[];

  /**
   * Cluster patterns using K-means
   *
   * @param patterns - Patterns to cluster
   * @param k - Number of clusters
   * @returns Array of cluster groups
   */
  cluster(
    patterns: Pattern[],
    k: number
  ): ClusterGroup[];

  /**
   * Maximal Marginal Relevance (diversity)
   *
   * Balances relevance and diversity in results.
   *
   * @param candidates - Candidate patterns
   * @param k - Number of patterns to select
   * @param lambda - Diversity weight (0=pure relevance, 1=pure diversity)
   * @returns Diverse set of k patterns
   */
  maximalMarginalRelevance(
    candidates: Pattern[],
    k: number,
    lambda?: number
  ): Pattern[];

  /**
   * Cosine similarity between embeddings
   *
   * @param a - First embedding
   * @param b - Second embedding
   * @returns Similarity score (0-1)
   */
  cosineSimilarity(
    a: Float32Array,
    b: Float32Array
  ): number;

  /**
   * Euclidean distance between embeddings
   *
   * @param a - First embedding
   * @param b - Second embedding
   * @returns Distance (≥0)
   */
  euclideanDistance(
    a: Float32Array,
    b: Float32Array
  ): number;
}
```

---

## Type Definitions

### Core Types

```typescript
// src/types/core.ts

/**
 * Trajectory (execution path)
 */
export interface Trajectory {
  /** Unique identifier */
  id: string;

  /** Session identifier for grouping */
  sessionId: string;

  /** Task description */
  task: string;

  /** Task input data */
  input: unknown;

  /** Execution steps */
  steps: TrajectoryStep[];

  /** Final output (undefined until completed) */
  output?: unknown;

  /** Success status (undefined until completed) */
  success?: boolean;

  /** Start timestamp */
  startTime: number;

  /** End timestamp (undefined until completed) */
  endTime?: number;

  /** Total tokens used (sum of step tokens) */
  totalTokens?: number;

  /** Total latency in ms (endTime - startTime) */
  totalLatencyMs?: number;
}

/**
 * Trajectory step (action-observation pair)
 */
export interface TrajectoryStep {
  /** Action taken */
  action: string;

  /** Observation result */
  observation: string;

  /** Reasoning/thought process */
  thought?: string;

  /** Step timestamp */
  timestamp: number;

  /** Step quality score (0-1) */
  quality?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Pattern (learned experience)
 */
export interface Pattern {
  /** Unique identifier */
  id: string;

  /** Task description */
  task: string;

  /** Task input */
  input: unknown;

  /** Task output */
  output: unknown;

  /** Quality score (0-1) */
  reward: number;

  /** Success status */
  success: boolean;

  /** Critique/feedback */
  critique: string;

  /** Creation timestamp */
  timestamp: number;

  /** Tokens used */
  tokensUsed: number;

  /** Latency in ms */
  latencyMs: number;

  /** Embedding vector (384-dim) */
  embedding?: Float32Array;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Distilled pattern (consolidated learning)
 */
export interface DistilledPattern {
  /** Original representative pattern */
  originalPattern: Pattern;

  /** Key learnings extracted */
  keyLearnings: string[];

  /** When to apply this pattern */
  applicability: string[];

  /** What to avoid (from failures) */
  antiPatterns: string[];

  /** Weighted average reward */
  consolidatedReward: number;

  /** Number of patterns consolidated */
  consolidationCount: number;

  /** EWC protection status */
  ewcProtected?: boolean;
}

/**
 * Verdict (quality judgment)
 */
export interface Verdict {
  /** Overall success */
  success: boolean;

  /** Quality score (0-1) */
  reward: number;

  /** Human-readable critique */
  critique: string;

  /** Suggested improvements */
  improvements: string[];

  /** Judgment confidence (0-1) */
  confidence: number;

  /** Detailed metrics */
  metrics?: {
    /** Efficiency score */
    efficiency: number;

    /** Quality score */
    quality: number;

    /** Novelty score */
    novelty: number;
  };
}

/**
 * EWC weights (forgetting prevention)
 */
export interface EWCWeights {
  /** Pattern identifier */
  patternId: string;

  /** Fisher information (importance weights) */
  fisherInformation: Float32Array;

  /** Frozen weights (protected values) */
  frozenWeights: Float32Array;

  /** Overall importance score */
  importance: number;

  /** Last update timestamp */
  lastUpdated: number;
}
```

### Configuration Types

```typescript
// src/types/config.ts

/**
 * Learning configuration
 */
export interface LearningConfig {
  /** Top-k patterns to retrieve (default: 5) */
  retrievalK: number;

  /** Minimum reward threshold (default: 0.7) */
  minReward: number;

  /** EWC importance weight (default: 0.5) */
  ewcLambda: number;

  /** Distillation training epochs (default: 10) */
  distillationEpochs: number;

  /** Learning rate (default: 0.001) */
  learningRate: number;

  /** Enable HNSW indexing (default: true) */
  enableHNSW?: boolean;

  /** Enable GNN context (default: false) */
  enableGNN?: boolean;

  /** Max protected patterns (default: 100) */
  maxProtectedPatterns?: number;

  /** Pattern cache size (default: 1000) */
  cacheSize?: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Top-k results (default: 10) */
  k?: number;

  /** Minimum reward threshold */
  minReward?: number;

  /** Only return successful patterns */
  onlySuccesses?: boolean;

  /** Time range filter */
  timeRange?: {
    start: number;
    end: number;
  };

  /** Tag filters */
  tags?: string[];

  /** Metadata filters */
  metadata?: Record<string, unknown>;

  /** Use HNSW indexing */
  useHNSW?: boolean;

  /** Diversity weight for MMR (0-1) */
  diversityLambda?: number;
}

/**
 * Distillation options
 */
export interface DistillOptions {
  /** Similarity threshold for clustering (default: 0.85) */
  similarityThreshold?: number;

  /** Min patterns for distillation (default: 3) */
  minPatternsForDistillation?: number;

  /** Max key learnings to extract (default: 5) */
  maxKeyLearnings?: number;

  /** Preserve original patterns (default: false) */
  preserveOriginals?: boolean;
}

/**
 * EWC options
 */
export interface EWCOptions {
  /** Importance weight lambda (default: 0.5) */
  lambda?: number;

  /** Min importance for protection (default: 0.7) */
  minImportance?: number;

  /** Max protected patterns (default: 100) */
  maxProtectedPatterns?: number;
}

/**
 * Judgment options
 */
export interface JudgmentOptions {
  /** Minimum success rate (default: 0.7) */
  minSuccessRate?: number;

  /** Efficiency weight (default: 0.4) */
  efficiencyWeight?: number;

  /** Quality weight (default: 0.4) */
  qualityWeight?: number;

  /** Novelty weight (default: 0.2) */
  noveltyWeight?: number;

  /** Max latency threshold in ms */
  maxLatencyMs?: number;

  /** Custom evaluator function */
  customEvaluator?: CustomEvaluator;
}
```

### Result Types

```typescript
// src/types/results.ts

/**
 * Learning statistics
 */
export interface LearningStats {
  /** Total patterns stored */
  totalPatterns: number;

  /** Success rate (successful / total) */
  successRate: number;

  /** Average reward score */
  avgReward: number;

  /** Average tokens used */
  avgTokensUsed: number;

  /** Average latency in ms */
  avgLatencyMs: number;

  /** Top patterns by reward */
  topPatterns: Pattern[];

  /** Common critique themes */
  commonCritiques: string[];

  /** Success/failure distribution */
  successDistribution: {
    successful: number;
    failed: number;
  };

  /** Number of EWC-protected patterns */
  protectedPatterns: number;
}

/**
 * Consolidation result
 */
export interface ConsolidationResult {
  /** Whether pattern was protected */
  protected: boolean;

  /** Importance score */
  importance: number;

  /** Number of patterns merged */
  mergedCount: number;

  /** Patterns pruned (if at capacity) */
  prunedPatterns?: string[];
}

/**
 * Cluster group
 */
export interface ClusterGroup {
  /** Cluster identifier */
  id: number;

  /** Centroid embedding */
  centroid: Float32Array;

  /** Patterns in cluster */
  patterns: Pattern[];

  /** Average reward in cluster */
  avgReward: number;
}

/**
 * Importance statistics
 */
export interface ImportanceStats {
  /** Mean importance */
  mean: number;

  /** Median importance */
  median: number;

  /** Min importance */
  min: number;

  /** Max importance */
  max: number;

  /** Standard deviation */
  stdDev: number;

  /** Importance distribution percentiles */
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Operation type */
  operation: string;

  /** Execution time in ms */
  executionTimeMs: number;

  /** Patterns processed */
  patternsProcessed: number;

  /** Speedup factor (vs baseline) */
  speedupFactor?: number;
}
```

---

## Configuration

### Default Configuration

```typescript
// src/config/defaults.ts

export const DEFAULT_CONFIG: LearningConfig = {
  retrievalK: 5,
  minReward: 0.7,
  ewcLambda: 0.5,
  distillationEpochs: 10,
  learningRate: 0.001,
  enableHNSW: true,
  enableGNN: false,
  maxProtectedPatterns: 100,
  cacheSize: 1000
};
```

---

## Error Handling

### Error Types

```typescript
// src/errors/learning-errors.ts

/**
 * Base learning error
 */
export class LearningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningError';
  }
}

/**
 * Trajectory not found error
 */
export class TrajectoryNotFoundError extends LearningError {
  constructor(trajectoryId: string) {
    super(`Trajectory not found: ${trajectoryId}`);
    this.name = 'TrajectoryNotFoundError';
  }
}

/**
 * Incomplete trajectory error
 */
export class IncompleteTrajectoryError extends LearningError {
  constructor(trajectoryId: string) {
    super(`Trajectory not completed: ${trajectoryId}`);
    this.name = 'IncompleteTrajectoryError';
  }
}

/**
 * Invalid pattern error
 */
export class InvalidPatternError extends LearningError {
  constructor(reason: string) {
    super(`Invalid pattern: ${reason}`);
    this.name = 'InvalidPatternError';
  }
}

/**
 * EWC capacity exceeded error
 */
export class EWCCapacityError extends LearningError {
  constructor() {
    super('EWC capacity exceeded and no patterns can be pruned');
    this.name = 'EWCCapacityError';
  }
}
```

---

## Usage Examples

### Example 1: Complete Learning Cycle

```typescript
import { ReasoningBank } from '@vipasane/agentscope-learning';
import { VectorDatabase } from '@vipasane/agentscope-memory';

// Initialize
const vectorDB = new VectorDatabase({
  backend: 'hybrid',
  hnsw: { enabled: true, m: 16, efConstruction: 200 },
  quantization: { enabled: true, bits: 8 }
});

const learning = new ReasoningBank(vectorDB, {
  retrievalK: 5,
  minReward: 0.7,
  ewcLambda: 0.5,
  distillationEpochs: 10,
  learningRate: 0.001
});

// Step 1: RETRIEVE similar patterns
const similar = await learning.retrieve('implement JWT authentication', 5);

console.log(`Found ${similar.length} similar patterns:`);
similar.forEach(p => {
  console.log(`- ${p.task}: reward ${p.reward.toFixed(2)}`);
  console.log(`  ${p.critique}`);
});

// Step 2: Track execution
const trajectoryId = await learning.startTrajectory(
  'session-123',
  'Implement JWT authentication',
  { library: 'jsonwebtoken', algorithm: 'RS256' }
);

// Record steps
await learning.addTrajectoryStep(trajectoryId, {
  action: 'Install jsonwebtoken library',
  observation: 'Library installed successfully',
  thought: 'Using industry-standard JWT library',
  timestamp: Date.now(),
  quality: 0.9
});

await learning.addTrajectoryStep(trajectoryId, {
  action: 'Create JWT signing function',
  observation: 'Function created with RS256 algorithm',
  thought: 'Using asymmetric encryption for better security',
  timestamp: Date.now(),
  quality: 0.95
});

await learning.addTrajectoryStep(trajectoryId, {
  action: 'Write unit tests',
  observation: '15 tests passing',
  thought: 'Comprehensive test coverage for edge cases',
  timestamp: Date.now(),
  quality: 1.0
});

// Complete trajectory
await learning.endTrajectory(trajectoryId, {
  authenticated: true,
  tokenGenerated: true,
  testsPassed: 15,
  coverage: 0.98
}, true);

// Step 3: JUDGE
const verdict = await learning.judge(
  trajectoryId,
  true,
  0.95,
  'Excellent implementation with comprehensive testing and secure practices'
);

console.log('\nVerdict:');
console.log(`Success: ${verdict.success}`);
console.log(`Reward: ${verdict.reward.toFixed(2)}`);
console.log(`Confidence: ${verdict.confidence?.toFixed(2)}`);
console.log('Improvements:');
verdict.improvements.forEach(i => console.log(`- ${i}`));

// Step 4: DISTILL
const distilled = await learning.distill(trajectoryId);

console.log('\nKey learnings:');
distilled.keyLearnings.forEach(l => console.log(`- ${l}`));

console.log('\nApplicable when:');
distilled.applicability.forEach(a => console.log(`- ${a}`));

console.log(`\nConsolidated ${distilled.consolidationCount} patterns`);

// Step 5: CONSOLIDATE
await learning.consolidate(distilled);
console.log('Pattern protected from catastrophic forgetting');
```

### Example 2: Advanced Search

```typescript
// Search with advanced filtering
const patterns = await learning.searchPatterns('authentication security', {
  k: 10,
  minReward: 0.85,
  onlySuccesses: true,
  timeRange: {
    start: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    end: Date.now()
  },
  tags: ['security', 'auth', 'jwt'],
  metadata: {
    testCoverage: { $gte: 0.9 }
  },
  diversityLambda: 0.3 // Balance relevance (70%) and diversity (30%)
});

console.log(`Found ${patterns.length} high-quality auth patterns`);
patterns.forEach((p, i) => {
  console.log(`${i+1}. ${p.task}`);
  console.log(`   Reward: ${p.reward.toFixed(2)}`);
  console.log(`   ${p.critique}`);
});
```

### Example 3: Statistics and Monitoring

```typescript
// Get comprehensive statistics
const stats = await learning.getStats();

console.log('Learning Statistics:');
console.log(`Total patterns: ${stats.totalPatterns}`);
console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
console.log(`Average reward: ${stats.avgReward.toFixed(2)}`);
console.log(`Average latency: ${stats.avgLatencyMs.toFixed(0)}ms`);
console.log(`Protected patterns: ${stats.protectedPatterns}`);

console.log('\nTop 5 patterns:');
stats.topPatterns.slice(0, 5).forEach((p, i) => {
  console.log(`${i+1}. ${p.task} (${p.reward.toFixed(2)})`);
});

console.log('\nCommon themes:');
stats.commonCritiques.forEach(c => console.log(`- ${c}`));

console.log('\nDistribution:');
console.log(`Successful: ${stats.successDistribution.successful}`);
console.log(`Failed: ${stats.successDistribution.failed}`);
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.2.0 | 2026-01-30 | Complete API design |
| 1.1.0 | 2026-01-27 | Initial implementation |
| 1.0.0 | 2026-01-25 | Package created |
