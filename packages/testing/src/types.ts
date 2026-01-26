/**
 * Core Types for @claude-flow/testing
 *
 * This module defines all core types used across the testing package, including
 * test execution contexts, mock tracking, performance metrics, and fixture management.
 *
 * ## Usage Pattern
 *
 * ```typescript
 * import type {
 *   TestContext,
 *   MockAgent,
 *   PerformanceMetrics,
 *   BenchmarkResult
 * } from '@claude-flow/testing';
 *
 * const context: TestContext = {
 *   id: 'test-123',
 *   name: 'test-example',
 *   startTime: Date.now(),
 *   status: 'running',
 *   metadata: {}
 * };
 * ```
 *
 * @module types
 */

/**
 * Context information for a single test execution
 *
 * Tracks the lifecycle of a test including timing, status, errors, and custom metadata.
 * Used by test runners and reporters to record test outcomes.
 *
 * @example
 * ```typescript
 * const context: TestContext = {
 *   id: uuidv4(),
 *   name: 'should validate input',
 *   startTime: performance.now(),
 *   status: 'running',
 *   metadata: {
 *     suite: 'validation',
 *     tags: ['unit', 'security']
 *   }
 * };
 *
 * // Update after completion
 * context.status = 'passed';
 * context.endTime = performance.now();
 * context.duration = context.endTime - context.startTime;
 * ```
 *
 * @see {@link TestReport} for aggregate test results
 *
 * @public
 */
export interface TestContext {
  /** Unique identifier for this test execution */
  id: string;

  /** Human-readable test name (matches test description) */
  name: string;

  /** Unix timestamp when test started (ms) */
  startTime: number;

  /** Unix timestamp when test completed (ms) - undefined if still running */
  endTime?: number;

  /** Total execution time in milliseconds - calculated from startTime and endTime */
  duration?: number;

  /** Current test status - 'pending' before start, 'running' during execution, 'passed'/'failed'/'skipped' on completion */
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

  /** Error object if test failed - undefined for successful tests */
  error?: Error;

  /** Arbitrary metadata attached to test (suite name, tags, custom data) */
  metadata: Record<string, unknown>;
}

/**
 * Mock agent with call recording and performance tracking
 *
 * Simulates agent behavior in tests, recording all method calls, return values, errors,
 * and performance metrics. Includes utilities for querying call history and resetting state.
 *
 * @example
 * ```typescript
 * const agent = createMockAgent({ type: 'coder' });
 *
 * // Record a method call
 * const result = agent.call('execute', 'task-1');
 *
 * // Query call history
 * expect(agent.getCallCount()).toBe(1);
 * expect(agent.getCallCount('execute')).toBe(1);
 * expect(agent.getCalls('execute')[0].args).toEqual(['task-1']);
 *
 * // Reset for next test
 * agent.reset();
 * ```
 *
 * @see {@link AgentCall} for individual call details
 * @see {@link PerformanceMetrics} for performance tracking
 *
 * @public
 */
export interface MockAgent {
  /** Unique identifier for this mock agent */
  id: string;

  /** Agent type (e.g., 'coder', 'researcher', 'reviewer') */
  type: string;

  /** Array of all recorded inputs to the mock (includes method and args) */
  inputs: unknown[];

  /** Array of all recorded outputs from the mock (return values) */
  outputs: unknown[];

  /** Array of all errors thrown by the mock */
  errors: Error[];

  /** Complete call history with timestamps and results */
  calls: AgentCall[];

  /** Performance metrics for this agent's operations */
  performance: PerformanceMetrics;
}

/**
 * Record of a single method call on a mock agent
 *
 * Captures all details of a method invocation including arguments, return value,
 * timing information, and any errors that occurred.
 *
 * @example
 * ```typescript
 * // Programmatically record a call
 * agent.recordCall('execute', ['task-1'], 'result', 42);
 *
 * // Then verify it was recorded
 * const lastCall = agent.calls[0];
 * expect(lastCall.method).toBe('execute');
 * expect(lastCall.args).toEqual(['task-1']);
 * expect(lastCall.result).toBe('result');
 * expect(lastCall.duration).toBe(42);
 * ```
 *
 * @public
 */
export interface AgentCall {
  /** Unique identifier for this call */
  id: string;

  /** Unix timestamp when call was made (ms) */
  timestamp: number;

  /** Method name that was called */
  method: string;

  /** Arguments passed to the method */
  args: unknown[];

  /** Return value from the method - undefined if method threw error */
  result?: unknown;

  /** Error thrown by method - undefined if method succeeded */
  error?: Error;

  /** Execution time in milliseconds */
  duration: number;
}

/**
 * Mock memory store for testing memory-dependent code
 *
 * In-memory implementation of the memory store interface without requiring
 * actual database setup. Tracks all operations including stores, searches, and patterns.
 *
 * @example
 * ```typescript
 * const memory = createMockMemory();
 *
 * // Store data
 * memory.store('key-1', { data: 'value' });
 * expect(memory.retrieve('key-1')).toEqual({ data: 'value' });
 *
 * // Search
 * const results = memory.search('key');
 * expect(results).toContainEqual({ data: 'value' });
 *
 * // Verify search history
 * const history = memory.getSearchHistory();
 * expect(history[0].query).toBe('key');
 * expect(history[0].results).toHaveLength(1);
 * ```
 *
 * @see {@link SearchOperation} for search details
 * @see {@link StoredPattern} for stored pattern details
 *
 * @public
 */
export interface MockMemory {
  /** Key-value store for storing test data */
  store: Map<string, unknown>;

  /** History of all search operations performed on this mock */
  searchHistory: SearchOperation[];

  /** Array of all stored patterns (automatically updated on store calls) */
  patterns: StoredPattern[];
}

/**
 * Record of a memory search operation
 *
 * Captures search query, results, timing, and other details for debugging
 * and performance analysis of memory-dependent code.
 *
 * @example
 * ```typescript
 * const memory = createMockMemory();
 * memory.store('pattern-auth', { approach: 'JWT' });
 *
 * const results = memory.search('auth');
 * const search = memory.searchHistory[0];
 *
 * expect(search.query).toBe('auth');
 * expect(search.results).toHaveLength(1);
 * expect(search.duration).toBeGreaterThan(0);
 * ```
 *
 * @public
 */
export interface SearchOperation {
  /** Unique identifier for this search */
  id: string;

  /** Query string used for search */
  query: string;

  /** Unix timestamp when search was performed (ms) */
  timestamp: number;

  /** Results returned by the search */
  results: unknown[];

  /** Time taken for search in milliseconds */
  duration: number;
}

/**
 * Pattern stored in mock memory
 *
 * Represents a stored pattern with metadata tracking when it was stored
 * and optional time-to-live (TTL) for expiration.
 *
 * @example
 * ```typescript
 * const memory = createMockMemory();
 * memory.store('pattern-1', { data: 'value' }, { namespace: 'auth' });
 *
 * const pattern = memory.patterns[0];
 * expect(pattern.key).toBe('pattern-1');
 * expect(pattern.value).toEqual({ data: 'value' });
 * expect(pattern.namespace).toBe('auth');
 * ```
 *
 * @public
 */
export interface StoredPattern {
  /** Unique key for this pattern */
  key: string;

  /** Pattern data (any shape) */
  value: unknown;

  /** Namespace for organizing patterns */
  namespace: string;

  /** Unix timestamp when pattern was stored (ms) */
  timestamp: number;

  /** Optional time-to-live in seconds (undefined = never expires) */
  ttl?: number;
}

/**
 * Performance metrics for a test or operation
 *
 * Tracks timing and resource usage characteristics during test execution
 * for performance analysis, profiling, and bottleneck detection.
 *
 * @example
 * ```typescript
 * const metrics: PerformanceMetrics = {
 *   startTime: performance.now(),
 *   calls: 0
 * };
 *
 * // Perform operations...
 *
 * metrics.endTime = performance.now();
 * metrics.duration = metrics.endTime - metrics.startTime;
 * metrics.calls = 42;
 *
 * expect(metrics.duration).toBeLessThan(1000);
 * ```
 *
 * @performance
 * - Metrics collection: <0.1ms overhead per call
 * - Memory per metric set: ~64 bytes
 * - Suitable for high-frequency measurement
 *
 * @public
 */
export interface PerformanceMetrics {
  /** Unix timestamp when measurement started (ms) - from performance.now() */
  startTime: number;

  /** Unix timestamp when measurement ended (ms) - undefined if still running */
  endTime?: number;

  /** Total duration in milliseconds - calculated from startTime and endTime */
  duration?: number;

  /** Memory used in bytes - undefined if not measured */
  memoryUsed?: number;

  /** CPU time used in milliseconds - undefined if not measured */
  cpuUsed?: number;

  /** Number of calls or operations executed */
  calls: number;
}

/**
 * Test fixture with metadata
 *
 * Represents loaded test data including the fixture content, source location,
 * format type, and optional versioning information for managing test data.
 *
 * @example
 * ```typescript
 * const fixture: TestFixture = {
 *   name: 'user-data',
 *   path: './fixtures/user-data.json',
 *   data: { id: 1, name: 'John' },
 *   type: 'json',
 *   version: '1.0.0'
 * };
 * ```
 *
 * @see {@link FixtureLoader} for loading fixtures
 *
 * @public
 */
export interface TestFixture {
  /** Human-readable name for this fixture */
  name: string;

  /** File path where fixture was loaded from (or 'inline://', 'template://', etc.) */
  path: string;

  /** Actual fixture data (shape depends on type and use case) */
  data: unknown;

  /** Format of the fixture data */
  type: 'json' | 'yaml' | 'text' | 'buffer';

  /** Optional version for tracking fixture compatibility */
  version?: string;
}

/**
 * Snapshot of data state for comparison testing
 *
 * Records test data snapshots with computed hash for detecting unexpected changes
 * in behavior or data structures between test runs.
 *
 * @example
 * ```typescript
 * const snapshot: TestSnapshot = {
 *   id: 'snap-1',
 *   name: 'user-response',
 *   timestamp: Date.now(),
 *   data: { status: 'active' },
 *   hash: 'abc123def456'
 * };
 * ```
 *
 * @public
 */
export interface TestSnapshot {
  /** Unique identifier for this snapshot */
  id: string;

  /** Human-readable snapshot name */
  name: string;

  /** Unix timestamp when snapshot was created (ms) */
  timestamp: number;

  /** Captured data */
  data: unknown;

  /** Hash of data for change detection */
  hash: string;
}

/**
 * Performance benchmark result
 *
 * Captures detailed performance metrics from benchmarking a code path,
 * including timing statistics, throughput, and raw samples for analysis.
 *
 * @example
 * ```typescript
 * const result: BenchmarkResult = {
 *   name: 'parse-json',
 *   iterations: 1000,
 *   meanDuration: 1.23,
 *   minDuration: 0.95,
 *   maxDuration: 2.51,
 *   stdDeviation: 0.35,
 *   throughput: 813,
 *   samples: [1.1, 1.2, 1.3, ...]
 * };
 * ```
 *
 * @performance
 * - Standard deviation calculated for statistical analysis
 * - Throughput = 1000 / meanDuration (ops/sec)
 * - Raw samples enable percentile analysis
 *
 * @public
 */
export interface BenchmarkResult {
  /** Name of the benchmarked operation */
  name: string;

  /** Number of iterations run */
  iterations: number;

  /** Average duration per iteration in milliseconds */
  meanDuration: number;

  /** Fastest iteration duration in milliseconds */
  minDuration: number;

  /** Slowest iteration duration in milliseconds */
  maxDuration: number;

  /** Standard deviation of all samples (measure of consistency) */
  stdDeviation: number;

  /** Operations per second (1000 / meanDuration) */
  throughput: number;

  /** Raw timing samples in milliseconds for detailed analysis */
  samples: number[];
}

/**
 * Configuration for integration tests
 *
 * Defines timeout, retry, and parallelization settings for integration test execution,
 * including separate timeouts for setup and teardown phases.
 *
 * @example
 * ```typescript
 * const config: IntegrationTestConfig = {
 *   timeout: 30000,
 *   retries: 2,
 *   parallel: false,
 *   setupTimeout: 10000,
 *   teardownTimeout: 5000
 * };
 * ```
 *
 * @see {@link IntegrationTestRunner} for usage
 *
 * @public
 */
export interface IntegrationTestConfig {
  /** Maximum time per test in milliseconds (default: 30000) */
  timeout: number;

  /** Number of retry attempts on failure (default: 0) */
  retries: number;

  /** Run tests in parallel if true, sequentially if false */
  parallel: boolean;

  /** Maximum time for setup phase in milliseconds */
  setupTimeout: number;

  /** Maximum time for teardown phase in milliseconds */
  teardownTimeout: number;
}

/**
 * Complete test execution report
 *
 * Aggregates results from all tests in a suite including pass/fail counts,
 * timing, code coverage metrics, and individual test contexts.
 *
 * @example
 * ```typescript
 * const report: TestReport = {
 *   totalTests: 100,
 *   passed: 95,
 *   failed: 3,
 *   skipped: 2,
 *   duration: 5432,
 *   coverage: {
 *     statements: 85.5,
 *     branches: 78.2,
 *     functions: 92.1,
 *     lines: 87.3
 *   },
 *   tests: [...]
 * };
 * ```
 *
 * @see {@link TestContext} for individual test details
 * @see {@link CoverageReport} for coverage metrics
 *
 * @public
 */
export interface TestReport {
  /** Total number of tests run */
  totalTests: number;

  /** Number of tests that passed */
  passed: number;

  /** Number of tests that failed */
  failed: number;

  /** Number of tests that were skipped */
  skipped: number;

  /** Total test execution time in milliseconds */
  duration: number;

  /** Code coverage percentages */
  coverage: CoverageReport;

  /** Detailed results for each test */
  tests: TestContext[];
}

/**
 * Code coverage metrics
 *
 * Percentage of code that was executed during tests, broken down by statements,
 * branches, functions, and lines.
 *
 * @example
 * ```typescript
 * const coverage: CoverageReport = {
 *   statements: 85.5,   // 85.5% of statements covered
 *   branches: 78.2,     // 78.2% of branches covered
 *   functions: 92.1,    // 92.1% of functions covered
 *   lines: 87.3         // 87.3% of lines covered
 * };
 * ```
 *
 * @public
 */
export interface CoverageReport {
  /** Percentage of statements covered (0-100) */
  statements: number;

  /** Percentage of branches covered (0-100) */
  branches: number;

  /** Percentage of functions covered (0-100) */
  functions: number;

  /** Percentage of lines covered (0-100) */
  lines: number;
}

/**
 * Options for testing async/promise-based code
 *
 * Configures timeout, retry behavior, and backoff strategy for async test helpers,
 * enabling robust testing of time-dependent or flaky async operations.
 *
 * @example
 * ```typescript
 * const options: AsyncTestOptions = {
 *   timeout: 10000,
 *   retries: 3,
 *   backoff: 'exponential',
 *   backoffMultiplier: 2
 * };
 *
 * // Usage with async helpers
 * await expectAsync(flakeyPromise).toResolveWithin(10000);
 * ```
 *
 * @see {@link expectAsync} for async assertion usage
 *
 * @public
 */
export interface AsyncTestOptions {
  /** Maximum time to wait for async operation in milliseconds (default: 5000) */
  timeout?: number;

  /** Number of retry attempts if operation fails (default: 0) */
  retries?: number;

  /** Backoff strategy: 'linear' = add delay each retry, 'exponential' = multiply delay */
  backoff?: 'linear' | 'exponential';

  /** Multiplier for backoff delay (default: 2 for exponential, 1 for linear) */
  backoffMultiplier?: number;
}

/**
 * Options for configuring fixture loading
 *
 * Controls how fixtures are loaded, cached, validated, and provides hooks
 * for monitoring fixture loading lifecycle.
 *
 * @example
 * ```typescript
 * const options: FixtureLoaderOptions = {
 *   basePath: './test/fixtures',
 *   cache: true,
 *   validate: true,
 *   onLoad: (fixture) => console.log(`Loaded: ${fixture.name}`)
 * };
 *
 * const loader = new FixtureLoader(options);
 * ```
 *
 * @see {@link FixtureLoader} for usage
 *
 * @public
 */
export interface FixtureLoaderOptions {
  /** Base directory path for loading fixtures (default: './fixtures') */
  basePath?: string;

  /** Enable fixture caching to improve performance (default: true) */
  cache?: boolean;

  /** Validate fixtures after loading (default: false) */
  validate?: boolean;

  /** Callback invoked after each fixture is loaded */
  onLoad?: (fixture: TestFixture) => void;
}
