/**
 * Test setup utilities
 */

import { beforeEach, beforeAll } from 'vitest';

export interface TestSetupOptions {
  isolated?: boolean;
  clearEnv?: boolean;
  preserveEnv?: string[];
}

/**
 * Setup isolated test environment
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
 * Create isolated test scope
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
 * Create test logger
 */
export interface TestLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  getLogs: () => string[];
}

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
