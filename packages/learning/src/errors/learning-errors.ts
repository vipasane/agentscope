/**
 * Custom error classes for the Learning package
 *
 * Provides descriptive, actionable errors for learning operations with
 * proper error names, messages, and context.
 *
 * @module errors/learning-errors
 */

/**
 * Base error class for all learning-related errors
 *
 * All custom learning errors extend this base class for consistent error
 * handling and type checking.
 *
 * @example
 * ```typescript
 * if (error instanceof LearningError) {
 *   console.error('Learning operation failed:', error.message);
 * }
 * ```
 */
export class LearningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningError';
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when a requested trajectory is not found
 *
 * @example
 * ```typescript
 * const trajectory = tracker.getTrajectory('invalid-id');
 * if (!trajectory) {
 *   throw new TrajectoryNotFoundError('invalid-id');
 * }
 * ```
 */
export class TrajectoryNotFoundError extends LearningError {
  constructor(trajectoryId: string) {
    super(
      `Trajectory not found: ${trajectoryId}. ` +
        `Ensure the trajectory was started with startTrajectory() and the ID is correct.`
    );
    this.name = 'TrajectoryNotFoundError';
  }
}

/**
 * Thrown when attempting to judge or distill an incomplete trajectory
 *
 * Trajectories must be ended with endTrajectory() before they can be
 * judged or distilled.
 *
 * @example
 * ```typescript
 * const trajectory = tracker.getTrajectory(id);
 * if (!trajectory.endTime) {
 *   throw new IncompleteTrajectoryError(id, 'distill');
 * }
 * ```
 */
export class IncompleteTrajectoryError extends LearningError {
  constructor(trajectoryId: string, operation: string) {
    super(
      `Cannot ${operation} incomplete trajectory: ${trajectoryId}. ` +
        `Call endTrajectory() before attempting to ${operation}.`
    );
    this.name = 'IncompleteTrajectoryError';
  }
}

/**
 * Thrown when a pattern fails validation
 *
 * Patterns must have valid embeddings, rewards, and required fields.
 *
 * @example
 * ```typescript
 * if (!pattern.embedding || pattern.embedding.length !== 384) {
 *   throw new InvalidPatternError(
 *     pattern.id,
 *     'embedding must be 384-dimensional Float32Array'
 *   );
 * }
 * ```
 */
export class InvalidPatternError extends LearningError {
  constructor(patternId: string, reason: string) {
    super(`Invalid pattern ${patternId}: ${reason}. Please check the pattern structure and retry.`);
    this.name = 'InvalidPatternError';
  }
}

/**
 * Thrown when EWC consolidation reaches capacity limits
 *
 * EWC maintains protected patterns in memory. When capacity is reached,
 * low-importance patterns are pruned automatically.
 *
 * @example
 * ```typescript
 * if (protectedPatterns.size >= maxCapacity && !canPrune) {
 *   throw new EWCCapacityError(maxCapacity, protectedPatterns.size);
 * }
 * ```
 */
export class EWCCapacityError extends LearningError {
  constructor(maxCapacity: number, currentSize: number) {
    super(
      `EWC capacity limit reached: ${currentSize}/${maxCapacity} patterns protected. ` +
        `Increase maxProtectedPatterns in EWCConfig or patterns will be auto-pruned.`
    );
    this.name = 'EWCCapacityError';
  }
}

/**
 * Thrown when an embedding operation fails
 *
 * @example
 * ```typescript
 * if (!text || text.length === 0) {
 *   throw new EmbeddingError('Cannot generate embedding from empty text');
 * }
 * ```
 */
export class EmbeddingError extends LearningError {
  constructor(reason: string) {
    super(`Embedding generation failed: ${reason}`);
    this.name = 'EmbeddingError';
  }
}

/**
 * Thrown when distillation fails to converge
 *
 * @example
 * ```typescript
 * if (epochs > maxEpochs && loss > threshold) {
 *   throw new DistillationError('Failed to converge after maximum epochs');
 * }
 * ```
 */
export class DistillationError extends LearningError {
  constructor(reason: string) {
    super(`Pattern distillation failed: ${reason}`);
    this.name = 'DistillationError';
  }
}

/**
 * Thrown when consolidation encounters an error
 *
 * @example
 * ```typescript
 * if (similarPatterns.length === 0) {
 *   throw new ConsolidationError('No similar patterns found for consolidation');
 * }
 * ```
 */
export class ConsolidationError extends LearningError {
  constructor(reason: string) {
    super(`Pattern consolidation failed: ${reason}`);
    this.name = 'ConsolidationError';
  }
}

/**
 * Thrown when configuration validation fails
 *
 * @example
 * ```typescript
 * if (config.minReward < 0 || config.minReward > 1) {
 *   throw new ConfigurationError('minReward must be between 0 and 1');
 * }
 * ```
 */
export class ConfigurationError extends LearningError {
  constructor(reason: string) {
    super(`Invalid configuration: ${reason}`);
    this.name = 'ConfigurationError';
  }
}
