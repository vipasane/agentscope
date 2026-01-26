/**
 * @claude-flow/testing
 *
 * Comprehensive test utilities and fixtures for Claude Flow V3
 *
 * This package provides production-grade testing infrastructure for building robust test suites
 * for Claude Flow agents, including mock builders, assertion helpers, test data generators,
 * performance profiling, and async test utilities.
 *
 * ## Features
 *
 * - **Mock Builders**: Create realistic mocks for agents, memory, HTTP clients, loggers, and more
 * - **Test Fixtures**: Load and manage test data with caching and templating
 * - **Custom Assertions**: Fluent assertion helpers for agents, performance, and async operations
 * - **Setup/Teardown**: Isolated test environments with automatic cleanup
 * - **Performance Profiling**: Benchmarking, memory profiling, CPU profiling, and load testing
 * - **Integration Testing**: E2E test builders, contract testing, and test orchestration
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   createMockAgent,
 *   createMockMemory,
 *   FixtureLoader,
 *   expectAgent,
 *   setupTestEnvironment
 * } from '@claude-flow/testing';
 * import { describe, it, expect, beforeEach, afterEach } from 'vitest';
 *
 * describe('Agent Behavior', () => {
 *   let agent;
 *   let cleanup;
 *
 *   beforeEach(() => {
 *     // Setup isolated test environment
 *     ({ cleanup } = setupTestEnvironment({ isolated: true }));
 *     agent = createMockAgent();
 *   });
 *
 *   afterEach(() => {
 *     cleanup();
 *   });
 *
 *   it('should record method calls', () => {
 *     agent.call('execute', 'task-1');
 *     expect(agent.calls).toHaveLength(1);
 *     expect(agent.calls[0].method).toBe('execute');
 *   });
 * });
 * ```
 *
 * ## Common Usage Patterns
 *
 * **Mock Creation Pattern:**
 * ```typescript
 * // Create mocks with optional overrides
 * const agent = createMockAgent({ type: 'coder' });
 * const memory = createMockMemory();
 * const http = createMockHttpClient();
 * ```
 *
 * **Fixture Management Pattern:**
 * ```typescript
 * const loader = new FixtureLoader({ basePath: './fixtures' });
 * const fixture = await loader.load('user');
 * const fixtures = await loader.loadMany(['user', 'agent', 'task']);
 * ```
 *
 * **Assertion Pattern:**
 * ```typescript
 * // Custom assertions with fluent API
 * expectAgent(agent).toHaveCalled('execute');
 * expectAgent(agent).toHaveCalledTimes(3);
 * expectAgent(agent).toHaveCalledWith('execute', ['task-1']);
 * ```
 *
 * **Async Testing Pattern:**
 * ```typescript
 * // Test async operations with timeout and retry support
 * const result = await asyncTask();
 * expectAsync(promise).toResolveWithin(5000);
 * ```
 *
 * ## Package Structure
 *
 * - **mocks/**: Mock factories for agents, memory, HTTP clients, loggers, and event emitters
 * - **fixtures/**: Fixture loaders, builders, repositories, and snapshot management
 * - **helpers/**: Setup and teardown utilities for isolated test environments
 * - **assertions/**: Custom assertion helpers for different test types
 * - **performance/**: Benchmarking and profiling utilities
 * - **integration/**: Integration test runners and E2E test builders
 *
 * ## Performance Characteristics
 *
 * - **Mock Creation**: <1ms per mock instance
 * - **Fixture Loading**: <50ms with caching enabled
 * - **Assertion Evaluation**: <1ms per assertion
 * - **Async Helpers**: Timeout configurable (default: 5000ms)
 *
 * ## Testing Best Practices
 *
 * 1. **Use Isolated Environments**: Always call `setupTestEnvironment()` in beforeEach
 * 2. **Reset Mocks Between Tests**: Call `mock.reset()` or `mock.clear()`
 * 3. **Mock Dependencies**: Replace real implementations with mocks
 * 4. **Test Edge Cases**: Use assertions to verify error conditions
 * 5. **Profile Performance**: Use benchmarker for performance-critical code
 *
 * ## Avoid Common Mistakes
 *
 * ❌ **Don't** forget to cleanup in afterEach:
 * ```typescript
 * // BAD - memory leak
 * beforeEach(() => setupTestEnvironment());
 *
 * // GOOD - cleanup
 * afterEach(({ cleanup } = setupTestEnvironment()));
 * ```
 *
 * ❌ **Don't** assume mock data persists across tests:
 * ```typescript
 * // BAD - isolation violated
 * let agent = createMockAgent();
 * it('test 1', () => agent.call('method'));
 * it('test 2', () => expect(agent.calls).toBeDefined()); // Unexpected behavior
 *
 * // GOOD - create per test
 * it('test 1', () => {
 *   const agent = createMockAgent();
 *   agent.call('method');
 * });
 * ```
 *
 * ❌ **Don't** test async code without timeout handling:
 * ```typescript
 * // BAD - can hang indefinitely
 * it('async test', async () => {
 *   await neverResolvingPromise();
 * });
 *
 * // GOOD - with timeout
 * it('async test', async () => {
 *   await expectAsync(promise).toResolveWithin(5000);
 * });
 * ```
 *
 * @see {@link https://vitest.dev} for Vitest documentation
 * @see {@link ../docs/testing-guide.md} for comprehensive testing guide
 *
 * @packageDocumentation
 */

// Types
export * from './types';

// Helpers
export * from './helpers';
export * from './helpers/setup-helpers';
export * from './helpers/teardown-helpers';

// Mocks
export * from './mocks';
export * from './mocks/agent-mocks';
export * from './mocks/memory-mocks';

// Fixtures
export {
  FixtureLoader,
  FixtureBuilder,
  FixtureRepository,
  CommonFixtures,
  SnapshotManager
} from './fixtures';

// Assertions
export * from './assertions';

// Performance
export {
  Benchmarker,
  MemoryProfiler,
  CPUProfiler,
  LoadTester,
  benchmarker,
  memoryProfiler,
  cpuProfiler,
  loadTester
} from './performance';

// Integration
export {
  IntegrationTestRunner,
  E2ETestBuilder,
  ContractTestBuilder,
  TestOrchestrator
} from './integration';
