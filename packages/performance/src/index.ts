/**
 * @claude-flow/performance
 * Performance optimization utilities for claude-flow
 *
 * Features:
 * - PerformanceMonitor: Sub-millisecond timing and bottleneck detection
 * - LRUCache: Fast O(1) cache with TTL support
 * - BatchProcessor: Efficient bulk operations
 * - ParallelExecutor: Worker pool for parallel execution
 * - MemoryProfiler: Memory leak detection
 * - BenchmarkRunner: Performance testing utilities
 *
 * @module @claude-flow/performance
 */

// Monitor
export {
  PerformanceMonitor,
  getGlobalMonitor,
  setGlobalMonitor
} from './monitor/performance-monitor';

export {
  BenchmarkRunner,
  type BenchmarkOptions
} from './monitor/benchmark-runner';

// Cache
export {
  LRUCache,
  type LRUCacheOptions
} from './cache/lru-cache';

export {
  BatchProcessor
} from './cache/batch-processor';

// Parallel
export {
  ParallelExecutor
} from './parallel/parallel-executor';

// Profile
export {
  MemoryProfiler,
  getGlobalProfiler,
  setGlobalProfiler
} from './profile/memory-profiler';

// Types
export * from './types';
