/**
 * @claude-flow/types - Advanced Usage Patterns
 *
 * Advanced type patterns and composition techniques
 */

import type {
  Agent,
  AgentType,
  AgentConfig,
  AgentCapability,
  AgentRole,
  AgentSkill,
  AgentSecurityContext,
  Tool,
  MemoryEntry,
  MemorySearchQuery,
  MemorySearchResult,
  HNSWIndexConfig,
  SecurityFinding,
  SecurityPolicy,
  SecurityScanConfig,
  SecurityScanResult,
  Trajectory,
  Pattern,
  LearningConfig,
  LearningSession,
  Command,
  CommandContext,
  CommandResult,
  Result,
} from '../src/index.js';
import {
  createAgentId,
  createTaskId,
  createMemoryId,
  createPatternId,
  createTrajectoryId,
  createFindingId,
  createSuccess,
  createError,
  isSuccess,
  unwrap,
  mapResult,
  chainResult,
} from '../src/index.js';

// ============================================
// Advanced Agent Patterns
// ============================================

/**
 * Create a specialized agent role
 */
function defineAgentRole(): AgentRole {
  return {
    name: 'security-auditor',
    description: 'Performs security audits and vulnerability scanning',
    responsibilities: [
      'Scan code for security vulnerabilities',
      'Review security configurations',
      'Generate security reports',
      'Recommend remediation strategies',
    ],
    requiredCapabilities: [
      'code-analysis',
      'vulnerability-scanning',
      'report-generation',
    ],
    canDelegate: false,
    suitableAgentTypes: ['security-auditor', 'reviewer'],
  };
}

/**
 * Build agent with capabilities composition
 */
function buildSecureAgent(): AgentConfig {
  const capabilities: AgentCapability[] = [
    {
      name: 'code-analysis',
      description: 'Analyze source code',
      resource: 'filesystem',
      actions: ['read'],
      constraints: { maxFileSize: 50 * 1024 * 1024 },
    },
    {
      name: 'vulnerability-scanning',
      description: 'Scan for known vulnerabilities',
      resource: 'vulnerability-db',
      actions: ['query'],
      dependencies: ['code-analysis'],
    },
    {
      name: 'report-generation',
      description: 'Generate security reports',
      resource: 'filesystem',
      actions: ['write'],
      dependencies: ['vulnerability-scanning'],
    },
  ];

  const tools: Tool[] = [
    {
      id: 'snyk' as any,
      name: 'Snyk',
      type: 'scanner',
      version: '1.1000.0',
      description: 'Vulnerability and license scanning',
      tags: ['security', 'scanning', 'sca'],
    },
    {
      id: 'semgrep' as any,
      name: 'Semgrep',
      type: 'sast',
      version: '1.45.0',
      description: 'Static analysis security testing',
      tags: ['security', 'sast'],
    },
  ];

  return {
    type: 'security-auditor',
    name: 'security-auditor-1',
    description: 'Dedicated security auditing and vulnerability scanning',
    cognitivePattern: 'critical',
    capabilities,
    tools,
    maxConcurrentTasks: 3,
    learningEnabled: true,
    hooks: {
      onTaskStart: 'pre-task',
      onTaskComplete: 'post-task',
      onError: 'on-error',
    },
  };
}

/**
 * Define security context for agent
 */
function createAgentSecurityContext(): AgentSecurityContext {
  return {
    agentId: String(createAgentId('auditor-1')),
    capabilities: ['code-analysis', 'vulnerability-scanning'],
    resourceLimits: {
      maxFileSize: 100 * 1024 * 1024,
      maxMemory: 4 * 1024 * 1024 * 1024,
      maxExecutionTime: 3600000, // 1 hour
      allowedDomains: ['*.github.com', 'api.security-db.com'],
    },
    sandboxLevel: 'strict',
    networkAccess: true,
    shellAccess: false,
    fileReadAccess: true,
    fileWriteAccess: false,
  };
}

// ============================================
// Advanced Memory Patterns
// ============================================

/**
 * Configure HNSW indexing for fast search
 */
function configureHNSWIndexing(): HNSWIndexConfig {
  return {
    maxConnections: 32, // Balance between memory and accuracy
    efConstruction: 200, // Higher = better but slower to build
    efSearch: 100, // Search parameter
    seed: 42, // Reproducible initialization
  };
}

/**
 * Type-safe semantic search
 */
async function performSemanticSearch(): Promise<MemorySearchResult<any>[]> {
  interface AuthPattern {
    implementation: string;
    testCoverage: number;
    securityReview: boolean;
  }

  const query: MemorySearchQuery = {
    query: 'JWT authentication implementation with refresh tokens',
    namespace: 'patterns',
    limit: 5,
    threshold: 0.75,
    semantic: true,
    tags: ['authentication', 'security'],
  };

  // Simulated search result
  const results: MemorySearchResult<AuthPattern>[] = [
    {
      entry: {
        id: createMemoryId('mem-jwt-1'),
        namespace: 'patterns',
        key: 'jwt-refresh-pattern',
        data: {
          implementation: 'class JWTAuth { ... }',
          testCoverage: 95,
          securityReview: true,
        },
        metadata: {
          createdAt: new Date(),
          accessCount: 10,
          tags: ['jwt', 'auth'],
          importance: 0.95 as any,
        },
      },
      score: 0.92 as any,
      explanation: 'Exact match for JWT with refresh token pattern',
    },
  ];

  return results;
}

// ============================================
// Advanced Security Patterns
// ============================================

/**
 * Configure comprehensive security scan
 */
function createSecurityScanConfig(): SecurityScanConfig {
  return {
    depth: 'deep',
    categories: ['injection', 'secrets', 'traversal', 'dos', 'auth'],
    patterns: [
      'hardcoded_api_keys',
      'sql_injection',
      'path_traversal',
      'xss_vulnerabilities',
    ],
    include: ['src/**/*.ts', 'tests/**/*.ts'],
    exclude: ['node_modules/**', 'dist/**', '**/*.generated.ts'],
    maxFileSizeBytes: 10 * 1024 * 1024,
    enableCache: true,
  };
}

/**
 * Create comprehensive security policy
 */
function createSecurityPolicy(): SecurityPolicy {
  return {
    id: 'policy-strict-auth',
    name: 'Strict Authentication Policy',
    description: 'Enforces strict authentication requirements',
    principal: {
      type: 'role',
      id: 'auditor',
    },
    allowedActions: [
      'read-code',
      'scan-vulnerabilities',
      'generate-reports',
    ],
    resources: ['source-code', 'vulnerability-db'],
    conditions: {
      requiresAuth: true,
      requiresEncryption: true,
      maxConcurrentScans: 3,
    },
    effectiveAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };
}

// ============================================
// Advanced Learning Patterns
// ============================================

/**
 * Configure adaptive learning system
 */
function createLearningConfig(): LearningConfig {
  return {
    enabled: true,
    learningRate: 0.01 as any,
    discountFactor: 0.99 as any,
    useEWCConsolidation: true,
    ewcLambda: 0.5,
    useTrajectoryFeedback: true,
    patternStorage: 'hybrid',
    maxPatterns: 10000,
    consolidationIntervalHours: 24,
  };
}

/**
 * Create learning session for grouped learning
 */
function createLearningSession(): LearningSession {
  return {
    id: `session-auth-impl-${Date.now()}`,
    name: 'Authentication Implementation Learning Session',
    startedAt: new Date(Date.now() - 3600000),
    completedAt: new Date(),
    trajectories: [
      createTrajectoryId('traj-1'),
      createTrajectoryId('traj-2'),
      createTrajectoryId('traj-3'),
    ],
    patternsLearned: [
      createPatternId('pat-jwt'),
      createPatternId('pat-oauth'),
    ],
    avgReward: 0.88 as any,
    improvementPercent: 15,
    consolidationResults: {
      consolidated: 50,
      retained: 48,
      forgotten: 2,
      ewcLoss: 0.02,
      timestamp: new Date(),
      durationMs: 1500,
    },
  };
}

// ============================================
// Result Composition Patterns
// ============================================

/**
 * Compose results with map and chain
 */
async function composedResultHandling(): Promise<void> {
  // Start with a result
  const initial: Result<string> = createSuccess('config-path');

  // Map to read config
  const mapped = mapResult(initial, (path) => {
    return `Config from ${path}`;
  });

  // Chain to process config
  const chained = chainResult(mapped, (config) => {
    if (config.includes('valid')) {
      return createSuccess({ parsed: true });
    }
    return createError('INVALID_CONFIG', 'Config validation failed');
  });

  if (isSuccess(chained)) {
    console.log('Success:', chained.data);
  }
}

/**
 * Error recovery pattern
 */
function errorRecoveryPattern(): void {
  function attemptOperation(): Result<number> {
    try {
      throw new Error('Operation failed');
    } catch (err) {
      return createError('OP_ERROR', 'Operation failed', {
        originalError: String(err),
      });
    }
  }

  const result = attemptOperation();

  // Recover with fallback
  const recovered = isSuccess(result) ? result.data : 0;
  console.log('Result:', recovered);
}

// ============================================
// CLI Advanced Patterns
// ============================================

/**
 * Create interactive command with validation
 */
function createAdvancedCommand(): Command {
  return {
    name: 'security',
    description: 'Security scanning and analysis',
    parameters: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 'string',
        required: true,
        position: 0,
        choices: ['scan', 'report', 'remediate'],
        validate: (value) => typeof value === 'string' && value.length > 0,
      },
    ],
    options: [
      {
        name: 'severity',
        description: 'Minimum severity level',
        type: 'string',
        short: 's',
        choices: ['info', 'warning', 'error', 'critical'],
        default: 'error',
      },
      {
        name: 'fix',
        description: 'Automatically fix issues',
        type: 'boolean',
        short: 'f',
        default: false,
      },
    ],
    subcommands: [
      {
        name: 'scan',
        description: 'Scan for vulnerabilities',
        action: async (ctx: CommandContext): Promise<CommandResult> => {
          const startTime = Date.now();
          try {
            return {
              status: 'success',
              data: {
                findings: 5,
                critical: 1,
                error: 2,
              },
              durationMs: Date.now() - startTime,
            };
          } catch (err) {
            return {
              status: 'error',
              error: String(err),
              code: 1,
              durationMs: Date.now() - startTime,
            };
          }
        },
      },
    ],
    action: async (ctx: CommandContext) => ({
      status: 'success',
      data: { subcommands: ['scan', 'report', 'remediate'] },
      durationMs: 100,
    }),
  };
}

// ============================================
// Demonstration
// ============================================

/**
 * Run advanced pattern examples
 */
export async function runAdvancedExamples(): Promise<void> {
  console.log('=== Advanced Agent Patterns ===');
  console.log('Role:', defineAgentRole().name);
  console.log('Security Context:', createAgentSecurityContext().sandboxLevel);

  console.log('\n=== Advanced Memory Patterns ===');
  console.log('HNSW Config:', configureHNSWIndexing().maxConnections);
  const searchResults = await performSemanticSearch();
  console.log('Search results:', searchResults.length);

  console.log('\n=== Advanced Security Patterns ===');
  console.log('Scan depth:', createSecurityScanConfig().depth);
  console.log('Policy:', createSecurityPolicy().name);

  console.log('\n=== Advanced Learning Patterns ===');
  console.log('Learning rate:', createLearningConfig().learningRate);
  const session = createLearningSession();
  console.log('Improvement:', session.improvementPercent + '%');

  console.log('\n=== Result Composition ===');
  await composedResultHandling();
  errorRecoveryPattern();

  console.log('\n=== Advanced CLI ===');
  const cmd = createAdvancedCommand();
  console.log('Command:', cmd.name);
  console.log('Subcommands:', cmd.subcommands?.length);
}
