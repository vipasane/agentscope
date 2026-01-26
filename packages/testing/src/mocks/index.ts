/**
 * Mock Factories for Claude Flow Components
 *
 * Provides factory functions for creating realistic mocks of agents, memory stores,
 * HTTP clients, event emitters, loggers, and other components commonly used in tests.
 *
 * All mocks:
 * - Support easy creation with optional overrides
 * - Include tracking/history of all operations
 * - Provide reset methods for test isolation
 * - Return friendly APIs for assertions
 *
 * ## Usage Pattern
 *
 * ```typescript
 * import {
 *   createMockAgent,
 *   createMockMemory,
 *   createMockHttpClient,
 *   createMockLogger
 * } from '@claude-flow/testing';
 *
 * describe('My Component', () => {
 *   let agent, memory, http, logger;
 *
 *   beforeEach(() => {
 *     agent = createMockAgent({ type: 'coder' });
 *     memory = createMockMemory();
 *     http = createMockHttpClient();
 *     logger = createMockLogger();
 *   });
 *
 *   it('should work with mocks', () => {
 *     agent.call('execute', 'task');
 *     expect(agent.calls).toHaveLength(1);
 *   });
 * });
 * ```
 *
 * @module mocks
 */

import { MockAgent, AgentCall, MockMemory, PerformanceMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a mock agent for testing agent-dependent code
 *
 * Produces a mock that records all method calls, return values, and errors.
 * Includes utilities to query call history and reset state between tests.
 *
 * **Mock Behavior:**
 * - Each method call is automatically recorded with timing
 * - Generic return value for successful calls (method call string representation)
 * - Errors can be manually recorded but method calls auto-succeed by default
 * - Performance metrics updated on each call
 *
 * @param overrides - Partial MockAgent properties to customize (type, id, etc.)
 * @returns Mock agent instance with recording and query utilities
 *
 * @example
 * ```typescript
 * // Basic creation
 * const agent = createMockAgent();
 * expect(agent.id).toBeDefined();
 * expect(agent.type).toBe('agent');
 *
 * // With overrides
 * const agent = createMockAgent({ type: 'coder' });
 * expect(agent.type).toBe('coder');
 * ```
 *
 * @example
 * ```typescript
 * // Record calls
 * agent.call('execute', 'task-1', 'param2');
 * expect(agent.calls).toHaveLength(1);
 *
 * // Query specific method calls
 * const calls = agent.getCalls('execute');
 * expect(calls[0].method).toBe('execute');
 * expect(calls[0].args).toEqual(['task-1', 'param2']);
 * ```
 *
 * @example
 * ```typescript
 * // Record errors
 * const error = new Error('Task failed');
 * agent.recordError(error);
 *
 * // Query errors
 * expect(agent.errors).toContainEqual(error);
 *
 * // Reset between tests
 * agent.reset();
 * expect(agent.calls).toHaveLength(0);
 * expect(agent.errors).toHaveLength(0);
 * ```
 *
 * @example Anti-Pattern: Assuming mocks persist between tests
 * ```typescript
 * // BAD - don't do this
 * let agent = createMockAgent();
 * it('test 1', () => agent.call('method')); // agent has 1 call
 * it('test 2', () => expect(agent.calls).toHaveLength(0)); // FAILS! agent still has 1 call
 *
 * // GOOD - create per test or reset
 * beforeEach(() => agent = createMockAgent());
 * // or
 * beforeEach(() => agent.reset());
 * ```
 *
 * @see {@link recordCall} for manually recording calls with custom results
 * @see {@link recordError} for recording errors
 * @see {@link getCallCount} for counting calls
 * @see {@link getCalls} for filtering calls by method
 * @see {@link reset} for clearing state between tests
 *
 * @public
 */
export function createMockAgent(
  overrides?: Partial<MockAgent>
): MockAgent & {
  call: (method: string, ...args: unknown[]) => unknown;
  recordCall: (method: string, args: unknown[], result: unknown, duration: number) => void;
  recordError: (error: Error) => void;
  getCallCount: (method?: string) => number;
  getCalls: (method?: string) => AgentCall[];
  reset: () => void;
} {
  const agent: MockAgent = {
    id: uuidv4(),
    type: 'agent',
    inputs: [],
    outputs: [],
    errors: [],
    calls: [],
    performance: {
      startTime: Date.now(),
      calls: 0
    },
    ...overrides
  };

  return {
    ...agent,

    call: (method: string, ...args: unknown[]): unknown => {
      const startTime = Date.now();
      agent.inputs.push({ method, args });

      try {
        const result = `${method}(${args.join(', ')})`;
        agent.outputs.push(result);

        const duration = Date.now() - startTime;
        agent.calls.push({
          id: uuidv4(),
          timestamp: startTime,
          method,
          args,
          result,
          duration
        });

        agent.performance.calls++;
        return result;
      } catch (error) {
        const err = error as Error;
        agent.errors.push(err);
        throw err;
      }
    },

    recordCall: (method: string, args: unknown[], result: unknown, duration: number) => {
      agent.calls.push({
        id: uuidv4(),
        timestamp: Date.now(),
        method,
        args,
        result,
        duration
      });
      agent.performance.calls++;
    },

    recordError: (error: Error) => {
      agent.errors.push(error);
    },

    getCallCount: (method?: string): number => {
      if (!method) return agent.calls.length;
      return agent.calls.filter(call => call.method === method).length;
    },

    getCalls: (method?: string): AgentCall[] => {
      if (!method) return agent.calls;
      return agent.calls.filter(call => call.method === method);
    },

    reset: () => {
      agent.inputs = [];
      agent.outputs = [];
      agent.errors = [];
      agent.calls = [];
      agent.performance = {
        startTime: Date.now(),
        calls: 0
      };
    }
  };
}

/**
 * Create a mock memory store for testing memory-dependent code
 *
 * Simulates the memory store interface with in-memory storage, search functionality,
 * and operation history tracking. No database required.
 *
 * **Mock Behavior:**
 * - Storage is fully in-memory (lost when mock is destroyed)
 * - Searches use simple substring matching on keys and JSON stringified values
 * - All operations are synchronous
 * - Search history recorded for audit and testing
 * - Patterns automatically updated on store operations
 *
 * @returns Mock memory store with full API and tracking
 *
 * @example
 * ```typescript
 * const memory = createMockMemory();
 *
 * // Store data
 * memory.store('user-1', { name: 'John', role: 'admin' });
 *
 * // Retrieve
 * const user = memory.retrieve('user-1');
 * expect(user).toEqual({ name: 'John', role: 'admin' });
 * ```
 *
 * @example
 * ```typescript
 * // Search functionality
 * memory.store('pattern-auth', { approach: 'JWT' });
 * memory.store('pattern-cache', { approach: 'Redis' });
 *
 * const results = memory.search('pattern');
 * expect(results).toHaveLength(2);
 *
 * // Track searches
 * const history = memory.getSearchHistory();
 * expect(history[0].query).toBe('pattern');
 * expect(history[0].duration).toBeGreaterThan(0);
 * ```
 *
 * @example
 * ```typescript
 * // Clear and delete operations
 * memory.store('temp', { data: 'value' });
 * memory.delete('temp');
 * expect(memory.retrieve('temp')).toBeUndefined();
 *
 * // Clear all
 * memory.store('key1', 'value1');
 * memory.store('key2', 'value2');
 * memory.clear();
 * expect(memory.patterns).toHaveLength(0);
 * ```
 *
 * @example Anti-Pattern: Relying on search accuracy
 * ```typescript
 * // BAD - mock search is substring-based, not semantic
 * memory.store('authenticate-user', { method: 'auth' });
 * const results = memory.search('auth');
 * // Results include the key AND the stringified value - might be unintended
 *
 * // GOOD - understand mock limitations and test accordingly
 * // Use createMockMemory for basic functional testing
 * // Use real memory store or integration test for semantic search testing
 * ```
 *
 * @see {@link MockMemory} for interface details
 * @see {@link SearchOperation} for search result details
 * @see {@link createMockAgent} for related mock factories
 *
 * @public
 */
export function createMockMemory(): MockMemory & {
  store: (key: string, value: unknown) => void;
  retrieve: (key: string) => unknown;
  search: (query: string) => unknown[];
  delete: (key: string) => void;
  clear: () => void;
  getSearchHistory: () => MockMemory['searchHistory'];
} {
  const memory: MockMemory = {
    store: new Map(),
    searchHistory: [],
    patterns: []
  };

  return {
    ...memory,

    store: (key: string, value: unknown) => {
      memory.store.set(key, value);
      memory.patterns.push({
        key,
        value,
        namespace: 'default',
        timestamp: Date.now()
      });
    },

    retrieve: (key: string): unknown => {
      return memory.store.get(key);
    },

    search: (query: string): unknown[] => {
      const startTime = Date.now();
      const results: unknown[] = [];

      for (const [key, value] of memory.store) {
        if (key.includes(query) || JSON.stringify(value).includes(query)) {
          results.push(value);
        }
      }

      memory.searchHistory.push({
        id: uuidv4(),
        query,
        timestamp: startTime,
        results,
        duration: Date.now() - startTime
      });

      return results;
    },

    delete: (key: string) => {
      memory.store.delete(key);
    },

    clear: () => {
      memory.store.clear();
      memory.searchHistory = [];
      memory.patterns = [];
    },

    getSearchHistory: () => memory.searchHistory
  };
}

/**
 * Create a mock CLI command executor for testing CLI-dependent code
 *
 * Simulates command execution without actually running system commands.
 * Useful for testing CLI code paths without side effects.
 *
 * **Mock Behavior:**
 * - All commands succeed with exit code 0
 * - Returns predictable stdout/stderr
 * - Tracks command history for verification
 * - No actual system command execution
 *
 * @returns Mock executor with command execution and history tracking
 *
 * @example
 * ```typescript
 * const cli = createMockCLIExecutor();
 *
 * const result = await cli.execute('echo', ['Hello']);
 * expect(result.stdout).toBe('echo Hello executed');
 * expect(result.exitCode).toBe(0);
 * expect(result.stderr).toBe('');
 * ```
 *
 * @example
 * ```typescript
 * // Track command history
 * await cli.execute('ls', ['-la']);
 * await cli.execute('cat', ['file.txt']);
 *
 * const history = cli.getHistory();
 * expect(history).toHaveLength(2);
 * expect(history[0].command).toBe('ls');
 * ```
 *
 * @see {@link createMockHttpClient} for HTTP mocking
 * @see {@link createMockLogger} for logging mocking
 *
 * @public
 */
export function createMockCLIExecutor(): {
  execute: (command: string, args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  getHistory: () => Array<{ command: string; args: string[] }>;
  reset: () => void;
} {
  const history: Array<{ command: string; args: string[] }> = [];

  return {
    execute: async (command: string, args: string[]) => {
      history.push({ command, args });

      return {
        stdout: `${command} ${args.join(' ')} executed`,
        stderr: '',
        exitCode: 0
      };
    },

    getHistory: () => history,

    reset: () => {
      history.length = 0;
    }
  };
}

/**
 * Create a mock HTTP client for testing HTTP-dependent code
 *
 * Simulates HTTP GET/POST requests without actual network calls.
 * Tracks requests for verification and testing.
 *
 * **Mock Behavior:**
 * - All requests return status 200/201 (success)
 * - GET returns response with url in data
 * - POST echoes back sent data
 * - Tracks all requests for assertion
 * - No actual network traffic
 *
 * @returns Mock HTTP client with request tracking
 *
 * @example
 * ```typescript
 * const http = createMockHttpClient();
 *
 * const response = await http.get('https://api.example.com/users');
 * expect(response.status).toBe(200);
 * expect(response.data.url).toContain('users');
 * ```
 *
 * @example
 * ```typescript
 * // POST requests
 * const data = { name: 'John', email: 'john@example.com' };
 * const response = await http.post('https://api.example.com/users', data);
 * expect(response.status).toBe(201);
 * expect(response.data).toEqual(data);
 * ```
 *
 * @example
 * ```typescript
 * // Track all requests
 * await http.get('https://api.example.com/users');
 * await http.post('https://api.example.com/users', { name: 'Jane' });
 *
 * const requests = http.getRequests();
 * expect(requests).toHaveLength(2);
 * expect(requests[0].method).toBe('GET');
 * expect(requests[1].method).toBe('POST');
 * ```
 *
 * @see {@link createMockCLIExecutor} for CLI mocking
 * @see {@link createMockLogger} for logging mocking
 *
 * @public
 */
export function createMockHttpClient(): {
  get: (url: string) => Promise<{ status: number; data: unknown }>;
  post: (url: string, data: unknown) => Promise<{ status: number; data: unknown }>;
  getRequests: () => Array<{ method: string; url: string; data?: unknown }>;
  reset: () => void;
} {
  const requests: Array<{ method: string; url: string; data?: unknown }> = [];

  return {
    get: async (url: string) => {
      requests.push({ method: 'GET', url });
      return { status: 200, data: { url } };
    },

    post: async (url: string, data: unknown) => {
      requests.push({ method: 'POST', url, data });
      return { status: 201, data };
    },

    getRequests: () => requests,

    reset: () => {
      requests.length = 0;
    }
  };
}

/**
 * Create a mock event emitter for testing event-dependent code
 *
 * Implements event subscription and emission without a full event system.
 * Tracks all events and listeners for debugging and verification.
 *
 * **Mock Behavior:**
 * - Subscribers added via on() called immediately on emit()
 * - All events tracked for audit
 * - Multiple listeners per event supported
 * - Synchronous execution
 *
 * @returns Mock event emitter with subscription and event tracking
 *
 * @example
 * ```typescript
 * const emitter = createMockEventEmitter();
 *
 * const results: unknown[] = [];
 * emitter.on('data', (data) => results.push(data));
 *
 * emitter.emit('data', { value: 42 });
 * expect(results).toEqual([{ value: 42 }]);
 * ```
 *
 * @example
 * ```typescript
 * // Multiple listeners
 * let count = 0;
 * emitter.on('count', () => count++);
 * emitter.on('count', () => count++);
 *
 * emitter.emit('count', undefined);
 * expect(count).toBe(2);
 * ```
 *
 * @example
 * ```typescript
 * // Query event history
 * emitter.emit('start', {});
 * emitter.emit('progress', { pct: 50 });
 * emitter.emit('end', {});
 *
 * const events = emitter.getEvents();
 * expect(events).toHaveLength(3);
 * expect(events[0].event).toBe('start');
 * ```
 *
 * @see {@link createMockLogger} for logging mocking
 *
 * @public
 */
export function createMockEventEmitter(): {
  on: (event: string, handler: (data: unknown) => void) => void;
  emit: (event: string, data: unknown) => void;
  getEvents: () => Array<{ event: string; data: unknown }>;
  getListeners: (event: string) => Array<(data: unknown) => void>;
  reset: () => void;
} {
  const events: Array<{ event: string; data: unknown }> = [];
  const listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  return {
    on: (event: string, handler: (data: unknown) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(handler);
    },

    emit: (event: string, data: unknown) => {
      events.push({ event, data });
      const handlers = listeners.get(event) || [];
      for (const handler of handlers) {
        handler(data);
      }
    },

    getEvents: () => events,

    getListeners: (event: string) => listeners.get(event) || [],

    reset: () => {
      events.length = 0;
      listeners.clear();
    }
  };
}

/**
 * Create a mock logger for testing logging-dependent code
 *
 * Replaces actual logging with in-memory recording. Useful for verifying
 * that code logs appropriate messages without output noise.
 *
 * **Mock Behavior:**
 * - All log levels supported (debug, info, warn, error)
 * - Logs recorded in memory (no console output by default)
 * - Supports filtering by level
 * - Thread-safe and reusable
 *
 * @returns Mock logger with level-specific methods and history tracking
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 *
 * // Log messages at different levels
 * logger.info('Server started');
 * logger.error('Connection failed', new Error('ECONNREFUSED'));
 * logger.warn('Deprecated API used');
 *
 * // Verify logs
 * const logs = logger.getLogs();
 * expect(logs).toHaveLength(3);
 * expect(logs[0].level).toBe('info');
 * expect(logs[1].level).toBe('error');
 * ```
 *
 * @example
 * ```typescript
 * // Filter logs by level
 * logger.info('Request started');
 * logger.error('Request failed');
 * logger.info('Request retrying');
 *
 * const errors = logger.getLogs('error');
 * expect(errors).toHaveLength(1);
 * ```
 *
 * @example
 * ```typescript
 * // Include data with logs
 * logger.info('User login', { userId: 123, ip: '192.168.1.1' });
 * logger.error('Auth failed', { reason: 'Invalid credentials' });
 *
 * const logs = logger.getLogs();
 * expect(logs[0].data).toEqual({ userId: 123, ip: '192.168.1.1' });
 * ```
 *
 * @see {@link createMockAgent} for agent mocking
 *
 * @public
 */
export function createMockLogger(): {
  log: (level: string, message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  getLogs: (level?: string) => Array<{ level: string; message: string; data?: unknown }>;
  reset: () => void;
} {
  const logs: Array<{ level: string; message: string; data?: unknown }> = [];

  return {
    log: (level: string, message: string, data?: unknown) => {
      logs.push({ level, message, data });
    },

    debug: (message: string, data?: unknown) => {
      logs.push({ level: 'debug', message, data });
    },

    info: (message: string, data?: unknown) => {
      logs.push({ level: 'info', message, data });
    },

    warn: (message: string, data?: unknown) => {
      logs.push({ level: 'warn', message, data });
    },

    error: (message: string, error?: unknown) => {
      logs.push({ level: 'error', message, data: error });
    },

    getLogs: (level?: string) => {
      if (!level) return logs;
      return logs.filter(log => log.level === level);
    },

    reset: () => {
      logs.length = 0;
    }
  };
}

/**
 * Create a spy function for monitoring function calls
 *
 * Wraps a function (or creates empty one) to track all invocations,
 * arguments, return values, and errors. Useful for verifying function behavior
 * without mocking.
 *
 * **Spy Behavior:**
 * - Calls through to original function if provided
 * - Tracks all calls with args and results
 * - Captures errors thrown by function
 * - Reusable and resettable
 * - Type-safe spy casting
 *
 * @param fn - Optional function to wrap (if undefined, spy returns undefined)
 * @returns Spy wrapper with call tracking utilities
 *
 * @example
 * ```typescript
 * // Spy on existing function
 * const add = (a: number, b: number) => a + b;
 * const spyAdd = createSpy(add);
 *
 * const result = spyAdd.spy(2, 3);
 * expect(result).toBe(5);
 * expect(spyAdd.calls).toHaveLength(1);
 * expect(spyAdd.calls[0].args).toEqual([2, 3]);
 * expect(spyAdd.calls[0].result).toBe(5);
 * ```
 *
 * @example
 * ```typescript
 * // Create spy without function
 * const spy = createSpy<() => string>();
 *
 * spy.spy();
 * expect(spy.callCount()).toBe(1);
 * expect(spy.calls[0].result).toBeUndefined();
 * ```
 *
 * @example
 * ```typescript
 * // Capture errors
 * const throwing = () => { throw new Error('Oops'); };
 * const spy = createSpy(throwing);
 *
 * try {
 *   spy.spy();
 * } catch {
 *   // Error re-thrown
 * }
 *
 * expect(spy.calls[0].error).toBeDefined();
 * expect(spy.calls[0].error?.message).toBe('Oops');
 * ```
 *
 * @example
 * ```typescript
 * // Query last call
 * const spy = createSpy(Math.max);
 * spy.spy(1, 2, 3);
 *
 * const lastCall = spy.getLastCall();
 * expect(lastCall?.args).toEqual([1, 2, 3]);
 * expect(lastCall?.result).toBe(3);
 * ```
 *
 * @see {@link createMockAgent} for agent call spying
 *
 * @public
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(
  fn?: T
): {
  spy: T;
  calls: Array<{ args: unknown[]; result: unknown; error?: Error }>;
  callCount: () => number;
  getLastCall: () => { args: unknown[]; result: unknown; error?: Error } | undefined;
  reset: () => void;
} {
  const calls: Array<{ args: unknown[]; result: unknown; error?: Error }> = [];

  const spy = ((...args: unknown[]) => {
    try {
      const result = fn ? fn(...args) : undefined;
      calls.push({ args, result });
      return result;
    } catch (error) {
      calls.push({ args, result: undefined, error: error as Error });
      throw error;
    }
  }) as T;

  return {
    spy,
    calls,
    callCount: () => calls.length,
    getLastCall: () => calls[calls.length - 1],
    reset: () => {
      calls.length = 0;
    }
  };
}

export * from './agent-mocks';
export * from './memory-mocks';
