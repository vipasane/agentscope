/**
 * @claude-flow/types - Agent Types
 *
 * Defines the core agent architecture with support for:
 * - Multiple agent types and cognitive patterns
 * - Agent capabilities and tool access
 * - Configuration and lifecycle management
 * - Learning-enhanced agent behavior
 *
 * @module types/agent/agent
 */

import type { AgentId, ToolId, Confidence, Timestamp } from '../common/branded.js';

/**
 * Agent types representing different specialized roles
 *
 * @example
 * - `coder`: Implements code and writes unit tests
 * - `tester`: Designs and executes test strategies
 * - `reviewer`: Reviews code quality and safety
 * - `researcher`: Analyzes requirements and patterns
 * - `architect`: Designs system architecture
 */
export type AgentType =
  | 'coder'
  | 'tester'
  | 'reviewer'
  | 'researcher'
  | 'architect'
  | 'security-auditor'
  | 'performance-engineer'
  | 'coordinator'
  | 'specialist'
  | 'scout';

/**
 * Cognitive patterns for agent reasoning and decision-making
 *
 * @example
 * - `convergent`: Focused, systematic problem-solving
 * - `divergent`: Creative exploration of possibilities
 * - `lateral`: Non-linear, sideways thinking
 * - `systems`: Holistic system-level thinking
 * - `critical`: Analytical, evidence-based reasoning
 * - `adaptive`: Dynamic, responsive to feedback
 */
export type CognitivePattern =
  | 'convergent'
  | 'divergent'
  | 'lateral'
  | 'systems'
  | 'critical'
  | 'adaptive';

/**
 * Agent status throughout its lifecycle
 *
 * @example
 * - `idle`: Not processing tasks
 * - `active`: Currently processing
 * - `paused`: Temporarily suspended
 * - `error`: Error state, needs intervention
 * - `terminated`: Shut down (final state)
 */
export type AgentStatus = 'idle' | 'active' | 'paused' | 'error' | 'terminated';

/**
 * Agent capability representing a specific function or authority
 *
 * @example
 * ```typescript
 * {
 *   name: 'file-access',
 *   description: 'Read and write files',
 *   resource: 'filesystem',
 *   actions: ['read', 'write'],
 *   constraints: {
 *     maxFileSize: 1024 * 1024, // 1MB
 *     allowedPaths: ['/src', '/tests']
 *   }
 * }
 * ```
 */
export interface AgentCapability {
  /** Unique capability identifier */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** Resource this capability grants access to */
  readonly resource: string;

  /** Allowed actions on the resource */
  readonly actions: string[];

  /** Constraints on capability usage */
  readonly constraints?: Record<string, unknown>;

  /** Required dependencies for this capability */
  readonly dependencies?: string[];
}

/**
 * Tool that an agent can use or provide
 *
 * @example
 * ```typescript
 * {
 *   id: 'ts-compiler' as ToolId,
 *   name: 'TypeScript Compiler',
 *   type: 'compiler',
 *   version: '5.0.0',
 *   description: 'Compile TypeScript to JavaScript',
 *   inputSchema: { type: 'object', properties: { ... } },
 *   outputSchema: { type: 'object', properties: { ... } },
 *   tags: ['typescript', 'compilation']
 * }
 * ```
 */
export interface Tool {
  /** Unique tool identifier */
  readonly id: ToolId;

  /** Tool name */
  readonly name: string;

  /** Tool category */
  readonly type: string;

  /** Semantic version */
  readonly version: string;

  /** Tool description */
  readonly description: string;

  /** JSON Schema for input validation */
  readonly inputSchema?: Record<string, unknown>;

  /** JSON Schema for output validation */
  readonly outputSchema?: Record<string, unknown>;

  /** Classifying tags */
  readonly tags?: string[];

  /** Whether this tool requires special permissions */
  readonly requiresAuth?: boolean;
}

/**
 * Agent configuration object
 *
 * @example
 * ```typescript
 * {
 *   type: 'coder',
 *   name: 'main-coder',
 *   description: 'Primary code implementation agent',
 *   cognitivePattern: 'convergent',
 *   capabilities: ['file-access', 'git-operations'],
 *   tools: ['ts-compiler', 'eslint'],
 *   maxConcurrentTasks: 3,
 *   learningEnabled: true,
 *   hooks: {
 *     onTaskStart: 'pre-task',
 *     onTaskComplete: 'post-task'
 *   }
 * }
 * ```
 */
export interface AgentConfig {
  /** Agent type determines default behavior and capabilities */
  readonly type: AgentType;

  /** Human-readable agent name */
  readonly name: string;

  /** Description of agent purpose and responsibilities */
  readonly description?: string;

  /** Primary cognitive pattern for this agent */
  readonly cognitivePattern?: CognitivePattern;

  /** Capabilities granted to this agent */
  readonly capabilities: AgentCapability[];

  /** Tools available to this agent */
  readonly tools: Tool[];

  /** Maximum tasks to run concurrently */
  readonly maxConcurrentTasks?: number;

  /** Enable learning from task outcomes */
  readonly learningEnabled?: boolean;

  /** Hook names to trigger on agent events */
  readonly hooks?: {
    onTaskStart?: string;
    onTaskComplete?: string;
    onError?: string;
  };

  /** Custom metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Core agent entity
 *
 * Represents an active agent with identity, configuration, and runtime state.
 */
export interface Agent {
  /** Unique agent identifier */
  readonly id: AgentId;

  /** Agent configuration */
  readonly config: AgentConfig;

  /** Current agent status */
  readonly status: AgentStatus;

  /** When agent was created */
  readonly createdAt: Date;

  /** Last activity timestamp */
  readonly lastActivityAt?: Date;

  /** Number of tasks completed */
  readonly tasksCompleted: number;

  /** Number of failed tasks */
  readonly tasksFailed: number;

  /** Agent health score (0-1) */
  readonly health: Confidence;

  /** Current error if in error state */
  readonly error?: string;

  /** Learning metrics if enabled */
  readonly learningMetrics?: AgentLearningMetrics;
}

/**
 * Learning metrics for an agent
 *
 * Tracks performance and improvement over time.
 */
export interface AgentLearningMetrics {
  /** Total patterns learned */
  readonly patternsLearned: number;

  /** Total trajectories recorded */
  readonly trajectoriesRecorded: number;

  /** Average task success rate */
  readonly successRate: number;

  /** Average task completion time in ms */
  readonly avgCompletionTimeMs: number;

  /** Last learning update */
  readonly lastUpdated: Date;
}

/**
 * Agent capacity and resource usage
 *
 * Tracks current load and performance.
 */
export interface AgentCapacity {
  /** Agent ID this capacity belongs to */
  readonly agentId: AgentId;

  /** Current number of active tasks */
  readonly activeTasks: number;

  /** Maximum allowed concurrent tasks */
  readonly maxTasks: number;

  /** Utilization percentage (0-100) */
  readonly utilization: number;

  /** Average task latency in ms */
  readonly avgLatencyMs: number;

  /** Memory usage in bytes */
  readonly memoryUsageBytes?: number;

  /** Last measured timestamp */
  readonly measuredAt: Timestamp;
}

/**
 * Agent role in a swarm or team
 *
 * Defines responsibilities within a larger group.
 */
export interface AgentRole {
  /** Role name */
  readonly name: string;

  /** Role description */
  readonly description: string;

  /** Responsibilities */
  readonly responsibilities: string[];

  /** Required capabilities */
  readonly requiredCapabilities: string[];

  /** Can this role delegate to others */
  readonly canDelegate?: boolean;

  /** Agent types suitable for this role */
  readonly suitableAgentTypes: AgentType[];
}

/**
 * Agent skill representing a learned capability
 *
 * Skills are developed through learning and training.
 */
export interface AgentSkill {
  /** Skill name */
  readonly name: string;

  /** Skill description */
  readonly description: string;

  /** Proficiency level (0-1) */
  readonly proficiency: Confidence;

  /** When skill was acquired */
  readonly acquiredAt: Date;

  /** Related patterns or techniques */
  readonly relatedPatterns?: string[];
}

/**
 * Agent state snapshot for persistence
 *
 * Used for session management and recovery.
 */
export interface AgentStateSnapshot {
  /** Agent ID */
  readonly agentId: AgentId;

  /** Current status */
  readonly status: AgentStatus;

  /** Active task IDs */
  readonly activeTasks: string[];

  /** Last known health */
  readonly health: Confidence;

  /** Snapshot timestamp */
  readonly timestamp: Date;

  /** State-specific data */
  readonly stateData?: Record<string, unknown>;
}
