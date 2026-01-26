/**
 * Custom Assertion Helpers
 *
 * Provides fluent assertion helpers for testing specific Claude Flow components
 * and patterns. Each helper returns an object with chainable assertion methods.
 *
 * **Assertion Patterns:**
 * - `expectTestContext()` - Test execution context assertions
 * - `expectAgent()` - Mock agent behavior assertions
 * - `expectPerformance()` - Performance metrics assertions
 * - `expectAsync()` - Async operation assertions
 * - `expectStateChange()` - State mutation assertions
 * - `expectCollection()` - Array/collection assertions
 * - `expectError()` - Error handling assertions
 * - `expectStructure()` - Data structure assertions
 * - `expectObjectArray()` - Array of objects assertions
 * - `expectSnapshot()` - Snapshot comparison assertions
 *
 * ## Usage Pattern
 *
 * ```typescript
 * import { expectAgent, expectAsync, expectPerformance } from '@claude-flow/testing';
 * import { expect, it } from 'vitest';
 *
 * it('should execute quickly', () => {
 *   const agent = createMockAgent();
 *   agent.call('execute', 'task');
 *
 *   expectAgent(agent).toHaveCalled('execute');
 *   expectAgent(agent).toHaveCalledTimes(1);
 *   expectPerformance(agent.performance).toBeWithinDuration(0, 100);
 * });
 * ```
 *
 * @module assertions
 */

import { expect } from 'vitest';
import { TestContext, MockAgent, PerformanceMetrics } from '../types';

/**
 * Assertions for test execution context
 *
 * Verify test status, timing, errors, and metadata through fluent API.
 *
 * @param context - TestContext to verify
 * @returns Assertion builder with context-specific checks
 *
 * @example
 * ```typescript
 * const context: TestContext = {
 *   id: 'test-1',
 *   name: 'should work',
 *   startTime: Date.now(),
 *   status: 'passed',
 *   metadata: { suite: 'integration' }
 * };
 *
 * expectTestContext(context).toHavePassed();
 * expectTestContext(context).toHaveDuration(0, 1000);
 * expectTestContext(context).toHaveMetadata('suite', 'integration');
 * ```
 *
 * @public
 */
export function expectTestContext(context: TestContext) {
  return {
    toHavePassed: (): void => {
      expect(context.status).toBe('passed');
    },

    toHaveFailed: (): void => {
      expect(context.status).toBe('failed');
    },

    toBeSkipped: (): void => {
      expect(context.status).toBe('skipped');
    },

    toHaveDuration: (min: number, max: number): void => {
      expect(context.duration).toBeGreaterThanOrEqual(min);
      expect(context.duration).toBeLessThanOrEqual(max);
    },

    toHaveError: (message?: string): void => {
      expect(context.error).toBeDefined();
      if (message) {
        expect(context.error?.message).toContain(message);
      }
    },

    toHaveMetadata: (key: string, value?: unknown): void => {
      expect(context.metadata).toHaveProperty(key);
      if (value !== undefined) {
        expect(context.metadata[key]).toEqual(value);
      }
    }
  };
}

/**
 * Assertions for mock agent behavior
 *
 * Verify agent method calls, error handling, inputs, and outputs.
 *
 * @param agent - MockAgent to verify
 * @returns Assertion builder with agent-specific checks
 *
 * @example
 * ```typescript
 * const agent = createMockAgent();
 * agent.call('execute', 'task-1');
 * agent.call('execute', 'task-2');
 * agent.call('report', { status: 'done' });
 *
 * expectAgent(agent).toHaveCalled('execute');
 * expectAgent(agent).toHaveCalledTimes(3); // total calls
 * expectAgent(agent).toHaveCalledTimes(2, 'execute'); // specific method
 * expectAgent(agent).toHaveCalledWith('execute', ['task-1']);
 * ```
 *
 * @example
 * ```typescript
 * // Test error recording
 * const agent = createMockAgent();
 * const error = new Error('Task failed');
 * agent.recordError(error);
 *
 * expectAgent(agent).toHaveError();
 * expectAgent(agent).toHaveError('Task failed');
 * expectAgent(agent).toHaveErrorCount(1);
 * ```
 *
 * @public
 */
export function expectAgent(agent: MockAgent) {
  return {
    toHaveCalled: (method?: string): void => {
      if (method) {
        const count = agent.calls.filter(c => c.method === method).length;
        expect(count).toBeGreaterThan(0);
      } else {
        expect(agent.calls.length).toBeGreaterThan(0);
      }
    },

    toHaveCalledTimes: (times: number, method?: string): void => {
      if (method) {
        const count = agent.calls.filter(c => c.method === method).length;
        expect(count).toBe(times);
      } else {
        expect(agent.calls.length).toBe(times);
      }
    },

    toHaveCalledWith: (method: string, args: unknown[]): void => {
      const call = agent.calls.find(
        c => c.method === method && JSON.stringify(c.args) === JSON.stringify(args)
      );
      expect(call).toBeDefined();
    },

    toHaveError: (message?: string): void => {
      expect(agent.errors.length).toBeGreaterThan(0);
      if (message) {
        const hasError = agent.errors.some(e => e.message.includes(message));
        expect(hasError).toBe(true);
      }
    },

    toHaveErrorCount: (count: number): void => {
      expect(agent.errors.length).toBe(count);
    },

    toHaveInput: (input: unknown): void => {
      expect(agent.inputs).toContainEqual(expect.objectContaining(input));
    },

    toHaveOutput: (output: unknown): void => {
      expect(agent.outputs).toContain(output);
    }
  };
}

/**
 * Assertions for performance metrics
 */
export function expectPerformance(metrics: PerformanceMetrics) {
  return {
    toBeWithinDuration: (min: number, max: number): void => {
      expect(metrics.duration).toBeGreaterThanOrEqual(min);
      expect(metrics.duration).toBeLessThanOrEqual(max);
    },

    toHaveCallCount: (count: number): void => {
      expect(metrics.calls).toBe(count);
    },

    toHaveCallCount_GreaterThan: (count: number): void => {
      expect(metrics.calls).toBeGreaterThan(count);
    },

    toHaveCallCount_LessThan: (count: number): void => {
      expect(metrics.calls).toBeLessThan(count);
    },

    toUseMemory: (expectedMemory: number, tolerance: number = 0.1): void => {
      if (metrics.memoryUsed !== undefined) {
        const diff = Math.abs(metrics.memoryUsed - expectedMemory);
        const allowedDiff = expectedMemory * tolerance;
        expect(diff).toBeLessThanOrEqual(allowedDiff);
      }
    },

    toUseLessThanMemory: (maxMemory: number): void => {
      expect(metrics.memoryUsed).toBeLessThanOrEqual(maxMemory);
    }
  };
}

/**
 * Assertions for async operations
 */
export function expectAsync<T>(promise: Promise<T>) {
  return {
    toResolveWith: async (expected: T): Promise<void> => {
      const result = await promise;
      expect(result).toEqual(expected);
    },

    toRejectWith: async (message: string): Promise<void> => {
      await expect(promise).rejects.toThrow(message);
    },

    toResolveWithin: async (ms: number): Promise<void> => {
      const start = Date.now();
      await promise;
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(ms);
    }
  };
}

/**
 * Assertions for state changes
 */
export function expectStateChange<T>(before: T, after: T) {
  return {
    toHaveChanged: (): void => {
      expect(after).not.toEqual(before);
    },

    toNotHaveChanged: (): void => {
      expect(after).toEqual(before);
    },

    toMatch: (changes: Partial<T>): void => {
      Object.entries(changes).forEach(([key, value]) => {
        expect((after as Record<string, unknown>)[key]).toEqual(value);
      });
    }
  };
}

/**
 * Assertions for collections
 */
export function expectCollection<T>(collection: T[]) {
  return {
    toContainItem: (item: T): void => {
      expect(collection).toContain(item);
    },

    toContainItemMatching: (predicate: (item: T) => boolean): void => {
      expect(collection.some(predicate)).toBe(true);
    },

    toHaveLength: (length: number): void => {
      expect(collection).toHaveLength(length);
    },

    toBeEmpty: (): void => {
      expect(collection).toHaveLength(0);
    },

    toNotBeEmpty: (): void => {
      expect(collection.length).toBeGreaterThan(0);
    }
  };
}

/**
 * Assertions for error handling
 */
export function expectError(error: Error | null) {
  return {
    toExist: (): void => {
      expect(error).toBeDefined();
    },

    toNotExist: (): void => {
      expect(error).toBeNull();
    },

    toHaveMessage: (message: string): void => {
      expect(error?.message).toContain(message);
    },

    toBeOfType: (type: string): void => {
      expect(error?.constructor.name).toBe(type);
    },

    toHaveCode: (code: string | number): void => {
      expect((error as Record<string, unknown>).code).toBe(code);
    }
  };
}

/**
 * Assertions for data structures
 */
export function expectStructure<T>(data: T) {
  return {
    toHaveProperties: (props: (keyof T)[]): void => {
      props.forEach(prop => {
        expect(data).toHaveProperty(String(prop));
      });
    },

    toHaveProperty: (prop: keyof T, value?: unknown): void => {
      expect(data).toHaveProperty(String(prop));
      if (value !== undefined) {
        expect((data as Record<string, unknown>)[String(prop)]).toEqual(value);
      }
    },

    toMatch: (pattern: Partial<T>): void => {
      Object.entries(pattern).forEach(([key, value]) => {
        expect((data as Record<string, unknown>)[key]).toEqual(value);
      });
    }
  };
}

/**
 * Custom matchers for arrays of objects
 */
export function expectObjectArray<T extends Record<string, unknown>>(array: T[]) {
  return {
    toContainObjectMatching: (partial: Partial<T>): void => {
      const found = array.some(item =>
        Object.entries(partial).every(
          ([key, value]) => item[key] === value
        )
      );
      expect(found).toBe(true);
    },

    toHaveAllPropertiesInObjects: (properties: (keyof T)[]): void => {
      array.forEach(item => {
        properties.forEach(prop => {
          expect(item).toHaveProperty(String(prop));
        });
      });
    }
  };
}

/**
 * Snapshot comparison helpers
 */
export function expectSnapshot(actual: unknown, expected: unknown) {
  return {
    toMatchSnapshot: (): void => {
      expect(actual).toEqual(expected);
    },

    toNotMatchSnapshot: (): void => {
      expect(actual).not.toEqual(expected);
    }
  };
}
