/**
 * @claude-flow/types
 *
 * Comprehensive TypeScript type definitions for Claude Flow V3
 *
 * Exports core types for:
 * - Agent architecture (AgentType, Agent, Tool, Capability)
 * - Memory system (MemoryEntry, VectorEmbedding, HNSW indexing)
 * - Security (SecurityFinding, Threat, Validation)
 * - Learning (Trajectory, Pattern, Consolidation)
 * - CLI (Command, Option, OutputFormat)
 * - Common utilities (Result, branded IDs)
 *
 * Zero runtime dependencies - pure TypeScript declarations.
 *
 * @example
 * ```typescript
 * import type {
 *   Agent,
 *   AgentId,
 *   SecurityFinding,
 *   Pattern,
 *   MemoryEntry
 * } from '@claude-flow/types';
 * ```
 *
 * @module types
 */

// Common types - imported first as they're used by others
export * from './common/index.js';

// Domain types
export * from './agent/index.js';
export * from './memory/index.js';
export * from './security/index.js';
export * from './learning/index.js';
export * from './cli/index.js';
