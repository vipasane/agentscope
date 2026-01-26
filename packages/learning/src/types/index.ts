/**
 * Core types for ReasoningBank learning system
 */

/**
 * Configuration for the learning system
 */
export interface LearningConfig {
  /** Number of top-k patterns to retrieve in similarity search */
  retrievalK: number;
  /** Minimum reward threshold for pattern acceptance (0-1) */
  minReward: number;
  /** EWC importance weight for preventing catastrophic forgetting (0-1) */
  ewcLambda: number;
  /** Number of epochs for pattern distillation training */
  distillationEpochs: number;
  /** Learning rate for optimization algorithms */
  learningRate: number;
  /** Enable HNSW indexing for faster retrieval */
  enableHNSW?: boolean;
  /** Enable GNN-enhanced search for graph contexts */
  enableGNN?: boolean;
}

/**
 * A learned pattern from past experiences
 */
export interface Pattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Task description that generated this pattern */
  task: string;
  /** Input data that triggered the task */
  input: unknown;
  /** Output/result from executing the task */
  output: unknown;
  /** Reward score (0-1) indicating success quality */
  reward: number;
  /** Whether the execution was successful */
  success: boolean;
  /** Human-readable critique explaining what happened */
  critique: string;
  /** Unix timestamp when pattern was created */
  timestamp: number;
  /** Number of tokens used during execution */
  tokensUsed: number;
  /** Execution latency in milliseconds */
  latencyMs: number;
  /** Optional embedding vector for similarity search */
  embedding?: Float32Array;
  /** Optional metadata for filtering */
  metadata?: Record<string, unknown>;
}

/**
 * Judgment verdict for a trajectory
 */
export interface Verdict {
  /** Whether the trajectory was successful */
  success: boolean;
  /** Reward score (0-1) */
  reward: number;
  /** Critique explaining the verdict */
  critique: string;
  /** Actionable suggestions for improvement */
  improvements: string[];
  /** Confidence in the verdict (0-1) */
  confidence?: number;
}

/**
 * Distilled pattern with extracted learnings
 */
export interface DistilledPattern {
  /** The original pattern that was distilled */
  originalPattern: Pattern;
  /** Key learnings extracted from the pattern */
  keyLearnings: string[];
  /** Conditions when this pattern is applicable */
  applicability: string[];
  /** Anti-patterns to avoid */
  antiPatterns: string[];
  /** Consolidated reward score */
  consolidatedReward: number;
  /** Number of patterns consolidated into this one */
  consolidationCount: number;
}

/**
 * A single step in an execution trajectory
 */
export interface TrajectoryStep {
  /** Action taken at this step */
  action: string;
  /** Observation/result from the action */
  observation: string;
  /** Agent's reasoning/thought process */
  thought: string;
  /** Unix timestamp for this step */
  timestamp: number;
  /** Optional metadata for the step */
  metadata?: Record<string, unknown>;
}

/**
 * Complete execution trajectory
 */
export interface Trajectory {
  /** Unique trajectory identifier */
  id: string;
  /** Session identifier */
  sessionId: string;
  /** Task description */
  task: string;
  /** Initial input */
  input: unknown;
  /** Sequence of execution steps */
  steps: TrajectoryStep[];
  /** Final output (set when trajectory ends) */
  output?: unknown;
  /** Whether trajectory completed successfully */
  success?: boolean;
  /** Start timestamp */
  startTime: number;
  /** End timestamp (set when trajectory ends) */
  endTime?: number;
  /** Total tokens used */
  totalTokens?: number;
  /** Total latency in milliseconds */
  totalLatencyMs?: number;
}

/**
 * Options for searching patterns
 */
export interface SearchOptions {
  /** Number of results to return */
  k?: number;
  /** Minimum reward threshold */
  minReward?: number;
  /** Only return successful patterns */
  onlySuccesses?: boolean;
  /** Only return failed patterns */
  onlyFailures?: boolean;
  /** Filter by time range */
  timeRange?: {
    start: number;
    end: number;
  };
  /** Filter by metadata */
  metadata?: Record<string, unknown>;
  /** Use HNSW indexing (faster) */
  useHNSW?: boolean;
  /** Enable EWC protection for important patterns */
  ewcProtected?: boolean;
}

/**
 * Statistics about the learning system
 */
export interface LearningStats {
  /** Total number of patterns stored */
  totalPatterns: number;
  /** Success rate across all patterns (0-1) */
  successRate: number;
  /** Average reward score (0-1) */
  avgReward: number;
  /** Average tokens used per pattern */
  avgTokensUsed: number;
  /** Average latency per pattern (ms) */
  avgLatencyMs: number;
  /** Top performing patterns */
  topPatterns: Pattern[];
  /** Most common critiques */
  commonCritiques: string[];
  /** Patterns by success status */
  successDistribution: {
    successful: number;
    failed: number;
  };
  /** Performance over time */
  timeSeriesData?: {
    timestamp: number;
    successRate: number;
    avgReward: number;
  }[];
}

/**
 * EWC (Elastic Weight Consolidation) weights for preventing forgetting
 */
export interface EWCWeights {
  /** Pattern ID this weight applies to */
  patternId: string;
  /** Importance weights (higher = more important to retain) */
  weights: Float32Array;
  /** Lambda parameter for EWC loss */
  lambda: number;
  /** Timestamp when weights were computed */
  timestamp: number;
}

/**
 * Result from pattern consolidation
 */
export interface ConsolidationResult {
  /** Consolidated pattern */
  pattern: DistilledPattern;
  /** Number of patterns merged */
  mergedCount: number;
  /** IDs of patterns that were merged */
  mergedPatternIds: string[];
  /** Improvement in storage efficiency (0-1) */
  storageReduction: number;
  /** Time taken for consolidation (ms) */
  consolidationTimeMs: number;
}

/**
 * Performance metrics for learning operations
 */
export interface PerformanceMetrics {
  /** Operation name */
  operation: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Memory usage in bytes */
  memoryUsageBytes?: number;
  /** Number of patterns processed */
  patternsProcessed?: number;
  /** Cache hit rate (0-1) */
  cacheHitRate?: number;
  /** Speedup factor compared to baseline */
  speedupFactor?: number;
}
