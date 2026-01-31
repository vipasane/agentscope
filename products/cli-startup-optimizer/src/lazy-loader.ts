/**
 * @file Lazy Module Loader
 * @description Core lazy loading system for dynamic module imports
 *
 * Implements Phase 1 lazy loading architecture to reduce CLI startup time
 * from 1,549ms to target <800ms through on-demand module loading.
 *
 * Key Features:
 * - Dynamic import() wrapper with registry
 * - Module dependency tracking
 * - Load time instrumentation
 * - Error handling with fallbacks
 * - Preload hints for predictable modules
 *
 * @module cli-startup-optimizer/lazy-loader
 */

/**
 * Statistics for loaded modules
 */
export interface ModuleStats {
  /** Total number of module loads initiated */
  totalLoads: number;
  /** Number of cache hits (already loaded) */
  cacheHits: number;
  /** Average load time in ms */
  averageLoadTime: number;
  /** Slowest module loaded */
  slowestModule: { path: string; time: number } | null;
  /** All module load times */
  loadTimes: Map<string, number>;
}

/**
 * Module load options
 */
export interface LoadOptions {
  /** Enable timing instrumentation */
  track?: boolean;
  /** Timeout in ms (default: 5000) */
  timeout?: number;
  /** Retry count on failure (default: 0) */
  retry?: number;
  /** Preload hint (load in background) */
  preload?: boolean;
}

/**
 * Module metadata for tracking
 */
interface ModuleMetadata {
  /** Module path */
  path: string;
  /** Load promise */
  promise: Promise<any>;
  /** Load start time */
  startTime: number;
  /** Load end time */
  endTime?: number;
  /** Load duration */
  duration?: number;
  /** Error if failed */
  error?: Error;
}

/**
 * Lazy Module Registry
 *
 * Central registry for dynamic module imports with tracking and optimization.
 *
 * @example
 * ```typescript
 * const registry = new LazyModuleRegistry();
 *
 * // Load module on-demand
 * const { someFunction } = await registry.load('./commands/spawn');
 *
 * // Get statistics
 * const stats = registry.getStats();
 * console.log(`Average load time: ${stats.averageLoadTime}ms`);
 * ```
 */
export class LazyModuleRegistry {
  private modules = new Map<string, Promise<any>>();
  private metadata = new Map<string, ModuleMetadata>();
  private loadCount = 0;
  private cacheHitCount = 0;

  /**
   * Load a module dynamically
   *
   * @template T The module export type
   * @param modulePath - Path to module (relative or absolute)
   * @param options - Load options
   * @returns Promise resolving to module exports
   *
   * @example
   * ```typescript
   * // Load command module
   * const command = await registry.load<CommandModule>('./commands/agent');
   *
   * // Load with timeout
   * const module = await registry.load('./heavy-module', { timeout: 3000 });
   * ```
   */
  async load<T = any>(modulePath: string, options: LoadOptions = {}): Promise<T> {
    const { track = true, timeout = 5000, retry = 0, preload = false } = options;

    // Check if already loading/loaded
    if (this.modules.has(modulePath)) {
      this.cacheHitCount++;

      // Wait for existing load
      const existingPromise = this.modules.get(modulePath)!;

      // Apply timeout
      if (timeout > 0) {
        return await this.withTimeout(existingPromise, timeout, modulePath);
      }

      return await existingPromise;
    }

    // Start new load
    this.loadCount++;
    const startTime = performance.now();

    // Create load promise
    const loadPromise = this.executeLoad<T>(modulePath, retry);

    // Store in registry
    this.modules.set(modulePath, loadPromise);

    // Track metadata
    if (track) {
      this.metadata.set(modulePath, {
        path: modulePath,
        promise: loadPromise,
        startTime
      });
    }

    try {
      // Execute load with timeout
      const result = timeout > 0
        ? await this.withTimeout(loadPromise, timeout, modulePath)
        : await loadPromise;

      // Update metadata
      if (track) {
        const endTime = performance.now();
        const meta = this.metadata.get(modulePath)!;
        meta.endTime = endTime;
        meta.duration = endTime - startTime;
      }

      return result;
    } catch (error) {
      // Record error
      if (track && this.metadata.has(modulePath)) {
        const meta = this.metadata.get(modulePath)!;
        meta.error = error as Error;
        meta.endTime = performance.now();
        meta.duration = meta.endTime - startTime;
      }

      // Remove failed load from registry
      this.modules.delete(modulePath);

      throw error;
    }
  }

  /**
   * Execute module load with retry logic
   */
  private async executeLoad<T>(modulePath: string, retry: number): Promise<T> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= retry) {
      try {
        // Dynamic import
        const module = await import(modulePath);
        return module as T;
      } catch (error) {
        lastError = error as Error;
        attempts++;

        if (attempts <= retry) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(100 * Math.pow(2, attempts - 1), 1000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed to load module: ${modulePath}`);
  }

  /**
   * Wrap promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    modulePath: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Module load timeout: ${modulePath} (${timeoutMs}ms)`)),
          timeoutMs
        )
      )
    ]);
  }

  /**
   * Preload modules in background
   *
   * Loads modules without blocking, useful for predictable patterns.
   *
   * @param modulePaths - Array of module paths to preload
   * @param options - Load options
   *
   * @example
   * ```typescript
   * // Preload common command modules
   * registry.preload([
   *   './commands/agent',
   *   './commands/swarm',
   *   './commands/memory'
   * ]);
   * ```
   */
  preload(modulePaths: string[], options: LoadOptions = {}): void {
    for (const path of modulePaths) {
      // Don't await - run in background
      this.load(path, { ...options, preload: true }).catch(error => {
        // Silent failure for preload
        console.warn(`Preload failed for ${path}:`, error.message);
      });
    }
  }

  /**
   * Get module load statistics
   *
   * @returns Statistics about loaded modules
   *
   * @example
   * ```typescript
   * const stats = registry.getStats();
   * console.log(`Cache hit rate: ${(stats.cacheHits / stats.totalLoads * 100).toFixed(1)}%`);
   * console.log(`Avg load time: ${stats.averageLoadTime.toFixed(1)}ms`);
   * ```
   */
  getStats(): ModuleStats {
    const loadTimes = new Map<string, number>();
    let totalTime = 0;
    let validCount = 0;

    for (const [path, meta] of this.metadata.entries()) {
      if (meta.duration !== undefined && !meta.error) {
        loadTimes.set(path, meta.duration);
        totalTime += meta.duration;
        validCount++;
      }
    }

    const averageLoadTime = validCount > 0 ? totalTime / validCount : 0;

    // Find slowest module
    let slowestModule: { path: string; time: number } | null = null;
    for (const [path, time] of loadTimes.entries()) {
      if (!slowestModule || time > slowestModule.time) {
        slowestModule = { path, time };
      }
    }

    return {
      totalLoads: this.loadCount,
      cacheHits: this.cacheHitCount,
      averageLoadTime,
      slowestModule,
      loadTimes
    };
  }

  /**
   * Get load time for a specific module
   *
   * @param modulePath - Module path
   * @returns Load time in ms, or undefined if not loaded
   */
  getLoadTime(modulePath: string): number | undefined {
    return this.metadata.get(modulePath)?.duration;
  }

  /**
   * Check if module is loaded
   *
   * @param modulePath - Module path
   * @returns True if module is loaded
   */
  isLoaded(modulePath: string): boolean {
    return this.modules.has(modulePath);
  }

  /**
   * Get all loaded module paths
   *
   * @returns Array of loaded module paths
   */
  getLoadedModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Clear the registry
   *
   * Removes all cached modules. Use with caution.
   */
  clear(): void {
    this.modules.clear();
    this.metadata.clear();
    this.loadCount = 0;
    this.cacheHitCount = 0;
  }

  /**
   * Get cache hit rate
   *
   * @returns Cache hit rate as decimal (0-1)
   */
  getCacheHitRate(): number {
    return this.loadCount > 0 ? this.cacheHitCount / this.loadCount : 0;
  }

  /**
   * Export statistics for external monitoring
   *
   * @returns JSON-serializable statistics
   */
  exportStats(): {
    totalLoads: number;
    cacheHits: number;
    cacheHitRate: number;
    averageLoadTime: number;
    moduleCount: number;
    slowestModule: { path: string; time: number } | null;
    loadTimes: Record<string, number>;
  } {
    const stats = this.getStats();

    return {
      totalLoads: stats.totalLoads,
      cacheHits: stats.cacheHits,
      cacheHitRate: this.getCacheHitRate(),
      averageLoadTime: stats.averageLoadTime,
      moduleCount: this.modules.size,
      slowestModule: stats.slowestModule,
      loadTimes: Object.fromEntries(stats.loadTimes)
    };
  }
}

/**
 * Global lazy module registry instance
 *
 * Single instance for application-wide use.
 */
export const globalRegistry = new LazyModuleRegistry();

/**
 * Convenience function to load module using global registry
 *
 * @template T The module export type
 * @param modulePath - Path to module
 * @param options - Load options
 * @returns Promise resolving to module exports
 *
 * @example
 * ```typescript
 * const { spawnCommand } = await lazyLoad('./commands/spawn');
 * ```
 */
export async function lazyLoad<T = any>(
  modulePath: string,
  options?: LoadOptions
): Promise<T> {
  return globalRegistry.load<T>(modulePath, options);
}

/**
 * Get global registry statistics
 *
 * @returns Module load statistics
 */
export function getGlobalStats(): ModuleStats {
  return globalRegistry.getStats();
}
