/**
 * Validation utilities for learning system inputs
 *
 * Provides runtime validation for trajectories, patterns, verdicts, and
 * configuration values with descriptive error messages.
 *
 * @module utils/validation
 */

import type {
  Trajectory,
  Pattern,
  Verdict,
  DistilledPattern,
  LearningConfig,
} from '../types/index.js';
import {
  InvalidPatternError,
  IncompleteTrajectoryError,
  ConfigurationError,
} from '../errors/learning-errors.js';
import { EMBEDDING_DIMENSION, validateEmbedding } from './embeddings.js';

/**
 * Validate a trajectory object
 *
 * Checks for required fields and valid values.
 *
 * @param trajectory - Trajectory to validate
 * @param requireComplete - If true, check that trajectory has ended
 * @throws {IncompleteTrajectoryError} If requireComplete=true and trajectory not ended
 * @throws {Error} If trajectory is invalid
 *
 * @example
 * ```typescript
 * validateTrajectory(trajectory); // Basic validation
 * validateTrajectory(trajectory, true); // Must be complete
 * ```
 */
export function validateTrajectory(
  trajectory: Trajectory,
  requireComplete = false
): void {
  if (!trajectory.id || typeof trajectory.id !== 'string') {
    throw new Error('Trajectory must have valid string id');
  }

  if (!trajectory.sessionId || typeof trajectory.sessionId !== 'string') {
    throw new Error('Trajectory must have valid string sessionId');
  }

  if (!trajectory.task || typeof trajectory.task !== 'string') {
    throw new Error('Trajectory must have valid string task');
  }

  if (!Array.isArray(trajectory.steps)) {
    throw new Error('Trajectory must have steps array');
  }

  if (typeof trajectory.startTime !== 'number' || trajectory.startTime <= 0) {
    throw new Error('Trajectory must have valid startTime');
  }

  if (requireComplete) {
    if (!trajectory.endTime) {
      throw new IncompleteTrajectoryError(trajectory.id, 'validate');
    }

    if (typeof trajectory.success !== 'boolean') {
      throw new Error('Complete trajectory must have boolean success field');
    }

    if (trajectory.endTime <= trajectory.startTime) {
      throw new Error('Trajectory endTime must be after startTime');
    }
  }
}

/**
 * Validate a pattern object
 *
 * Checks for required fields, valid reward range, and optional embedding.
 *
 * @param pattern - Pattern to validate
 * @throws {InvalidPatternError} If pattern is invalid
 *
 * @example
 * ```typescript
 * validatePattern(pattern); // Throws if invalid
 * ```
 */
export function validatePattern(pattern: Pattern): void {
  if (!pattern.id || typeof pattern.id !== 'string') {
    throw new InvalidPatternError(pattern.id || 'unknown', 'id must be valid string');
  }

  if (!pattern.task || typeof pattern.task !== 'string') {
    throw new InvalidPatternError(pattern.id, 'task must be valid string');
  }

  if (!validateReward(pattern.reward)) {
    throw new InvalidPatternError(
      pattern.id,
      `reward must be between 0 and 1, got ${pattern.reward}`
    );
  }

  if (typeof pattern.success !== 'boolean') {
    throw new InvalidPatternError(pattern.id, 'success must be boolean');
  }

  if (!pattern.critique || typeof pattern.critique !== 'string') {
    throw new InvalidPatternError(pattern.id, 'critique must be valid string');
  }

  if (typeof pattern.timestamp !== 'number' || pattern.timestamp <= 0) {
    throw new InvalidPatternError(pattern.id, 'timestamp must be valid positive number');
  }

  if (typeof pattern.tokensUsed !== 'number' || pattern.tokensUsed < 0) {
    throw new InvalidPatternError(pattern.id, 'tokensUsed must be non-negative number');
  }

  if (typeof pattern.latencyMs !== 'number' || pattern.latencyMs < 0) {
    throw new InvalidPatternError(pattern.id, 'latencyMs must be non-negative number');
  }

  // Validate embedding if present
  if (pattern.embedding) {
    if (!validateEmbedding(pattern.embedding, true)) {
      throw new InvalidPatternError(
        pattern.id,
        `embedding must be normalized ${EMBEDDING_DIMENSION}-dimensional Float32Array`
      );
    }
  }
}

/**
 * Validate a verdict object
 *
 * @param verdict - Verdict to validate
 * @throws {Error} If verdict is invalid
 *
 * @example
 * ```typescript
 * validateVerdict(verdict);
 * ```
 */
export function validateVerdict(verdict: Verdict): void {
  if (typeof verdict.success !== 'boolean') {
    throw new Error('Verdict must have boolean success field');
  }

  if (!validateReward(verdict.reward)) {
    throw new Error(`Verdict reward must be between 0 and 1, got ${verdict.reward}`);
  }

  if (!verdict.critique || typeof verdict.critique !== 'string') {
    throw new Error('Verdict must have valid string critique');
  }

  if (!Array.isArray(verdict.improvements)) {
    throw new Error('Verdict must have improvements array');
  }

  if (verdict.confidence !== undefined && !validateReward(verdict.confidence)) {
    throw new Error(`Verdict confidence must be between 0 and 1, got ${verdict.confidence}`);
  }
}

/**
 * Validate a distilled pattern object
 *
 * @param distilled - Distilled pattern to validate
 * @throws {Error} If distilled pattern is invalid
 *
 * @example
 * ```typescript
 * validateDistilledPattern(distilled);
 * ```
 */
export function validateDistilledPattern(distilled: DistilledPattern): void {
  // Validate the base pattern
  validatePattern(distilled.originalPattern);

  if (!Array.isArray(distilled.keyLearnings)) {
    throw new Error('DistilledPattern must have keyLearnings array');
  }

  if (!Array.isArray(distilled.applicability)) {
    throw new Error('DistilledPattern must have applicability array');
  }

  if (!Array.isArray(distilled.antiPatterns)) {
    throw new Error('DistilledPattern must have antiPatterns array');
  }

  if (!validateReward(distilled.consolidatedReward)) {
    throw new Error(
      `DistilledPattern consolidatedReward must be between 0 and 1, got ${distilled.consolidatedReward}`
    );
  }

  if (
    typeof distilled.consolidationCount !== 'number' ||
    distilled.consolidationCount < 1
  ) {
    throw new Error('DistilledPattern consolidationCount must be positive number');
  }
}

/**
 * Validate a reward value
 *
 * Rewards must be in range [0, 1].
 *
 * @param reward - Reward value to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * console.log(validateReward(0.95)); // true
 * console.log(validateReward(1.5));  // false
 * console.log(validateReward(-0.1)); // false
 * ```
 */
export function validateReward(reward: number): boolean {
  return (
    typeof reward === 'number' &&
    Number.isFinite(reward) &&
    reward >= 0 &&
    reward <= 1
  );
}

/**
 * Validate learning configuration
 *
 * @param config - Configuration to validate
 * @throws {ConfigurationError} If configuration is invalid
 *
 * @example
 * ```typescript
 * validateConfig({
 *   retrievalK: 5,
 *   minReward: 0.7,
 *   ewcLambda: 0.5,
 *   distillationEpochs: 10,
 *   learningRate: 0.001,
 * });
 * ```
 */
export function validateConfig(config: LearningConfig): void {
  if (typeof config.retrievalK !== 'number' || config.retrievalK < 1) {
    throw new ConfigurationError('retrievalK must be positive number');
  }

  if (!validateReward(config.minReward)) {
    throw new ConfigurationError('minReward must be between 0 and 1');
  }

  if (!validateReward(config.ewcLambda)) {
    throw new ConfigurationError('ewcLambda must be between 0 and 1');
  }

  if (typeof config.distillationEpochs !== 'number' || config.distillationEpochs < 1) {
    throw new ConfigurationError('distillationEpochs must be positive number');
  }

  if (
    typeof config.learningRate !== 'number' ||
    config.learningRate <= 0 ||
    config.learningRate > 1
  ) {
    throw new ConfigurationError('learningRate must be between 0 and 1');
  }
}

/**
 * Validate trajectory step
 *
 * @param step - Step to validate
 * @param stepIndex - Step index for error messages
 * @throws {Error} If step is invalid
 */
export function validateTrajectoryStep(
  step: { action: string; observation: string; thought: string; timestamp: number },
  stepIndex: number
): void {
  if (!step.action || typeof step.action !== 'string') {
    throw new Error(`Step ${stepIndex} must have valid string action`);
  }

  if (!step.observation || typeof step.observation !== 'string') {
    throw new Error(`Step ${stepIndex} must have valid string observation`);
  }

  if (!step.thought || typeof step.thought !== 'string') {
    throw new Error(`Step ${stepIndex} must have valid string thought`);
  }

  if (typeof step.timestamp !== 'number' || step.timestamp <= 0) {
    throw new Error(`Step ${stepIndex} must have valid positive timestamp`);
  }
}
