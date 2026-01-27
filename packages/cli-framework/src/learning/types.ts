/**
 * @packageDocumentation
 * Type definitions for CLI Framework Learning Integration
 *
 * @remarks
 * Defines types for command pattern tracking, suggestions, and learning configuration
 * following review decisions from CLI-FRAMEWORK-PHASE-3.5-REVIEW.md
 */

/**
 * Context information for command execution
 */
export interface CommandContext {
  command: string;
  args: string[];
  options: Record<string, unknown>;
  executionTime: number;
  userId?: string;
  environment?: string;
}

/**
 * Command pattern record for learning
 *
 * @remarks
 * Stores successful and failed command executions for pattern matching
 */
export interface CommandPattern {
  id: string;
  command: string;
  args: string[];
  context: CommandContext;
  outcome: 'success' | 'failure';
  errorPattern?: string;
  metadata: {
    timestamp: number;
    executionTime: number;
    userId?: string;
  };
  embedding?: number[];
}

/**
 * Command suggestion with confidence score
 *
 * @remarks
 * Based on learned patterns with similarity matching (threshold 0.75 from Q33)
 */
export interface CommandSuggestion {
  command: string;
  args: string[];
  confidence: number; // 0.0 to 1.0
  reason: string;
  usageCount: number;
}

/**
 * Error pattern for recovery suggestions
 *
 * @remarks
 * Stores error messages with suggested fixes (threshold 0.8 from Q34)
 */
export interface ErrorPattern {
  errorMessage: string;
  errorType: string;
  suggestedFix?: string;
  occurrences: number;
  lastSeen: number;
}

/**
 * Learning configuration
 *
 * @remarks
 * Configuration follows review decisions:
 * - Q28: Learning disabled by default (opt-in)
 * - Q32: HNSW with M=16, efConstruction=200
 * - Q33: Threshold 0.75 for suggestions
 */
export interface LearningConfig {
  enabled: boolean;
  embeddingDimensions: number; // 384 default
  hnswConfig: {
    M: number; // 16 from review
    efConstruction: number; // 200 from review
    efSearch: number; // 100 default
  };
  patternStorage: {
    maxPatterns: number; // 10000 default
    persistToDisk: boolean;
    storagePath?: string;
  };
  suggestions: {
    enabled: boolean;
    threshold: number; // 0.75 from review Q33
    maxSuggestions: number; // 5 default
  };
  errorRecovery: {
    enabled: boolean;
    threshold: number; // 0.8 for error matching from Q34
  };
}

/**
 * Default learning configuration
 *
 * @remarks
 * Off by default per review Q28
 */
export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  enabled: false, // Off by default (Q28)
  embeddingDimensions: 384,
  hnswConfig: { M: 16, efConstruction: 200, efSearch: 100 },
  patternStorage: { maxPatterns: 10000, persistToDisk: true },
  suggestions: { enabled: true, threshold: 0.75, maxSuggestions: 5 },
  errorRecovery: { enabled: true, threshold: 0.8 },
};

/**
 * Pattern statistics for monitoring
 */
export interface PatternStatistics {
  totalPatterns: number;
  successRate: number;
  topCommands: Array<{ command: string; count: number }>;
  commonErrors: Array<{ error: string; count: number }>;
}
