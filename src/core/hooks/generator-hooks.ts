/**
 * Hook Integration Layer for Generator Enhancement
 * Based on DESIGN-001: Security and Hooks Integration
 */

import { execFileSync } from 'node:child_process';
import type {
  PreGenerateHookInput,
  PreGenerateHookOutput,
  PostGenerateHookInput,
  PostGenerateHookOutput,
  QualityMetrics,
  SecurityValidation,
  SecurityIssue,
  AdaptiveSelection,
  ComponentMapOptions,
} from './types.js';
import type { ZoomLevel } from '../model/types.js';
import { DiagramCache } from './cache.js';

// ============================================================================
// Constants
// ============================================================================

const SECURITY_THRESHOLD = 0.5;
const QUALITY_THRESHOLD = 0.8;
// CLI command is invoked via execFileSync with argument arrays for security

// Mermaid directive injection patterns (for names only - strict)
const NAME_INJECTION_PATTERNS = [
  /%%\{/,           // Directive start
  /\}%%/,           // Directive end
  /init\s*:/i,      // init directive
  /config\s*:/i,    // config directive
  /javascript:/i,   // javascript protocol
  /<script/i,       // Script tags
  /onclick/i,       // Event handlers
  /onerror/i,       // Event handlers
];

// Less strict patterns for descriptions (allow markdown tags)
const DESC_INJECTION_PATTERNS = [
  /%%\{/,           // Directive start
  /\}%%/,           // Directive end
  /<script/i,       // Script tags only
  /javascript:/i,   // javascript protocol
];

// Reserved Mermaid keywords
const MERMAID_RESERVED = [
  'end', 'graph', 'subgraph', 'direction', 'class', 'style',
  'click', 'call', 'href', 'callback'
];

// Maximum resource limits
const RESOURCE_LIMITS = {
  maxAgents: 1000,
  maxServers: 100,
  maxSkills: 200,
  maxLabelLength: 100,
} as const;

// ============================================================================
// Cache Instance
// ============================================================================

const cache = new DiagramCache();

// ============================================================================
// Pre-Generate Hook
// ============================================================================

/**
 * Invoke pre-generate hook for validation, security, and caching
 * @param input Hook input with config and options
 * @returns Hook output with validation results and cached diagram
 */
export async function invokePreGenerateHook(
  input: PreGenerateHookInput
): Promise<PreGenerateHookOutput> {
  const startTime = Date.now();

  try {
    // 1. Validate input security
    const security = validateInputSecurity(input);

    if (!security.passed) {
      return {
        validated: false,
        securityScore: security.score,
        sanitizedOptions: input.options,
        warnings: security.issues.map(i => `[${i.severity}] ${i.message}`),
      };
    }

    // 2. Check cache for existing result
    const cacheKey = cache.generateKey(input.config, input.options);
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log(`[Pre-Generate] Cache hit: ${cacheKey}`);
      return {
        validated: true,
        securityScore: 1.0,
        cachedResult: cached,
        sanitizedOptions: input.options,
        warnings: [],
      };
    }

    // 3. Sanitize options
    const sanitizedOptions = sanitizeOptions(input.options);

    // 4. Get adaptive level suggestion (if available)
    const suggestedLevel = await getAdaptiveLevelSuggestion(
      input.config.agents.length,
      getCategoryCount(input.config)
    );

    // 5. Invoke CLI hook (optional) - using execFileSync to prevent command injection
    try {
      const taskId = `pre-${input.requestId}`;
      const description = `Generate diagram: ${sanitizedOptions.level ?? 'category'} level for ${input.config.agents.length} agents`;
      // Use execFileSync with argument array to prevent injection
      execFileSync('npx', [
        '@claude-flow/cli@latest',
        'hooks',
        'pre-task',
        '--task-id', taskId,
        '--description', description
      ], { stdio: 'pipe', timeout: 5000 });
    } catch (error) {
      // Non-blocking, continue if hook fails
      console.warn('[Pre-Generate] Hook invocation failed:', error);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Pre-Generate] Validation completed in ${elapsed}ms`);

    return {
      validated: true,
      securityScore: security.score,
      suggestedLevel,
      sanitizedOptions,
      warnings: security.issues
        .filter(i => i.severity === 'warning')
        .map(i => i.message),
    };
  } catch (error) {
    console.error('[Pre-Generate] Hook error:', error);
    return {
      validated: false,
      securityScore: 0,
      sanitizedOptions: input.options,
      warnings: [`Hook execution failed: ${(error as Error).message}`],
    };
  }
}

// ============================================================================
// Post-Generate Hook
// ============================================================================

/**
 * Invoke post-generate hook for metrics, learning, and pattern storage
 * @param input Hook input with generation results
 * @returns Hook output with quality metrics and storage results
 */
export async function invokePostGenerateHook(
  input: PostGenerateHookInput
): Promise<PostGenerateHookOutput> {
  const startTime = Date.now();

  try {
    // 1. Calculate quality metrics
    const metrics: QualityMetrics = {
      generationTimeMs: input.output.generationTimeMs,
      nodeCount: input.output.nodeCount,
      edgeCount: input.output.edgeCount,
      categoryCount: getCategoryCount(input.input.config),
      avgLabelLength: calculateAvgLabelLength(input.input.config),
    };

    const qualityScore = calculateQualityScore(metrics);

    // 2. Determine if should cache
    const shouldCache = qualityScore >= QUALITY_THRESHOLD && input.success;

    // 3. Cache result if high quality
    if (shouldCache) {
      const cacheKey = cache.generateKey(
        input.input.config,
        input.input.options
      );
      cache.set(cacheKey, input.output.diagram, 300000); // 5 min TTL
      console.log(`[Post-Generate] Cached result: ${cacheKey}`);
    }

    // 4. Store pattern if successful (only high quality)
    let stored = false;
    let patternId: string | undefined;

    if (input.success && qualityScore >= QUALITY_THRESHOLD) {
      const pattern = createGenerationPattern(input, metrics, qualityScore);
      stored = await storePattern(pattern);
      patternId = pattern.id;
    }

    // 5. Generate optimization suggestions
    const suggestedOptimizations = generateOptimizationSuggestions(metrics);

    // 6. Invoke CLI hooks (optional) - using execFileSync to prevent command injection
    try {
      if (input.success) {
        execFileSync('npx', [
          '@claude-flow/cli@latest',
          'hooks',
          'post-task',
          '--task-id', input.requestId,
          '--success', 'true',
          '--store-results', 'true'
        ], { stdio: 'pipe', timeout: 5000 });

        // Train neural patterns on successful generation
        execFileSync('npx', [
          '@claude-flow/cli@latest',
          'hooks',
          'post-edit',
          '--file', 'diagram-output',
          '--success', 'true'
        ], { stdio: 'pipe', timeout: 5000 });
      }
    } catch (error) {
      // Non-blocking
      console.warn('[Post-Generate] Hook invocation failed:', error);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Post-Generate] Processing completed in ${elapsed}ms`);

    return {
      stored,
      patternId,
      qualityScore,
      learningFeedback: {
        shouldCache,
        suggestedOptimizations,
      },
    };
  } catch (error) {
    console.error('[Post-Generate] Hook error:', error);
    return {
      stored: false,
      qualityScore: 0,
      learningFeedback: {
        shouldCache: false,
        suggestedOptimizations: [],
      },
    };
  }
}

// ============================================================================
// Security Validation
// ============================================================================

/**
 * Validate input security (injection, path traversal, resource limits)
 */
function validateInputSecurity(input: PreGenerateHookInput): SecurityValidation {
  const issues: SecurityIssue[] = [];

  // Check resource limits
  if (input.config.agents.length > RESOURCE_LIMITS.maxAgents) {
    issues.push({
      severity: 'critical',
      category: 'resource-limit',
      message: `Agent count (${input.config.agents.length}) exceeds limit (${RESOURCE_LIMITS.maxAgents})`,
      location: 'config.agents',
      remediation: 'Use summary level or filter agents',
    });
  }

  if (input.config.mcpServers.length > RESOURCE_LIMITS.maxServers) {
    issues.push({
      severity: 'warning',
      category: 'resource-limit',
      message: `MCP server count (${input.config.mcpServers.length}) exceeds recommended limit`,
      location: 'config.mcpServers',
    });
  }

  // Check for injection patterns in agent names (strict)
  for (const agent of input.config.agents) {
    for (const pattern of NAME_INJECTION_PATTERNS) {
      if (pattern.test(agent.name)) {
        issues.push({
          severity: 'critical',
          category: 'injection',
          message: `Potential injection in agent name: ${agent.name}`,
          location: `config.agents[${agent.name}]`,
          remediation: 'Remove special characters from agent name',
        });
        break;
      }
    }
    // Check descriptions with less strict patterns (allow markdown)
    if (agent.description) {
      for (const pattern of DESC_INJECTION_PATTERNS) {
        if (pattern.test(agent.description)) {
          issues.push({
            severity: 'warning',
            category: 'injection',
            message: `Potential injection in agent description: ${agent.name}`,
            location: `config.agents[${agent.name}].description`,
            remediation: 'Review description for script injection',
          });
          break;
        }
      }
    }
  }

  // Validate theme name (allowlist) - only if it's a string
  if (input.options.theme && typeof input.options.theme === 'string' && !isValidThemeName(input.options.theme)) {
    issues.push({
      severity: 'warning',
      category: 'validation',
      message: `Unknown theme: ${input.options.theme}`,
      location: 'options.theme',
      remediation: 'Use a built-in theme (light, dark, high-contrast-*, colorblind-*)',
    });
  }

  // Check for path traversal in themePath
  if (input.options.themePath) {
    if (input.options.themePath.includes('..') || input.options.themePath.includes('~')) {
      issues.push({
        severity: 'critical',
        category: 'path-traversal',
        message: 'Path traversal attempt detected in themePath',
        location: 'options.themePath',
        remediation: 'Use absolute paths within allowed directories',
      });
    }
  }

  // Calculate security score
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 1.0 - (criticalCount * 0.5) - (warningCount * 0.1));

  return {
    passed: criticalCount === 0 && score >= SECURITY_THRESHOLD,
    score,
    issues,
  };
}

/**
 * Check if theme name is in allowlist
 */
function isValidThemeName(theme: string): boolean {
  const allowedThemes = [
    'light', 'dark',
    'high-contrast-light', 'high-contrast-dark',
    'colorblind-light', 'colorblind-dark',
  ];
  return allowedThemes.includes(theme.toLowerCase());
}

/**
 * Sanitize diagram options
 */
function sanitizeOptions(options: ComponentMapOptions): ComponentMapOptions {
  return {
    ...options,
    theme: options.theme && typeof options.theme === 'string' && isValidThemeName(options.theme)
      ? options.theme
      : 'light',
    level: options.level ?? 'category',
    compact: options.compact ?? false,
    maxPerCategory: Math.min(options.maxPerCategory ?? 20, 100),
  };
}

// ============================================================================
// Quality Metrics Calculation
// ============================================================================

/**
 * Calculate quality score based on metrics
 * Formula from DESIGN-001 Section 4.2
 */
export function calculateQualityScore(metrics: QualityMetrics): number {
  const weights = {
    time: 0.2,        // Faster is better
    density: 0.3,     // Balanced density
    readability: 0.3, // Clear labels
    completeness: 0.2 // All data represented
  };

  // Time score (logarithmic scale)
  const timeScore = metrics.generationTimeMs < 500 ? 1.0 :
                    metrics.generationTimeMs < 2000 ? 0.7 : 0.4;

  // Density score (nodes per category)
  const density = metrics.nodeCount / Math.max(metrics.categoryCount, 1);
  const densityScore = density < 20 ? 1.0 :
                       density < 50 ? 0.7 : 0.4;

  // Readability score (label length)
  const readabilityScore = metrics.avgLabelLength < 30 ? 1.0 : 0.5;

  // Completeness score (has connections)
  const completenessScore = metrics.edgeCount > 0 ? 1.0 : 0.5;

  return (
    timeScore * weights.time +
    densityScore * weights.density +
    readabilityScore * weights.readability +
    completenessScore * weights.completeness
  );
}

// ============================================================================
// Adaptive Level Selection
// ============================================================================

/**
 * Get AI-suggested zoom level based on learned patterns
 */
async function getAdaptiveLevelSuggestion(
  agentCount: number,
  categoryCount: number
): Promise<ZoomLevel | undefined> {
  try {
    // Query learned patterns via CLI - using execFileSync to prevent injection
    const query = `agents:${agentCount} categories:${categoryCount}`;

    const output = execFileSync('npx', [
      '@claude-flow/cli@latest',
      'memory',
      'search',
      '--query', query,
      '--namespace', 'diagram-patterns',
      '--limit', '5'
    ], {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 3000
    });

    // Parse results (simplified - actual parsing depends on CLI output format)
    if (output && output.includes('qualityScore')) {
      // Extract suggested level from best pattern
      // This is a placeholder - actual implementation depends on CLI output
      return undefined; // Let heuristics decide
    }
  } catch (error) {
    // Fall through to heuristics
  }

  // Fallback to heuristic-based selection
  if (agentCount > 100) return 'summary';
  if (agentCount > 20) return 'category';
  return 'detail';
}

// ============================================================================
// Pattern Storage
// ============================================================================

/**
 * Create generation pattern from hook input
 */
function createGenerationPattern(
  input: PostGenerateHookInput,
  metrics: QualityMetrics,
  qualityScore: number
): any {
  const config = input.input.config;
  const options = input.input.options;

  // Calculate category distribution
  const categoryDistribution: Record<string, number> = {};
  for (const agent of config.agents) {
    const category = agent.type ?? 'worker';
    categoryDistribution[category] = (categoryDistribution[category] ?? 0) + 1;
  }

  return {
    id: `pattern-${input.requestId}`,
    inputSignature: {
      agentCount: config.agents.length,
      categoryDistribution,
      level: options.level ?? 'category',
      theme: options.theme ?? 'light',
    },
    outputMetrics: {
      lineCount: input.output.diagram.split('\n').length,
      nodeCount: metrics.nodeCount,
      edgeCount: metrics.edgeCount,
      generationTimeMs: metrics.generationTimeMs,
    },
    qualityScore,
    successRate: 1.0, // Initial success
    usageCount: 1,
    lastUsed: Date.now(),
  };
}

/**
 * Store pattern in memory via CLI - using execFileSync to prevent injection
 */
async function storePattern(pattern: any): Promise<boolean> {
  try {
    const patternJson = JSON.stringify(pattern);

    execFileSync('npx', [
      '@claude-flow/cli@latest',
      'memory',
      'store',
      '--namespace', 'diagram-patterns',
      '--key', pattern.id,
      '--value', patternJson
    ], { stdio: 'pipe', timeout: 5000 });

    console.log(`[Post-Generate] Stored pattern: ${pattern.id}`);
    return true;
  } catch (error) {
    console.error('[Post-Generate] Failed to store pattern:', error);
    return false;
  }
}

// ============================================================================
// Optimization Suggestions
// ============================================================================

/**
 * Generate optimization suggestions based on metrics
 */
function generateOptimizationSuggestions(metrics: QualityMetrics): string[] {
  const suggestions: string[] = [];

  if (metrics.generationTimeMs > 2000) {
    suggestions.push('Consider using summary level for faster generation');
  }

  const density = metrics.nodeCount / Math.max(metrics.categoryCount, 1);
  if (density > 50) {
    suggestions.push('High node density - use category level or increase maxPerCategory');
  }

  if (metrics.avgLabelLength > 40) {
    suggestions.push('Long labels detected - enable compact mode for better readability');
  }

  if (metrics.edgeCount === 0 && metrics.nodeCount > 5) {
    suggestions.push('No connections found - verify agent delegation configuration');
  }

  return suggestions;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get category count from config
 */
function getCategoryCount(config: any): number {
  const categories = new Set(
    config.agents.map((a: any) => a.type ?? 'worker')
  );
  return categories.size;
}

/**
 * Calculate average label length
 */
function calculateAvgLabelLength(config: any): number {
  const lengths = config.agents.map((a: any) => a.name.length);
  return lengths.reduce((sum: number, len: number) => sum + len, 0) / Math.max(lengths.length, 1);
}
