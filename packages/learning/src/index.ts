/**
 * @vipasane/agentscope-learning
 *
 * Zero-dependency ReasoningBank learning system with trajectory tracking,
 * verdict judgment, pattern distillation, and EWC++ consolidation.
 *
 * @packageDocumentation
 * @module @vipasane/agentscope-learning
 * @version 1.2.0
 */

// Core components
export { TrajectoryTracker } from './core/TrajectoryTracker.js';
export { VerdictJudge } from './core/VerdictJudge.js';
export { PatternDistiller } from './core/PatternDistiller.js';
export { EWCConsolidator } from './core/EWCConsolidator.js';
export { LearningCoordinator } from './core/LearningCoordinator.js';

// Configuration types
export type { JudgmentConfig } from './core/VerdictJudge.js';
export type { DistillationConfig } from './core/PatternDistiller.js';
export type { EWCConfig } from './core/EWCConsolidator.js';
export type { CoordinatorConfig } from './core/LearningCoordinator.js';

// Core types
export type {
  LearningConfig,
  Pattern,
  Verdict,
  DistilledPattern,
  Trajectory,
  TrajectoryStep,
  SearchOptions,
  LearningStats,
  EWCWeights,
  ConsolidationResult,
  PerformanceMetrics,
} from './types/index.js';

// Utilities
export {
  createEmbedding,
  normalizeEmbedding,
  validateEmbedding,
  createPatternEmbedding,
  batchCreateEmbeddings,
  EMBEDDING_DIMENSION,
} from './utils/embeddings.js';

export {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  findTopKSimilar,
  pairwiseDistances,
  areSimilar,
} from './utils/similarity.js';

export {
  validateTrajectory,
  validatePattern,
  validateVerdict,
  validateDistilledPattern,
  validateReward,
  validateConfig,
  validateTrajectoryStep,
} from './utils/validation.js';

// Configuration
export {
  DEFAULT_CONFIG,
  HIGH_PERFORMANCE_CONFIG,
  FAST_CONFIG,
  MEMORY_EFFICIENT_CONFIG,
  DEV_CONFIG,
} from './config/defaults.js';

// Errors
export {
  LearningError,
  TrajectoryNotFoundError,
  IncompleteTrajectoryError,
  InvalidPatternError,
  EWCCapacityError,
  EmbeddingError,
  DistillationError,
  ConsolidationError,
  ConfigurationError,
} from './errors/learning-errors.js';

// Version
export const VERSION = '1.2.0';
