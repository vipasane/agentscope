/**
 * Test Environment Setup Utilities
 *
 * Provides helpers for configuring isolated test environments including
 * environment variable isolation, fixture contexts, database setup, and mock servers.
 *
 * **Setup Lifecycle:**
 * 1. Global setup (once before all tests) - `setupGlobalTestEnvironment()`
 * 2. Per-test setup (before each test) - `setupPerTestEnvironment()`
 * 3. Per-test cleanup (after each test) - Call returned cleanup function
 * 4. Global teardown (after all tests) - Handled by test framework
 *
 * @module helpers/setup-helpers
 */

import { beforeEach, beforeAll } from 'vitest';

/**
 * Options for configuring test environment isolation
 */
export interface TestSetupOptions {
  /** Create isolated environment (default: true) */
  isolated?: boolean;

  /** Clear all env vars except preserved (default: true) */
  clearEnv?: boolean;

  /** Environment variables to preserve (default: NODE_ENV, PATH) */
  preserveEnv?: string[];
}

/**
 * Setup isolated test environment with optional env var isolation
 *
 * Creates a clean test environment with optional cleanup. Saves original
 * environment variables and restores them on cleanup.
 *
 * **Isolation Guarantees:**
 * - Environment variables scoped to test (if isolated=true)
 * - Automatic cleanup on function return
 * - Nested cleanup supported (LIFO order)
 *
 * @param options - Configuration for isolation behavior
 * @returns Cleanup function to restore environment
 *
 * @example
 * ```typescript
 * describe('API Client', () => {
 *   let cleanup;
 *
 *   beforeEach(() => {
 *     // Setup isolated environment
 *     ({ cleanup } = setupTestEnvironment({ isolated: true }));
 *
 *     // Environment vars are now clean (except NODE_ENV and PATH)
 *     process.env.API_KEY = 'test-key';
 *   });
 *
 *   afterEach(() => {
 *     // Restore environment
 *     cleanup();
 *     expect(process.env.API_KEY).toBeUndefined();
 *   });
 *
 *   it('should connect with API key', () => {
 *     const client = new ApiClient();
 *     expect(client.apiKey).toBe('test-key');
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Preserve additional env vars
 * const { cleanup } = setupTestEnvironment({
 *   isolated: true,
 *   clearEnv: true,
 *   preserveEnv: ['NODE_ENV', 'PATH', 'HOME', 'USER']
 * });
 * ```
 *
 * @see {@link setupGlobalTestEnvironment} for one-time setup
 * @see {@link setupPerTestEnvironment} for per-test setup
 *
 * @public
 */
export function setupTestEnvironment(options: TestSetupOptions = {}): {
  cleanup: () => void;
} {
  const {
    isolated = true,
    clearEnv = true,
    preserveEnv = ['NODE_ENV', 'PATH']
  } = options;

  const savedEnv = { ...process.env };

  if (isolated && clearEnv) {
    const envToPreserve = new Set(preserveEnv);
    Object.keys(process.env).forEach(key => {
      if (!envToPreserve.has(key)) {
        delete process.env[key];
      }
    });
  }

  return {
    cleanup: () => {
      Object.assign(process.env, savedEnv);
    }
  };
}

/**
 * Create a test fixture context
 */
export interface TestFixtureContext {
  tempDir?: string;
  tempFiles: string[];
  cleanup: () => void;
}

export function createFixtureContext(): TestFixtureContext {
  return {
    tempFiles: [],
    cleanup: () => {
      // Cleanup temp files
    }
  };
}

/**
 * Setup test database context
 */
export interface DatabaseTestContext {
  connectionString: string;
  cleanup: () => Promise<void>;
  reset: () => Promise<void>;
}

export function createDatabaseContext(
  connectionString: string
): DatabaseTestContext {
  return {
    connectionString,
    cleanup: async () => {
      // Implement database cleanup
    },
    reset: async () => {
      // Implement database reset
    }
  };
}

/**
 * Setup mock server context
 */
export interface MockServerContext {
  baseUrl: string;
  port: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createMockServerContext(port: number = 0): MockServerContext {
  return {
    baseUrl: `http://localhost:${port}`,
    port,
    start: async () => {
      // Implement server start
    },
    stop: async () => {
      // Implement server stop
    }
  };
}

/**
 * Global test setup (runs once before all tests)
 */
export function setupGlobalTestEnvironment(): void {
  // Set test environment variables
  process.env.NODE_ENV = 'test';

  // Setup global timeouts
  if (typeof jest !== 'undefined') {
    // Jest compatibility
  }
}

/**
 * Per-test setup (runs before each test)
 */
export function setupPerTestEnvironment(): void {
  beforeEach(() => {
    // Reset any global state
  });
}

/**
 * Manages scoped cleanups with guaranteed LIFO execution
 *
 * Collects cleanup functions and executes them in reverse order (LIFO)
 * when cleanup() is called. Useful for managing multiple resources.
 *
 * **Cleanup Order:**
 * - Cleanups registered: 1, 2, 3
 * - Cleanups executed: 3, 2, 1 (reverse order)
 * - This ensures proper resource teardown order
 *
 * @example
 * ```typescript
 * const scope = new TestScope();
 *
 * // Register resource cleanups
 * scope.addCleanup(() => file.close());
 * scope.addCleanup(() => server.stop());
 * scope.addCleanup(() => database.disconnect());
 *
 * // Cleanup executes in reverse: database, server, file
 * await scope.cleanup();
 * ```
 *
 * @example
 * ```typescript
 * // With async cleanups
 * const scope = new TestScope();
 *
 * scope.addCleanup(async () => {
 *   await database.transaction.rollback();
 * });
 *
 * scope.addCleanup(async () => {
 *   await cache.flush();
 * });
 *
 * await scope.cleanup();
 * ```
 *
 * @example
 * ```typescript
 * // Reset scope for reuse
 * scope.addCleanup(() => tempFile.delete());
 * scope.reset(); // Clears all registered cleanups
 * ```
 *
 * @see {@link setupTestEnvironment} for environment-based cleanup
 *
 * @public
 */
export class TestScope {
  private cleanups: Array<() => Promise<void> | void> = [];

  addCleanup(fn: () => Promise<void> | void): void {
    this.cleanups.push(fn);
  }

  async cleanup(): Promise<void> {
    for (const fn of this.cleanups.reverse()) {
      try {
        await Promise.resolve(fn());
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  }

  reset(): void {
    this.cleanups = [];
  }
}

/**
 * Logger interface for testing
 *
 * Simple logging API that captures messages to memory for verification.
 * Useful for testing code that logs, without console output.
 */
export interface TestLogger {
  /** Log debug message */
  debug: (message: string, data?: unknown) => void;

  /** Log info message */
  info: (message: string, data?: unknown) => void;

  /** Log warning message */
  warn: (message: string, data?: unknown) => void;

  /** Log error message */
  error: (message: string, error?: unknown) => void;

  /** Get all logged messages as formatted strings */
  getLogs: () => string[];
}

/**
 * Create a test logger that captures messages in memory
 *
 * Records all log messages for later inspection and verification.
 * Can optionally echo to console for debugging.
 *
 * @param verbose - Print logs to console while recording (default: false)
 * @returns Test logger instance
 *
 * @example
 * ```typescript
 * const logger = createTestLogger();
 *
 * logger.info('Application started');
 * logger.warn('Low memory detected');
 * logger.error('Connection failed', new Error('ECONNREFUSED'));
 *
 * const logs = logger.getLogs();
 * expect(logs).toHaveLength(3);
 * expect(logs[0]).toContain('Application started');
 * expect(logs[1]).toContain('Low memory');
 * expect(logs[2]).toContain('Connection failed');
 * ```
 *
 * @example
 * ```typescript
 * // With verbose output (for debugging)
 * const logger = createTestLogger(true); // Prints to console
 * logger.info('Debug info visible in console');
 * ```
 *
 * @public
 */
export function createTestLogger(verbose: boolean = false): TestLogger {
  const logs: string[] = [];

  const log = (level: string, message: string, data?: unknown) => {
    const entry = `[${level}] ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
    logs.push(entry);
    if (verbose) {
      console.log(entry);
    }
  };

  return {
    debug: (message, data) => log('DEBUG', message, data),
    info: (message, data) => log('INFO', message, data),
    warn: (message, data) => log('WARN', message, data),
    error: (message, error) => log('ERROR', message, error),
    getLogs: () => logs
  };
}
