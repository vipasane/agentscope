/**
 * Test helpers for common setup/teardown utilities
 */

import { TestContext, PerformanceMetrics, AsyncTestOptions } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new test context
 */
export function createTestContext(
  name: string,
  metadata?: Record<string, unknown>
): TestContext {
  return {
    id: uuidv4(),
    name,
    startTime: Date.now(),
    status: 'pending',
    metadata: metadata || {}
  };
}

/**
 * Update test context with completion info
 */
export function completeTestContext(
  context: TestContext,
  status: 'passed' | 'failed' | 'skipped',
  error?: Error
): TestContext {
  const endTime = Date.now();
  return {
    ...context,
    endTime,
    duration: endTime - context.startTime,
    status,
    error
  };
}

/**
 * Create performance metrics
 */
export function createPerformanceMetrics(): PerformanceMetrics {
  return {
    startTime: Date.now(),
    calls: 0
  };
}

/**
 * Complete performance metrics
 */
export function completePerformanceMetrics(
  metrics: PerformanceMetrics,
  memoryUsed?: number,
  cpuUsed?: number
): PerformanceMetrics {
  const endTime = Date.now();
  return {
    ...metrics,
    endTime,
    duration: endTime - metrics.startTime,
    memoryUsed,
    cpuUsed
  };
}

/**
 * Sleep utility for async testing
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: AsyncTestOptions = {}
): Promise<T> {
  const {
    retries = 3,
    timeout = 5000,
    backoff = 'exponential',
    backoffMultiplier = 2
  } = options;

  let lastError: Error | undefined;
  let delay = 100;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await sleep(delay);
        if (backoff === 'exponential') {
          delay *= backoffMultiplier;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Timeout utility
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(message || `Operation timed out after ${ms}ms`)),
      ms
    )
  );

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Wait for condition
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (true) {
    try {
      const result = await condition();
      if (result) return;
    } catch {
      // Continue polling
    }

    if (Date.now() - startTime > timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }

    await sleep(interval);
  }
}

/**
 * Capture console output
 */
export interface CapturedOutput {
  logs: unknown[];
  errors: unknown[];
  warns: unknown[];
  infos: unknown[];
}

export function captureConsoleOutput(): {
  capture: () => void;
  release: () => void;
  getOutput: () => CapturedOutput;
} {
  const output: CapturedOutput = {
    logs: [],
    errors: [],
    warns: [],
    infos: []
  };

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  function capture(): void {
    console.log = (...args: unknown[]) => output.logs.push(...args);
    console.error = (...args: unknown[]) => output.errors.push(...args);
    console.warn = (...args: unknown[]) => output.warns.push(...args);
    console.info = (...args: unknown[]) => output.infos.push(...args);
  }

  function release(): void {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
  }

  function getOutput(): CapturedOutput {
    return { ...output };
  }

  return { capture, release, getOutput };
}

/**
 * Measure async function execution time
 */
export async function measureAsyncExecution<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;
  return { result, duration };
}

/**
 * Measure sync function execution time
 */
export function measureSyncExecution<T>(
  fn: () => T
): { result: T; duration: number } {
  const startTime = performance.now();
  const result = fn();
  const duration = performance.now() - startTime;
  return { result, duration };
}

/**
 * Create a deferred promise
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Clean up resources in test teardown
 */
export async function cleanup(
  cleanupFns: Array<() => Promise<void> | void>
): Promise<void> {
  for (const fn of cleanupFns) {
    try {
      await Promise.resolve(fn());
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get memory usage delta
 */
export function getMemoryUsageDelta(
  before: NodeJS.MemoryUsage,
  after: NodeJS.MemoryUsage
): Record<string, number> {
  return {
    heapUsed: after.heapUsed - before.heapUsed,
    heapTotal: after.heapTotal - before.heapTotal,
    external: after.external - before.external,
    rss: after.rss - before.rss
  };
}

export * from './setup-helpers';
export * from './teardown-helpers';
