/**
 * Hook Integration Types for Generator Enhancement
 * Based on DESIGN-001: Security and Hooks Integration
 */

import type { AgentScopeConfig, ZoomLevel } from '../model/types.js';
import type { ThemePalette } from '../themes/index.js';
import type { AgentCategory } from '../generators/diagrams/categories.js';

// Re-export ComponentMapOptions to avoid circular dependency
export interface ComponentMapOptions {
  /** Include disabled servers */
  includeDisabled?: boolean;
  /** Show tool connections */
  showTools?: boolean;
  /** Custom title */
  title?: string;
  /** Zoom level: summary (categories only), category (grouped), detail (full) */
  level?: ZoomLevel;
  /** Compact mode - names only, no descriptions */
  compact?: boolean;
  /** Filter by categories */
  categories?: AgentCategory[];
  /** Filter by agent types */
  types?: string[];
  /** Filter by name pattern (glob-like) */
  pattern?: string;
  /** Maximum agents per category before collapsing */
  maxPerCategory?: number;
  /** Theme palette or theme name */
  theme?: ThemePalette | string;
  /** Path to custom theme file */
  themePath?: string;
}

// ============================================================================
// Pre-Generate Hook Types
// ============================================================================

export interface PreGenerateHookInput {
  /** Configuration being processed */
  config: AgentScopeConfig;
  /** Generation options */
  options: ComponentMapOptions;
  /** Unique request identifier */
  requestId: string;
  /** Execution context metadata */
  context: {
    /** Timestamp of generation request */
    timestamp: number;
    /** Component that initiated generation */
    caller: string;
    /** AgentScope version */
    version: string;
  };
}

export interface PreGenerateHookOutput {
  /** Whether input validation passed */
  validated: boolean;
  /** Security score (0-1, reject if < 0.5) */
  securityScore: number;
  /** Cached diagram if found */
  cachedResult?: string;
  /** AI-suggested zoom level based on patterns */
  suggestedLevel?: ZoomLevel;
  /** Sanitized and validated options */
  sanitizedOptions: ComponentMapOptions;
  /** Non-blocking warnings */
  warnings: string[];
}

// ============================================================================
// Post-Generate Hook Types
// ============================================================================

export interface PostGenerateHookInput {
  /** Request ID from pre-generate hook */
  requestId: string;
  /** Original input from pre-generate */
  input: PreGenerateHookInput;
  /** Generation output metrics */
  output: {
    /** Generated diagram content */
    diagram: string;
    /** Time taken to generate (ms) */
    generationTimeMs: number;
    /** Number of nodes in diagram */
    nodeCount: number;
    /** Number of edges in diagram */
    edgeCount: number;
  };
  /** Whether generation succeeded */
  success: boolean;
  /** Error if generation failed */
  error?: Error;
}

export interface PostGenerateHookOutput {
  /** Whether pattern was stored in memory */
  stored: boolean;
  /** Unique pattern ID if stored */
  patternId?: string;
  /** Quality score (0-1) based on metrics */
  qualityScore: number;
  /** Learning feedback for future generations */
  learningFeedback: {
    /** Whether result should be cached */
    shouldCache: boolean;
    /** Optimization suggestions */
    suggestedOptimizations: string[];
  };
}

// ============================================================================
// Quality Metrics Types
// ============================================================================

export interface QualityMetrics {
  /** Time taken to generate diagram (ms) */
  generationTimeMs: number;
  /** Total number of nodes */
  nodeCount: number;
  /** Total number of edges */
  edgeCount: number;
  /** Number of categories */
  categoryCount: number;
  /** Average label length */
  avgLabelLength: number;
}

// ============================================================================
// Hook Execution Context
// ============================================================================

export interface HookContext {
  /** Whether hooks are enabled */
  enabled: boolean;
  /** Whether to use neural learning features */
  useNeural: boolean;
  /** Whether to store patterns */
  storePatterns: boolean;
  /** Verbose logging */
  verbose: boolean;
}

// ============================================================================
// Security Validation Types
// ============================================================================

export interface SecurityValidation {
  /** Overall validation passed */
  passed: boolean;
  /** Security score (0-1) */
  score: number;
  /** Validation issues found */
  issues: SecurityIssue[];
}

export interface SecurityIssue {
  /** Issue severity */
  severity: 'critical' | 'warning' | 'info';
  /** Issue category */
  category: 'injection' | 'path-traversal' | 'resource-limit' | 'validation';
  /** Human-readable message */
  message: string;
  /** Location of issue (field path) */
  location?: string;
  /** Suggested remediation */
  remediation?: string;
}

// ============================================================================
// Pattern Storage Types
// ============================================================================

export interface GenerationPattern {
  /** Unique pattern identifier */
  id: string;
  /** Input signature for pattern matching */
  inputSignature: {
    /** Number of agents */
    agentCount: number;
    /** Distribution across categories */
    categoryDistribution: Record<string, number>;
    /** Zoom level used */
    level: ZoomLevel;
    /** Theme name */
    theme: string;
  };
  /** Output metrics */
  outputMetrics: {
    /** Lines of Mermaid code */
    lineCount: number;
    /** Number of nodes */
    nodeCount: number;
    /** Number of edges */
    edgeCount: number;
    /** Generation time (ms) */
    generationTimeMs: number;
  };
  /** Quality score (0-1) */
  qualityScore: number;
  /** Historical success rate */
  successRate: number;
  /** Number of times pattern was used */
  usageCount: number;
  /** Last usage timestamp */
  lastUsed: number;
}

// ============================================================================
// Adaptive Selection Types
// ============================================================================

export interface AdaptiveSelection {
  /** Recommended zoom level */
  suggestedLevel: ZoomLevel;
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Number of similar patterns found */
  basedOnPatterns: number;
  /** Human-readable reasoning */
  reasoning: string;
}
