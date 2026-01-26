/**
 * @claude-flow/types - Branded Types Module
 *
 * Provides compile-time distinct types for IDs and other values using
 * TypeScript's phantom type pattern. This prevents accidental mixing of
 * different ID types (e.g., AgentId vs TaskId) while maintaining full
 * type safety and zero runtime overhead.
 *
 * ## Why Branded Types?
 *
 * Without branded types, this code would compile but is error-prone:
 * ```typescript
 * function assignTask(agentId: string, taskId: string): void { }
 *
 * const agent = 'agent-1';
 * const task = 'task-1';
 * assignTask(task, agent); // ❌ BUG: Arguments swapped, but no error!
 * ```
 *
 * With branded types, the error is caught at compile-time:
 * ```typescript
 * function assignTask(agentId: AgentId, taskId: TaskId): void { }
 *
 * const agent: AgentId = createAgentId('agent-1');
 * const task: TaskId = createTaskId('task-1');
 * assignTask(task, agent); // ✅ COMPILE ERROR: Cannot assign TaskId to AgentId
 * ```
 *
 * ## Zero Runtime Cost
 *
 * Branded types use TypeScript's intersection types with phantom properties.
 * The `__brand` property never exists at runtime - it's purely a compile-time
 * type marker. This gives us type safety without performance overhead.
 *
 * @module types/common/branded
 * @see {@link result} for Result type pattern matching
 * @see {@link agent} for AgentId usage
 * @see {@link learning} for PatternId and TrajectoryId usage
 */

/**
 * Helper to create branded (opaque) types
 *
 * Creates a unique nominal type using TypeScript's intersection with a phantom
 * property. The branded value cannot be accidentally converted between similar
 * types (e.g., TaskId vs AgentId) while maintaining full type safety.
 *
 * **Type Safety Guarantee:**
 * - ✅ Can only be created with `brand()` helper or `as` assertion
 * - ✅ Cannot be implicitly converted to base type or other branded types
 * - ✅ Cannot be assigned from string or other ID types
 * - ✅ Zero runtime cost - `__brand` property doesn't exist at runtime
 *
 * @template T The base type (usually `string` or `number`)
 * @template Brand The brand identifier (usually `'AgentId'`, `'TaskId'`, etc.)
 *
 * @example
 * ```typescript
 * // Define a branded type
 * type UserId = Branded<string, 'UserId'>;
 *
 * // Function requires the specific branded type
 * function getUser(id: UserId): User {
 *   // Can only accept UserId, not string or other ID types
 *   return users.get(id);
 * }
 *
 * // ✅ Using the brand() helper (recommended)
 * const userId: UserId = brand('user-123');
 * getUser(userId); // OK
 *
 * // ✅ Using 'as' assertion (when necessary)
 * const userId = 'user-123' as UserId;
 * getUser(userId); // OK
 *
 * // ❌ Compile errors prevent mistakes
 * getUser('user-123'); // ERROR: string not assignable to UserId
 * const agentId: AgentId = userId; // ERROR: UserId not assignable to AgentId
 * ```
 *
 * @see {@link createAgentId} for creating AgentId values
 * @see {@link createTaskId} for creating TaskId values
 * @see {@link brand} for creating branded values
 *
 * @public
 */
export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/**
 * Helper function to create branded values at runtime
 *
 * This is a type-level helper that performs an unsafe type assertion.
 * The actual branding only exists in TypeScript's type system - at runtime,
 * the value is unchanged. Use this with `as` when you have unbranded values
 * that you want to treat as branded.
 *
 * **When to use:**
 * - Creating branded values from external data (API responses, user input)
 * - When you've already validated the value and are ready to commit the brand
 * - As a clear marker of intent that you're taking responsibility for the brand
 *
 * **When NOT to use:**
 * - For factory functions - use dedicated creators like `createAgentId()` instead
 * - When you haven't validated the input yet
 *
 * @template T The base type
 * @template Brand The brand identifier (e.g., 'AgentId', 'TaskId')
 * @param value The value to brand (must be validated before calling this)
 * @returns The branded value (type-level only, no runtime change)
 *
 * @example
 * ```typescript
 * // Create a branded value
 * const agentId: AgentId = brand('agent-123');
 *
 * // Works with any branded type
 * const taskId: TaskId = brand('task-456');
 * const confidence: Confidence = brand(0.95);
 * ```
 *
 * @see {@link createAgentId} for creating AgentIds with validation
 * @see {@link createTaskId} for creating TaskIds with validation
 * @public
 */
export function brand<T, Brand extends string>(value: T): Branded<T, Brand> {
  return value as Branded<T, Brand>;
}

// ============================================
// ID Types (Branded Strings)
// ============================================

/**
 * Unique identifier for agents with type safety
 *
 * Agents are specialized AI entities that perform tasks. Each agent has
 * a unique AgentId that distinguishes it from other agents in the system.
 *
 * **Type Safety:** Cannot be accidentally converted to TaskId, SwarmId, or
 * any other string-based ID type.
 *
 * @example
 * ```typescript
 * // Create agent IDs
 * const coder: AgentId = createAgentId('coder-1');
 * const tester: AgentId = createAgentId('tester-1');
 *
 * // Use in functions
 * function getAgentStatus(id: AgentId): AgentStatus {
 *   // ...
 * }
 *
 * getAgentStatus(coder); // OK
 * getAgentStatus('coder-1'); // ERROR: string not assignable to AgentId
 * ```
 *
 * @see {@link createAgentId} to create new AgentIds
 * @see {@link Agent} for agent entity type
 * @public
 */
export type AgentId = Branded<string, 'AgentId'>;

/**
 * Unique identifier for tasks
 *
 * Tasks represent discrete units of work assigned to agents. Each task
 * has a unique TaskId that tracks its lifecycle and outcomes.
 *
 * **Type Safety:** Cannot be accidentally converted to AgentId, SwarmId,
 * or any other ID type.
 *
 * @example
 * ```typescript
 * const taskId: TaskId = createTaskId('task-implement-auth');
 * const taskStatus = await getTaskStatus(taskId);
 * ```
 *
 * @see {@link createTaskId} to create new TaskIds
 * @public
 */
export type TaskId = Branded<string, 'TaskId'>;

/**
 * Unique identifier for swarms (multi-agent groups)
 *
 * Swarms are coordinated groups of agents working together on complex tasks.
 * Each swarm has a unique SwarmId for tracking collective state and coordination.
 *
 * @example
 * ```typescript
 * const swarmId: SwarmId = createSwarmId('swarm-feature-dev');
 * const swarmStatus = await getSwarmStatus(swarmId);
 * ```
 *
 * @see {@link createSwarmId} to create new SwarmIds
 * @public
 */
export type SwarmId = Branded<string, 'SwarmId'>;

/**
 * Unique identifier for sessions
 *
 * Sessions represent persistent user or agent interactions. Each session
 * has a unique SessionId for state management and recovery.
 *
 * @example
 * ```typescript
 * const sessionId: SessionId = createSessionId('session-' + Date.now());
 * await saveSessionState(sessionId, agentState);
 * ```
 *
 * @see {@link createSessionId} to create new SessionIds
 * @public
 */
export type SessionId = Branded<string, 'SessionId'>;

/**
 * Unique identifier for memory entries
 *
 * Memory entries store learned patterns, task history, and solutions.
 * Each entry has a unique MemoryId for retrieval and management.
 *
 * **Used for:**
 * - Vector database entry keys
 * - Pattern storage in ReasoningBank
 * - Task history retrieval
 * - Cache keys in memory system
 *
 * @example
 * ```typescript
 * const memoryId: MemoryId = createMemoryId('mem-auth-pattern');
 * const entry = await memory.retrieve(memoryId);
 * ```
 *
 * @see {@link createMemoryId} to create new MemoryIds
 * @public
 */
export type MemoryId = Branded<string, 'MemoryId'>;

/**
 * Unique identifier for learned patterns
 *
 * Patterns are reusable solutions learned from successful task outcomes.
 * Each pattern has a unique PatternId stored in ReasoningBank.
 *
 * **Used in:**
 * - ReasoningBank 4-step learning pipeline
 * - Vector search for similar patterns
 * - Pattern matching and retrieval
 *
 * @example
 * ```typescript
 * const patternId: PatternId = createPatternId('pattern-jwt-auth');
 * const pattern = await reasoningBank.getPattern(patternId);
 * ```
 *
 * @see {@link createPatternId} to create new PatternIds
 * @see {@link Pattern} for pattern data type
 * @public
 */
export type PatternId = Branded<string, 'PatternId'>;

/**
 * Unique identifier for learning trajectories
 *
 * Trajectories record complete execution paths with outcomes for learning.
 * Each trajectory has a unique TrajectoryId for tracking and analysis.
 *
 * **Used in:**
 * - Recording agent execution paths
 * - Learning trajectory analysis
 * - Outcome tracking and feedback
 *
 * @example
 * ```typescript
 * const trajId: TrajectoryId = createTrajectoryId('traj-' + Date.now());
 * const trajectory = await reasoningBank.getTrajectory(trajId);
 * ```
 *
 * @see {@link createTrajectoryId} to create new TrajectoryIds
 * @see {@link Trajectory} for trajectory data type
 * @public
 */
export type TrajectoryId = Branded<string, 'TrajectoryId'>;

/**
 * Unique identifier for security findings
 *
 * Findings represent detected vulnerabilities or issues from security scans.
 * Each finding has a unique FindingId for tracking and remediation.
 *
 * @example
 * ```typescript
 * const findingId: FindingId = createFindingId('finding-xss-001');
 * const finding = await securityAudit.getFinding(findingId);
 * ```
 *
 * @see {@link createFindingId} to create new FindingIds
 * @public
 */
export type FindingId = Branded<string, 'FindingId'>;

/**
 * Unique identifier for configurations
 *
 * Configurations are settings objects (agent config, memory config, etc.).
 * Each config has a unique ConfigId for management and versioning.
 *
 * @example
 * ```typescript
 * const configId: ConfigId = createConfigId('config-v1.2.0');
 * const config = await configRegistry.getConfig(configId);
 * ```
 *
 * @see {@link createConfigId} to create new ConfigIds
 * @public
 */
export type ConfigId = Branded<string, 'ConfigId'>;

/**
 * Unique identifier for workflows
 *
 * Workflows are sequences of tasks or steps. Each workflow has a unique
 * WorkflowId for execution tracking and coordination.
 *
 * @example
 * ```typescript
 * const workflowId: WorkflowId = createWorkflowId('workflow-feature-branch');
 * await executeWorkflow(workflowId);
 * ```
 *
 * @see {@link createWorkflowId} to create new WorkflowIds
 * @public
 */
export type WorkflowId = Branded<string, 'WorkflowId'>;

/**
 * Unique identifier for tools
 *
 * Tools are functions or capabilities agents can use. Each tool has a
 * unique ToolId for registration and access control.
 *
 * @example
 * ```typescript
 * const toolId: ToolId = createToolId('tool-typescript-compiler');
 * const tool = await toolRegistry.getTool(toolId);
 * ```
 *
 * @see {@link createToolId} to create new ToolIds
 * @see {@link Tool} for tool definition type
 * @public
 */
export type ToolId = Branded<string, 'ToolId'>;

// ============================================
// Helper Functions for ID Creation
// ============================================

/**
 * Create an AgentId from a string identifier
 *
 * Factory function for creating branded agent identifiers. Wraps the string
 * in a type-safe AgentId that cannot be accidentally converted to other ID types.
 *
 * **Recommended ID Format:**
 * - Lowercase with hyphens: `agent-coder-1`, `agent-tester-main`
 * - Descriptive: Include the agent type or role
 * - Globally unique: Add namespace or timestamp if needed
 *
 * @param id The agent identifier string (e.g., 'agent-coder-1')
 * @returns Branded AgentId that can be used in type-safe agent functions
 *
 * @example
 * ```typescript
 * // Create an agent ID
 * const agentId = createAgentId('agent-coder-1');
 *
 * // Use in type-safe functions
 * function getAgent(id: AgentId): Agent { }
 * const agent = getAgent(agentId); // ✅ Type-safe
 *
 * // Cannot be mixed with other ID types
 * const taskId: TaskId = agentId; // ❌ COMPILE ERROR
 * ```
 *
 * @see {@link brand} for the underlying branding mechanism
 * @see {@link AgentId} for the branded type
 * @public
 */
export function createAgentId(id: string): AgentId {
  return brand<string, 'AgentId'>(id);
}

/**
 * Create a TaskId from a string identifier
 *
 * Factory function for creating branded task identifiers. Ensures task IDs
 * cannot be accidentally used as agent IDs or other entity IDs.
 *
 * **Recommended ID Format:**
 * - Lowercase with hyphens: `task-implement-auth`, `task-fix-123`
 * - Descriptive: Include what the task accomplishes
 * - Trackable: Include date or sequence number if needed
 *
 * @param id The task identifier string
 * @returns Branded TaskId
 *
 * @example
 * ```typescript
 * const taskId = createTaskId('task-implement-auth-feature');
 * ```
 *
 * @see {@link TaskId} for the branded type
 * @public
 */
export function createTaskId(id: string): TaskId {
  return brand<string, 'TaskId'>(id);
}

/**
 * Create a SwarmId from a string identifier
 *
 * Factory function for creating branded swarm identifiers. Swarms are
 * coordinated groups of agents, each with a unique identifier.
 *
 * @param id The swarm identifier string
 * @returns Branded SwarmId
 *
 * @example
 * ```typescript
 * const swarmId = createSwarmId('swarm-feature-development');
 * ```
 *
 * @see {@link SwarmId} for the branded type
 * @public
 */
export function createSwarmId(id: string): SwarmId {
  return brand<string, 'SwarmId'>(id);
}

/**
 * Create a SessionId from a string identifier
 *
 * Factory function for creating branded session identifiers. Sessions track
 * persistent interactions and state that must be recovered on reconnection.
 *
 * **Recommended ID Format:**
 * - Include timestamp: `session-20260126-123456`
 * - Include user/context: `session-user-alice-123`
 * - UUID or nanoid: `session-${nanoid()}`
 *
 * @param id The session identifier string
 * @returns Branded SessionId
 *
 * @example
 * ```typescript
 * const sessionId = createSessionId(`session-${Date.now()}`);
 * ```
 *
 * @see {@link SessionId} for the branded type
 * @public
 */
export function createSessionId(id: string): SessionId {
  return brand<string, 'SessionId'>(id);
}

/**
 * Create a MemoryId from a string identifier
 *
 * Factory function for creating branded memory entry identifiers. Memory IDs
 * are used as keys in the vector database for retrieval and management.
 *
 * @param id The memory identifier string
 * @returns Branded MemoryId
 *
 * @example
 * ```typescript
 * const memoryId = createMemoryId('mem-auth-jwt-pattern');
 * ```
 *
 * @see {@link MemoryId} for the branded type
 * @see {@link MemoryEntry} for what's stored under a MemoryId
 * @public
 */
export function createMemoryId(id: string): MemoryId {
  return brand<string, 'MemoryId'>(id);
}

/**
 * Create a PatternId from a string identifier
 *
 * Factory function for creating branded pattern identifiers. Patterns are
 * reusable solutions stored in ReasoningBank for future use.
 *
 * @param id The pattern identifier string (e.g., 'pattern-jwt-auth')
 * @returns Branded PatternId
 *
 * @example
 * ```typescript
 * const patternId = createPatternId('pattern-jwt-refresh-tokens');
 * const pattern = await reasoningBank.retrieve(patternId);
 * ```
 *
 * @see {@link PatternId} for the branded type
 * @see {@link Pattern} for pattern data structure
 * @public
 */
export function createPatternId(id: string): PatternId {
  return brand<string, 'PatternId'>(id);
}

/**
 * Create a TrajectoryId from a string identifier
 *
 * Factory function for creating branded trajectory identifiers. Trajectories
 * record complete execution paths for learning and analysis.
 *
 * **Recommended ID Format:**
 * - Include timestamp: `trajectory-20260126-task-123`
 * - Sequential: `trajectory-1`, `trajectory-2`
 * - Hierarchical: `traj-swarm-1-task-2-step-3`
 *
 * @param id The trajectory identifier string
 * @returns Branded TrajectoryId
 *
 * @example
 * ```typescript
 * const trajId = createTrajectoryId(`traj-${Date.now()}-${taskId}`);
 * ```
 *
 * @see {@link TrajectoryId} for the branded type
 * @see {@link Trajectory} for trajectory data structure
 * @public
 */
export function createTrajectoryId(id: string): TrajectoryId {
  return brand<string, 'TrajectoryId'>(id);
}

/**
 * Create a FindingId from a string identifier
 *
 * Factory function for creating branded security finding identifiers. Findings
 * track detected vulnerabilities for remediation and tracking.
 *
 * @param id The finding identifier string (e.g., 'finding-xss-001')
 * @returns Branded FindingId
 *
 * @example
 * ```typescript
 * const findingId = createFindingId('finding-path-traversal-001');
 * ```
 *
 * @see {@link FindingId} for the branded type
 * @public
 */
export function createFindingId(id: string): FindingId {
  return brand<string, 'FindingId'>(id);
}

/**
 * Create a ConfigId from a string identifier
 *
 * Factory function for creating branded configuration identifiers. Config IDs
 * track different configuration versions and deployments.
 *
 * **Recommended ID Format:**
 * - Semantic versioning: `config-v1.0.0`, `config-v1.2.3-beta`
 * - Environment: `config-prod`, `config-staging`, `config-dev`
 * - Timestamp: `config-20260126-prod`
 *
 * @param id The configuration identifier string
 * @returns Branded ConfigId
 *
 * @example
 * ```typescript
 * const configId = createConfigId('config-v1.2.0');
 * ```
 *
 * @see {@link ConfigId} for the branded type
 * @public
 */
export function createConfigId(id: string): ConfigId {
  return brand<string, 'ConfigId'>(id);
}

/**
 * Create a WorkflowId from a string identifier
 *
 * Factory function for creating branded workflow identifiers. Workflows
 * represent sequences of tasks or coordinated actions.
 *
 * @param id The workflow identifier string
 * @returns Branded WorkflowId
 *
 * @example
 * ```typescript
 * const workflowId = createWorkflowId('workflow-feature-implementation');
 * ```
 *
 * @see {@link WorkflowId} for the branded type
 * @public
 */
export function createWorkflowId(id: string): WorkflowId {
  return brand<string, 'WorkflowId'>(id);
}

/**
 * Create a ToolId from a string identifier
 *
 * Factory function for creating branded tool identifiers. Tool IDs reference
 * capabilities that agents can use or provide.
 *
 * **Recommended ID Format:**
 * - Lowercase with hyphens: `tool-typescript-compiler`
 * - Include version if needed: `tool-eslint-8.0`
 * - Descriptive: `tool-git-operations`, `tool-file-read`
 *
 * @param id The tool identifier string
 * @returns Branded ToolId
 *
 * @example
 * ```typescript
 * const toolId = createToolId('tool-typescript-compiler');
 * const tool = toolRegistry.get(toolId);
 * ```
 *
 * @see {@link ToolId} for the branded type
 * @see {@link Tool} for tool definition type
 * @public
 */
export function createToolId(id: string): ToolId {
  return brand<string, 'ToolId'>(id);
}

// ============================================
// Timestamp Type
// ============================================

/**
 * Unix timestamp in milliseconds with branded type safety
 *
 * Represents a point in time as milliseconds since Unix epoch (January 1, 1970, 00:00:00 UTC).
 * Using a branded type prevents accidental mixing of timestamps with other numeric values
 * like Percentage or Confidence scores.
 *
 * **Type Safety:** Cannot be accidentally used where Percentage or other numeric types are expected.
 *
 * @example
 * ```typescript
 * // Create current timestamp
 * const now = createTimestamp();
 * console.log(now); // 1705027200000
 *
 * // Create from specific time
 * const midnight = createTimestamp(new Date('2026-01-26').getTime());
 * ```
 *
 * @see {@link createTimestamp} to create new Timestamps
 * @public
 */
export type Timestamp = Branded<number, 'Timestamp'>;

/**
 * Create a Timestamp representing the current or specified time
 *
 * Creates a branded timestamp value. If no parameter is provided, returns the current time
 * via `Date.now()`. This ensures timestamps are properly typed and cannot be accidentally
 * confused with other numeric values.
 *
 * **When to use:**
 * - Recording event times (task creation, completion, learning, etc.)
 * - Tracking temporal sequences in trajectories
 * - Comparing event ordering
 * - Measuring durations with `timestamp2 - timestamp1`
 *
 * @param ms Optional specific timestamp in milliseconds. If not provided, defaults to current time
 * @returns Branded Timestamp value in milliseconds
 *
 * @example
 * ```typescript
 * // Current time
 * const now = createTimestamp();
 *
 * // Specific time
 * const epoch = createTimestamp(0);
 *
 * // From JavaScript Date
 * const specificTime = createTimestamp(new Date('2026-01-26').getTime());
 *
 * // Calculate duration
 * const start = createTimestamp();
 * // ... do work ...
 * const end = createTimestamp();
 * const durationMs = end - start; // ✅ Timestamps are just numbers at runtime
 * ```
 *
 * @see {@link Timestamp} for the branded type
 * @public
 */
export function createTimestamp(ms?: number): Timestamp {
  return brand<number, 'Timestamp'>(ms ?? Date.now());
}

// ============================================
// Semantic Types (Constrained Values)
// ============================================

/**
 * Percentage value constrained to 0-100 range
 *
 * Branded type representing a percentage (0% = 0, 100% = 100).
 * Cannot be accidentally used where Confidence (0-1) or other numeric types are expected.
 *
 * **Use Cases:**
 * - Progress indicators (0-100%)
 * - Completion rates
 * - Resource utilization percentages
 * - Error rates (0-100%)
 *
 * @example
 * ```typescript
 * // Create percentages
 * const progress = createPercentage(50); // 50%
 * const complete = createPercentage(100); // 100%
 *
 * // Cannot create invalid values
 * const invalid = createPercentage(150); // ❌ Error: must be 0-100
 * ```
 *
 * @see {@link createPercentage} to create new Percentages
 * @public
 */
export type Percentage = Branded<number, 'Percentage'>;

/**
 * Create a Percentage value with range validation
 *
 * Creates a branded percentage value. The value is validated to be between 0 and 100 (inclusive).
 * Invalid values throw an error immediately, ensuring all Percentage values are in valid range.
 *
 * **Validation:**
 * - Must be >= 0
 * - Must be <= 100
 * - Throws error if outside range
 * - Supports decimal values: 50.5 is valid (50.5%)
 *
 * @param value Percentage value between 0 and 100 (inclusive)
 * @returns Branded Percentage value
 *
 * @throws {Error} If value < 0 or value > 100
 *
 * @example
 * ```typescript
 * // Valid percentages
 * const half = createPercentage(50);
 * const quarter = createPercentage(25.5);
 * const full = createPercentage(100);
 *
 * // Invalid percentages - throw errors
 * createPercentage(-1);   // ❌ Error: Percentage must be between 0-100
 * createPercentage(101);  // ❌ Error: Percentage must be between 0-100
 * createPercentage(150);  // ❌ Error: Percentage must be between 0-100
 * ```
 *
 * @see {@link Percentage} for the branded type
 * @see {@link Confidence} for confidence scores (0-1 range instead)
 * @public
 */
export function createPercentage(value: number): Percentage {
  if (value < 0 || value > 100) {
    throw new Error(`Percentage must be between 0-100, got ${value}`);
  }
  return brand<number, 'Percentage'>(value);
}

/**
 * Confidence score constrained to 0-1 range
 *
 * Branded type representing a confidence or probability score from 0.0 (no confidence)
 * to 1.0 (complete confidence). Cannot be accidentally used where Percentage (0-100)
 * or other numeric types are expected.
 *
 * **Use Cases:**
 * - Model confidence scores
 * - Probability estimates
 * - Quality metrics (0.0 = lowest, 1.0 = highest)
 * - Type guard confidence levels
 * - Agent health scores
 *
 * @example
 * ```typescript
 * // Create confidence scores
 * const high = createConfidence(0.95);   // 95% confident
 * const medium = createConfidence(0.5);  // 50% confident
 * const low = createConfidence(0.1);     // 10% confident
 *
 * // Cannot create invalid values
 * const invalid = createConfidence(1.5); // ❌ Error: must be 0-1
 * ```
 *
 * @see {@link createConfidence} to create new Confidence scores
 * @public
 */
export type Confidence = Branded<number, 'Confidence'>;

/**
 * Create a Confidence score with range validation
 *
 * Creates a branded confidence value. The value is validated to be between 0.0 and 1.0 (inclusive).
 * Invalid values throw an error immediately, ensuring all Confidence values are in valid range.
 *
 * **Validation:**
 * - Must be >= 0.0
 * - Must be <= 1.0
 * - Throws error if outside range
 * - Supports 3+ decimal places: 0.951 is valid
 *
 * **Common Confidence Levels:**
 * - 0.95-1.0: Very high confidence
 * - 0.80-0.95: High confidence
 * - 0.60-0.80: Medium confidence
 * - 0.30-0.60: Low confidence
 * - 0.0-0.30: Very low confidence
 *
 * @param value Confidence score between 0.0 and 1.0 (inclusive)
 * @returns Branded Confidence value
 *
 * @throws {Error} If value < 0.0 or value > 1.0
 *
 * @example
 * ```typescript
 * // Valid confidence scores
 * const certain = createConfidence(1.0);
 * const likely = createConfidence(0.85);
 * const uncertain = createConfidence(0.45);
 * const unlikely = createConfidence(0.05);
 *
 * // Invalid confidence scores - throw errors
 * createConfidence(-0.1);  // ❌ Error: Confidence must be between 0-1
 * createConfidence(1.1);   // ❌ Error: Confidence must be between 0-1
 * createConfidence(2.0);   // ❌ Error: Confidence must be between 0-1
 * ```
 *
 * @see {@link Confidence} for the branded type
 * @see {@link Percentage} for percentage values (0-100 range instead)
 * @public
 */
export function createConfidence(value: number): Confidence {
  if (value < 0 || value > 1) {
    throw new Error(`Confidence must be between 0-1, got ${value}`);
  }
  return brand<number, 'Confidence'>(value);
}

/**
 * Semantic version string with branded type safety
 *
 * Branded type representing a semantic version following SemVer 2.0.0 format.
 * Format: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`
 *
 * **Examples:**
 * - `1.0.0` - Initial release
 * - `1.2.3` - Patch version
 * - `2.0.0-beta.1` - Beta pre-release
 * - `1.5.0+build.123` - With build metadata
 *
 * @example
 * ```typescript
 * // Valid semantic versions
 * const v1 = createSemanticVersion('1.0.0');
 * const v2 = createSemanticVersion('2.3.4');
 * const beta = createSemanticVersion('1.0.0-beta.1');
 * const build = createSemanticVersion('1.0.0+build.123');
 *
 * // Invalid - throw errors
 * createSemanticVersion('1.0'); // ❌ Missing patch version
 * createSemanticVersion('1.0.0.0'); // ❌ Too many parts
 * ```
 *
 * @see {@link createSemanticVersion} to create new SemanticVersions
 * @see https://semver.org/ for SemVer specification
 * @public
 */
export type SemanticVersion = Branded<string, 'SemanticVersion'>;

/**
 * Create a SemanticVersion with format validation
 *
 * Creates a branded semantic version value. The version string must follow
 * the SemVer 2.0.0 specification format.
 *
 * **Format Rules:**
 * - MAJOR, MINOR, PATCH are required decimal numbers
 * - Format: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`
 * - Prerelease (optional): hyphen followed by alphanumeric and hyphens
 * - Build metadata (optional): plus followed by alphanumeric and hyphens
 * - Example: `1.2.3-alpha.1+build.456`
 *
 * @param version Version string in SemVer format (e.g., "1.2.3")
 * @returns Branded SemanticVersion value
 *
 * @throws {Error} If version string doesn't match SemVer 2.0.0 format
 *
 * @example
 * ```typescript
 * // Valid semantic versions
 * const stable = createSemanticVersion('1.0.0');
 * const feature = createSemanticVersion('1.5.2');
 * const prerelease = createSemanticVersion('2.0.0-alpha');
 * const fullFormat = createSemanticVersion('1.2.3-rc.1+build.123');
 *
 * // Invalid versions - throw errors
 * createSemanticVersion('1.0');              // ❌ Missing patch
 * createSemanticVersion('v1.0.0');           // ❌ Starts with 'v'
 * createSemanticVersion('1.0.0-');           // ❌ Empty prerelease
 * createSemanticVersion('latest');           // ❌ Not numeric
 * ```
 *
 * @see {@link SemanticVersion} for the branded type
 * @see https://semver.org/ for complete SemVer specification
 * @public
 */
export function createSemanticVersion(version: string): SemanticVersion {
  // Validate format: major.minor.patch[-prerelease][+build]
  // Allows: 1.0.0, 1.0.0-alpha, 1.0.0+build, 1.0.0-alpha.1+build.123
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?(\+[a-zA-Z0-9]+)?$/;
  if (!semverRegex.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return brand<string, 'SemanticVersion'>(version);
}
