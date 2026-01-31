/**
 * @file CLI Startup Optimizer
 * @description Entry point for optimized CLI with lazy loading
 *
 * Phase 1 Implementation: Lazy Loading
 * - Target: <800ms startup (1.9x improvement over 1,549ms baseline)
 * - Method: Dynamic imports, minimal bootstrap
 *
 * @module cli-startup-optimizer
 */

export {
  LazyModuleRegistry,
  globalRegistry,
  lazyLoad,
  getGlobalStats,
  type ModuleStats,
  type LoadOptions
} from './lazy-loader.js';

export {
  CLIEntryPoint,
  executeCLI
} from './cli-entry.js';

// Version
export const VERSION = '1.0.0-alpha.1';

// Performance target
export const PERFORMANCE_TARGET = {
  phase1: { startup: 800, memory: 60 },
  phase2: { startup: 500, memory: 50, cacheHitRate: 0.6 },
  phase3: { startup: 350, memory: 45, cacheHitRate: 0.8 },
  phase4: { startup: 280, memory: 40 },
  phase5: { startup: 250, memory: 35, cacheHitRate: 0.9 }
};
