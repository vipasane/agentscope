/**
 * @claude-flow/types - Basic Usage Examples
 *
 * Common patterns for using Claude Flow types
 */

import type {
  Agent,
  AgentId,
  AgentConfig,
  Result,
  MemoryEntry,
  SecurityFinding,
  Trajectory,
  Command,
  CommandContext,
} from '../src/index.js';
import {
  createAgentId,
  createSuccess,
  createError,
  isSuccess,
  createMemoryId,
  createTrajectoryId,
} from '../src/index.js';

// ============================================
// Agent Creation
// ============================================

/**
 * Create an agent configuration
 */
function createCoderAgent(): AgentConfig {
  return {
    type: 'coder',
    name: 'primary-coder',
    description: 'Main code implementation agent',
    cognitivePattern: 'convergent',
    capabilities: [
      {
        name: 'file-access',
        description: 'Read and write files',
        resource: 'filesystem',
        actions: ['read', 'write', 'delete'],
        constraints: {
          maxFileSize: 1024 * 1024 * 10, // 10MB
        },
      },
      {
        name: 'git-operations',
        description: 'Git version control',
        resource: 'git',
        actions: ['commit', 'push', 'branch'],
      },
    ],
    tools: [
      {
        id: 'typescript-compiler' as any,
        name: 'TypeScript Compiler',
        type: 'compiler',
        version: '5.9.0',
        description: 'Compile and type-check TypeScript',
        tags: ['typescript', 'compilation'],
      },
      {
        id: 'eslint' as any,
        name: 'ESLint',
        type: 'linter',
        version: '8.0.0',
        description: 'JavaScript/TypeScript linter',
        tags: ['linting', 'code-quality'],
      },
    ],
    maxConcurrentTasks: 5,
    learningEnabled: true,
    hooks: {
      onTaskStart: 'pre-task',
      onTaskComplete: 'post-task',
    },
  };
}

/**
 * Type-safe agent ID usage
 */
function demonstrateAgentId(): void {
  const agentId: AgentId = createAgentId('coder-main');

  // Can only use AgentId where AgentId is expected
  function processAgent(id: AgentId): void {
    console.log(`Processing agent: ${id}`);
  }

  processAgent(agentId); // OK
  // processAgent('raw-string'); // Error: string not assignable to AgentId
}

// ============================================
// Result Types & Error Handling
// ============================================

/**
 * Function with typed result handling
 */
function readConfiguration(path: string): Result<{ apiKey: string }> {
  try {
    // Simulate reading config
    if (!path) {
      return createError('INVALID_PATH', 'Configuration path cannot be empty');
    }

    return createSuccess({
      apiKey: 'secret-key',
    });
  } catch (err) {
    return createError('READ_ERROR', `Failed to read configuration from ${path}`, {
      originalError: String(err),
    });
  }
}

/**
 * Handle result with pattern matching
 */
function processConfigResult(): void {
  const result = readConfiguration('/config.json');

  if (isSuccess(result)) {
    console.log('Config loaded:', result.data.apiKey);
  } else {
    console.error(`Error [${result.code}]: ${result.message}`);
    if (result.details) {
      console.error('Details:', result.details);
    }
  }
}

// ============================================
// Memory Types
// ============================================

/**
 * Create typed memory entries
 */
function createMemoryEntries(): void {
  interface CodePattern {
    pattern: string;
    language: string;
    description: string;
  }

  const authPattern: MemoryEntry<CodePattern> = {
    id: createMemoryId('mem-jwt-auth'),
    namespace: 'patterns',
    key: 'jwt-authentication',
    data: {
      pattern: 'JWT with refresh tokens',
      language: 'typescript',
      description: 'Secure JWT authentication with refresh token rotation',
    },
    embedding: {
      values: Array(384).fill(0), // Typically 384 or 768 dimensions
      dimension: 384,
      model: 'all-MiniLM-L6-v2',
      normalized: true,
    },
    metadata: {
      createdAt: new Date(),
      accessCount: 15,
      tags: ['authentication', 'security', 'jwt'],
      importance: 0.95 as any,
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  console.log('Stored pattern:', authPattern.data.pattern);
}

// ============================================
// Security Types
// ============================================

/**
 * Create security findings
 */
function createSecurityFinding(): SecurityFinding {
  return {
    id: 'finding-exposed-key' as any,
    type: 'exposed_credentials',
    level: 'critical',
    category: 'secrets',
    location: {
      file: 'src/config.ts',
      line: 42,
      column: 1,
    },
    message: 'API key hardcoded in source file',
    evidence: 'process.env.ANTHROPIC_API_KEY || "sk-ant-xxxx"',
    remediation: 'Move API key to .env file and add .env to .gitignore',
    references: [
      'https://owasp.org/www-project-top-ten/',
      'https://github.com/ruvnet/claude-flow/security',
    ],
    confidence: 0.99 as any,
    discoveredAt: new Date(),
    remediated: false,
  };
}

// ============================================
// Learning Types
// ============================================

/**
 * Create a learning trajectory
 */
function createLearningTrajectory(): Trajectory {
  return {
    id: createTrajectoryId('traj-auth-2024'),
    task: 'implement-jwt-authentication',
    steps: [
      {
        id: 'step-1-analyze',
        action: 'analyze-requirements',
        input: {
          spec: 'JWT-based authentication for REST API',
        },
        output: {
          plan: 'Create JWTAuth service with refresh tokens',
        },
        quality: 0.9 as any,
        latencyMs: 500,
      },
      {
        id: 'step-2-implement',
        action: 'implement-code',
        input: {
          plan: 'Create JWTAuth service with refresh tokens',
          targetLanguage: 'typescript',
        },
        output: {
          code: '// JWT authentication implementation',
          linesOfCode: 250,
        },
        quality: 0.95 as any,
        latencyMs: 3500,
      },
      {
        id: 'step-3-test',
        action: 'write-tests',
        input: {
          code: '// JWT authentication implementation',
        },
        output: {
          testCoverage: 95,
          tests: 18,
        },
        quality: 0.92 as any,
        latencyMs: 2000,
      },
    ],
    outcome: 'success',
    reward: 0.92 as any,
    durationMs: 6000,
    startedAt: new Date(Date.now() - 6000),
    completedAt: new Date(),
    context: {
      agentId: 'coder-1',
      agentType: 'coder',
      repository: 'api-service',
    },
    feedback: 'Excellent implementation with comprehensive test coverage',
  };
}

// ============================================
// CLI Types
// ============================================

/**
 * Create a CLI command
 */
function createAgentCommand(): Command {
  return {
    name: 'agent',
    description: 'Manage agents in Claude Flow',
    usage: 'agent <subcommand> [options]',
    parameters: [
      {
        name: 'subcommand',
        description: 'Subcommand to execute',
        type: 'string',
        required: true,
        position: 0,
        choices: ['spawn', 'list', 'status', 'stop'],
      },
    ],
    options: [
      {
        name: 'verbose',
        description: 'Enable verbose output',
        type: 'boolean',
        short: 'v',
        default: false,
      },
      {
        name: 'format',
        description: 'Output format',
        type: 'string',
        short: 'f',
        default: 'text',
        choices: ['text', 'json', 'yaml'],
      },
    ],
    subcommands: [
      {
        name: 'spawn',
        description: 'Spawn a new agent',
        parameters: [
          {
            name: 'type',
            description: 'Agent type',
            type: 'string',
            required: true,
            choices: ['coder', 'tester', 'reviewer', 'researcher'],
          },
        ],
        action: async (ctx: CommandContext) => {
          const agentId = createAgentId(`agent-${Date.now()}`);
          return {
            status: 'success',
            data: { agentId },
            durationMs: 250,
          };
        },
      },
    ],
    action: async (ctx: CommandContext) => {
      return {
        status: 'success',
        data: { subcommands: ['spawn', 'list', 'status', 'stop'] },
        durationMs: 50,
      };
    },
  };
}

// ============================================
// Main
// ============================================

/**
 * Run examples
 */
export function runExamples(): void {
  console.log('=== Agent Creation ===');
  const config = createCoderAgent();
  console.log(`Created agent: ${config.name}`);

  console.log('\n=== Agent ID Usage ===');
  demonstrateAgentId();

  console.log('\n=== Result Handling ===');
  processConfigResult();

  console.log('\n=== Memory ===');
  createMemoryEntries();

  console.log('\n=== Security ===');
  const finding = createSecurityFinding();
  console.log(`Found: ${finding.message}`);

  console.log('\n=== Learning ===');
  const trajectory = createLearningTrajectory();
  console.log(`Trajectory reward: ${trajectory.reward}`);

  console.log('\n=== CLI ===');
  const command = createAgentCommand();
  console.log(`Created command: ${command.name}`);
}
