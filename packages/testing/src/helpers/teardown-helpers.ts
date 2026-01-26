/**
 * Test teardown utilities
 */

import { afterEach, afterAll } from 'vitest';

export interface TeardownOptions {
  force?: boolean;
  timeout?: number;
  collectMetrics?: boolean;
}

/**
 * Register cleanup function to run in teardown
 */
export function registerCleanup(fn: () => Promise<void> | void): void {
  afterEach(async () => {
    await Promise.resolve(fn());
  });
}

/**
 * Register global cleanup (runs after all tests)
 */
export function registerGlobalCleanup(fn: () => Promise<void> | void): void {
  afterAll(async () => {
    await Promise.resolve(fn());
  });
}

/**
 * Create cleanup manager
 */
export interface CleanupManager {
  add: (fn: () => Promise<void> | void, priority?: number) => void;
  run: (options?: TeardownOptions) => Promise<void>;
  clear: () => void;
}

export function createCleanupManager(): CleanupManager {
  const cleanups: Array<{
    fn: () => Promise<void> | void;
    priority: number;
  }> = [];

  return {
    add: (fn, priority = 0) => {
      cleanups.push({ fn, priority });
      cleanups.sort((a, b) => b.priority - a.priority);
    },

    run: async (options: TeardownOptions = {}) => {
      const { timeout = 5000 } = options;

      for (const { fn } of cleanups) {
        try {
          let cleanup = Promise.resolve(fn());

          if (timeout) {
            cleanup = Promise.race([
              cleanup,
              new Promise<void>((_, reject) =>
                setTimeout(
                  () => reject(new Error('Cleanup timeout')),
                  timeout
                )
              )
            ]);
          }

          await cleanup;
        } catch (error) {
          console.error('Cleanup error:', error);
          if (options.force) {
            // Continue cleanup even on error
            continue;
          }
          throw error;
        }
      }
    },

    clear: () => {
      cleanups.length = 0;
    }
  };
}

/**
 * Cleanup temporary files
 */
export class TempFileCleanup {
  private files: Set<string> = new Set();

  add(filePath: string): void {
    this.files.add(filePath);
  }

  async cleanup(): Promise<void> {
    for (const file of this.files) {
      try {
        // In real implementation, would use fs.unlink
        this.files.delete(file);
      } catch (error) {
        console.error(`Failed to delete temp file ${file}:`, error);
      }
    }
  }
}

/**
 * Reset global state
 */
export interface GlobalStateReset {
  reset: () => void;
  restore: () => void;
}

export function resetGlobalState(): GlobalStateReset {
  const savedState = new Map<string, unknown>();

  return {
    reset: () => {
      // Save and clear global state
      if (typeof global !== 'undefined') {
        const globalObj = global as Record<string, unknown>;
        savedState.set('_previousGlobalState', { ...globalObj });
      }
    },

    restore: () => {
      // Restore previous global state
      if (typeof global !== 'undefined') {
        const previousState = savedState.get('_previousGlobalState') as Record<
          string,
          unknown
        >;
        if (previousState) {
          Object.assign(global, previousState);
        }
      }
    }
  };
}

/**
 * Resource cleanup tracker
 */
export interface ResourceCleanupTracker {
  track: (resource: unknown, cleanup: () => Promise<void> | void) => void;
  cleanupAll: () => Promise<void>;
}

export function createResourceCleanupTracker(): ResourceCleanupTracker {
  const resources: Array<{
    resource: unknown;
    cleanup: () => Promise<void> | void;
  }> = [];

  return {
    track: (resource, cleanup) => {
      resources.push({ resource, cleanup });
    },

    cleanupAll: async () => {
      for (let i = resources.length - 1; i >= 0; i--) {
        try {
          const { cleanup } = resources[i];
          await Promise.resolve(cleanup());
        } catch (error) {
          console.error('Resource cleanup error:', error);
        }
      }
      resources.length = 0;
    }
  };
}

/**
 * Memory cleanup helper
 */
export interface MemoryCleanupResult {
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  delta: Record<string, number>;
}

export async function cleanupAndMeasureMemory(
  cleanup: () => Promise<void> | void
): Promise<MemoryCleanupResult> {
  if (global.gc) {
    global.gc();
  }

  const memoryBefore = process.memoryUsage();

  await Promise.resolve(cleanup());

  if (global.gc) {
    global.gc();
  }

  const memoryAfter = process.memoryUsage();

  const delta = {
    heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
    heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
    external: memoryAfter.external - memoryBefore.external,
    rss: memoryAfter.rss - memoryBefore.rss
  };

  return { memoryBefore, memoryAfter, delta };
}

/**
 * Context-aware cleanup
 */
export class CleanupContext {
  private manager = createCleanupManager();
  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      this.initialized = true;
      registerCleanup(() => this.manager.run());
    }
  }

  add(fn: () => Promise<void> | void, priority?: number): void {
    this.manager.add(fn, priority);
  }

  async cleanup(): Promise<void> {
    await this.manager.run({ force: true });
  }
}

/**
 * Abort controller wrapper for cleanup
 */
export function createAbortableOperation(): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();

  return {
    controller,
    cleanup: () => {
      controller.abort();
    }
  };
}
