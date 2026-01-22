/**
 * Hook Integration Layer Exports
 * Based on DESIGN-001: Security and Hooks Integration
 */

// Types
export type {
  PreGenerateHookInput,
  PreGenerateHookOutput,
  PostGenerateHookInput,
  PostGenerateHookOutput,
  QualityMetrics,
  HookContext,
  SecurityValidation,
  SecurityIssue,
  GenerationPattern,
  AdaptiveSelection,
  ComponentMapOptions,
} from './types.js';

// Hook Functions
export {
  invokePreGenerateHook,
  invokePostGenerateHook,
  calculateQualityScore,
  generateRequestId,
} from './generator-hooks.js';

// Cache
export { DiagramCache } from './cache.js';
