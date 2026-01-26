/**
 * Mock factories for Claude Flow components
 */

import { MockAgent, AgentCall, MockMemory, PerformanceMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a mock agent
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
 * Create a mock memory store
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
 * Create a mock CLI command executor
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
 * Create a mock HTTP client
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
 * Create a mock event emitter
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
 * Create a mock logger
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
 * Create a spy function
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
