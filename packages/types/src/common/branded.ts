/**
 * @claude-flow/types - Branded Types
 *
 * Provides compile-time distinct types for IDs and other values
 * using TypeScript's opaque type pattern. Prevents accidental mixing
 * of different ID types while maintaining type safety.
 *
 * @module types/common/branded
 */

/**
 * Helper to create branded types
 *
 * Creates a unique type that cannot be accidentally converted
 * between similar types (e.g., TaskId vs AgentId)
 *
 * @template T The base type
 * @template Brand The brand identifier
 *
 * @example
 * ```typescript
 * type UserId = Branded<string, 'UserId'>;
 *
 * function getUser(id: UserId): User {
 *   // Can only accept UserId, not string or other branded types
 * }
 *
 * const id = 'user-123' as UserId;
 * getUser(id); // OK
 * getUser('user-123'); // Error: string not assignable to UserId
 * ```
 */
export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/**
 * Helper function to create branded values
 *
 * @template T The base type
 * @template Brand The brand identifier
 * @param value The value to brand
 * @returns The branded value
 */
export function brand<T, Brand extends string>(value: T): Branded<T, Brand> {
  return value as Branded<T, Brand>;
}

// ============================================
// ID Types (Branded Strings)
// ============================================

/** Unique identifier for agents */
export type AgentId = Branded<string, 'AgentId'>;

/** Unique identifier for tasks */
export type TaskId = Branded<string, 'TaskId'>;

/** Unique identifier for swarms */
export type SwarmId = Branded<string, 'SwarmId'>;

/** Unique identifier for sessions */
export type SessionId = Branded<string, 'SessionId'>;

/** Unique identifier for memory entries */
export type MemoryId = Branded<string, 'MemoryId'>;

/** Unique identifier for patterns */
export type PatternId = Branded<string, 'PatternId'>;

/** Unique identifier for trajectories */
export type TrajectoryId = Branded<string, 'TrajectoryId'>;

/** Unique identifier for findings */
export type FindingId = Branded<string, 'FindingId'>;

/** Unique identifier for configurations */
export type ConfigId = Branded<string, 'ConfigId'>;

/** Unique identifier for workflows */
export type WorkflowId = Branded<string, 'WorkflowId'>;

/** Unique identifier for tools */
export type ToolId = Branded<string, 'ToolId'>;

// ============================================
// Helper Functions for ID Creation
// ============================================

/**
 * Create an AgentId
 *
 * @param id The agent identifier
 * @returns Branded AgentId
 */
export function createAgentId(id: string): AgentId {
  return brand<string, 'AgentId'>(id);
}

/**
 * Create a TaskId
 *
 * @param id The task identifier
 * @returns Branded TaskId
 */
export function createTaskId(id: string): TaskId {
  return brand<string, 'TaskId'>(id);
}

/**
 * Create a SwarmId
 *
 * @param id The swarm identifier
 * @returns Branded SwarmId
 */
export function createSwarmId(id: string): SwarmId {
  return brand<string, 'SwarmId'>(id);
}

/**
 * Create a SessionId
 *
 * @param id The session identifier
 * @returns Branded SessionId
 */
export function createSessionId(id: string): SessionId {
  return brand<string, 'SessionId'>(id);
}

/**
 * Create a MemoryId
 *
 * @param id The memory identifier
 * @returns Branded MemoryId
 */
export function createMemoryId(id: string): MemoryId {
  return brand<string, 'MemoryId'>(id);
}

/**
 * Create a PatternId
 *
 * @param id The pattern identifier
 * @returns Branded PatternId
 */
export function createPatternId(id: string): PatternId {
  return brand<string, 'PatternId'>(id);
}

/**
 * Create a TrajectoryId
 *
 * @param id The trajectory identifier
 * @returns Branded TrajectoryId
 */
export function createTrajectoryId(id: string): TrajectoryId {
  return brand<string, 'TrajectoryId'>(id);
}

/**
 * Create a FindingId
 *
 * @param id The finding identifier
 * @returns Branded FindingId
 */
export function createFindingId(id: string): FindingId {
  return brand<string, 'FindingId'>(id);
}

/**
 * Create a ConfigId
 *
 * @param id The configuration identifier
 * @returns Branded ConfigId
 */
export function createConfigId(id: string): ConfigId {
  return brand<string, 'ConfigId'>(id);
}

/**
 * Create a WorkflowId
 *
 * @param id The workflow identifier
 * @returns Branded WorkflowId
 */
export function createWorkflowId(id: string): WorkflowId {
  return brand<string, 'WorkflowId'>(id);
}

/**
 * Create a ToolId
 *
 * @param id The tool identifier
 * @returns Branded ToolId
 */
export function createToolId(id: string): ToolId {
  return brand<string, 'ToolId'>(id);
}

// ============================================
// Timestamp Type
// ============================================

/** Unix timestamp in milliseconds */
export type Timestamp = Branded<number, 'Timestamp'>;

/**
 * Create a Timestamp
 *
 * @param ms Optional milliseconds (defaults to now)
 * @returns Branded Timestamp
 */
export function createTimestamp(ms?: number): Timestamp {
  return brand<number, 'Timestamp'>(ms ?? Date.now());
}

// ============================================
// Semantic Types
// ============================================

/** Percentage value (0-100) */
export type Percentage = Branded<number, 'Percentage'>;

/**
 * Create a Percentage value
 *
 * @param value Value between 0-100
 * @returns Branded Percentage
 * @throws If value is outside 0-100 range
 */
export function createPercentage(value: number): Percentage {
  if (value < 0 || value > 100) {
    throw new Error(`Percentage must be between 0-100, got ${value}`);
  }
  return brand<number, 'Percentage'>(value);
}

/** Confidence score (0-1) */
export type Confidence = Branded<number, 'Confidence'>;

/**
 * Create a Confidence score
 *
 * @param value Value between 0-1
 * @returns Branded Confidence
 * @throws If value is outside 0-1 range
 */
export function createConfidence(value: number): Confidence {
  if (value < 0 || value > 1) {
    throw new Error(`Confidence must be between 0-1, got ${value}`);
  }
  return brand<number, 'Confidence'>(value);
}

/** Semantic version string */
export type SemanticVersion = Branded<string, 'SemanticVersion'>;

/**
 * Create a SemanticVersion
 *
 * @param version Version string (e.g., "1.2.3")
 * @returns Branded SemanticVersion
 */
export function createSemanticVersion(version: string): SemanticVersion {
  // Validate format: major.minor.patch
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?(\+[a-zA-Z0-9]+)?$/;
  if (!semverRegex.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return brand<string, 'SemanticVersion'>(version);
}
