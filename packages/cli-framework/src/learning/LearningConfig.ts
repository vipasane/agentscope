/**
 * @packageDocumentation
 * Learning configuration with defaults from review decisions
 *
 * @remarks
 * Configuration follows CLI-FRAMEWORK-PHASE-3.5-REVIEW.md decisions
 */

import { LearningConfig, DEFAULT_LEARNING_CONFIG } from './types';

/**
 * Create learning configuration with defaults
 *
 * @param overrides - Configuration overrides
 * @returns Learning configuration
 *
 * @remarks
 * Default values from review:
 * - Q28: Learning disabled by default (opt-in)
 * - Q32: HNSW M=16, efConstruction=200
 * - Q33: Suggestion threshold 0.75
 * - Q34: Error matching threshold 0.8
 */
export function createLearningConfig(
  overrides: Partial<LearningConfig> = {}
): LearningConfig {
  return {
    ...DEFAULT_LEARNING_CONFIG,
    ...overrides,
    hnswConfig: {
      ...DEFAULT_LEARNING_CONFIG.hnswConfig,
      ...overrides.hnswConfig,
    },
    patternStorage: {
      ...DEFAULT_LEARNING_CONFIG.patternStorage,
      ...overrides.patternStorage,
    },
    suggestions: {
      ...DEFAULT_LEARNING_CONFIG.suggestions,
      ...overrides.suggestions,
    },
    errorRecovery: {
      ...DEFAULT_LEARNING_CONFIG.errorRecovery,
      ...overrides.errorRecovery,
    },
  };
}

/**
 * Validate learning configuration
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 *
 * @remarks
 * Validates:
 * - HNSW parameters (M, efConstruction, efSearch)
 * - Thresholds (0.0 to 1.0)
 * - Pattern storage limits
 */
export function validateLearningConfig(config: LearningConfig): void {
  // Validate HNSW parameters
  if (config.hnswConfig.M < 2 || config.hnswConfig.M > 100) {
    throw new Error(
      `Invalid HNSW M parameter: ${config.hnswConfig.M} (must be 2-100)`
    );
  }

  if (
    config.hnswConfig.efConstruction < 10 ||
    config.hnswConfig.efConstruction > 1000
  ) {
    throw new Error(
      `Invalid HNSW efConstruction: ${config.hnswConfig.efConstruction} (must be 10-1000)`
    );
  }

  if (
    config.hnswConfig.efSearch < 1 ||
    config.hnswConfig.efSearch > 1000
  ) {
    throw new Error(
      `Invalid HNSW efSearch: ${config.hnswConfig.efSearch} (must be 1-1000)`
    );
  }

  // Validate thresholds
  if (
    config.suggestions.threshold < 0 ||
    config.suggestions.threshold > 1
  ) {
    throw new Error(
      `Invalid suggestion threshold: ${config.suggestions.threshold} (must be 0.0-1.0)`
    );
  }

  if (
    config.errorRecovery.threshold < 0 ||
    config.errorRecovery.threshold > 1
  ) {
    throw new Error(
      `Invalid error recovery threshold: ${config.errorRecovery.threshold} (must be 0.0-1.0)`
    );
  }

  // Validate pattern storage
  if (config.patternStorage.maxPatterns < 100) {
    throw new Error(
      `Invalid maxPatterns: ${config.patternStorage.maxPatterns} (must be >= 100)`
    );
  }

  if (config.suggestions.maxSuggestions < 1) {
    throw new Error(
      `Invalid maxSuggestions: ${config.suggestions.maxSuggestions} (must be >= 1)`
    );
  }

  if (config.embeddingDimensions < 32 || config.embeddingDimensions > 1024) {
    throw new Error(
      `Invalid embeddingDimensions: ${config.embeddingDimensions} (must be 32-1024)`
    );
  }
}

/**
 * Load learning configuration from environment
 *
 * @returns Learning configuration from environment variables
 *
 * @remarks
 * Environment variables:
 * - CLI_LEARNING_ENABLED - Enable learning (default: false)
 * - CLI_LEARNING_MAX_PATTERNS - Max patterns (default: 10000)
 * - CLI_LEARNING_SUGGESTION_THRESHOLD - Suggestion threshold (default: 0.75)
 */
export function loadConfigFromEnv(): Partial<LearningConfig> {
  const config: Partial<LearningConfig> = {};

  if (process.env.CLI_LEARNING_ENABLED) {
    config.enabled = process.env.CLI_LEARNING_ENABLED === 'true';
  }

  if (process.env.CLI_LEARNING_MAX_PATTERNS) {
    const maxPatterns = parseInt(process.env.CLI_LEARNING_MAX_PATTERNS, 10);
    if (!isNaN(maxPatterns)) {
      config.patternStorage = { ...DEFAULT_LEARNING_CONFIG.patternStorage, maxPatterns };
    }
  }

  if (process.env.CLI_LEARNING_SUGGESTION_THRESHOLD) {
    const threshold = parseFloat(process.env.CLI_LEARNING_SUGGESTION_THRESHOLD);
    if (!isNaN(threshold)) {
      config.suggestions = { ...DEFAULT_LEARNING_CONFIG.suggestions, threshold };
    }
  }

  return config;
}
