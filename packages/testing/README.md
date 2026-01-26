# @claude-flow/testing

Comprehensive test utilities for Claude Flow V3 - Shared test helpers, mocks, fixtures, and assertions for building reliable agent systems.

## Features

- **Test Helpers**: Setup/teardown utilities, async helpers, performance measurement
- **Mock Factories**: Pre-built mocks for agents, memory, CLI, HTTP clients, event emitters
- **Fixtures**: Fixture loader, builder, repository, and common fixtures
- **Custom Assertions**: Type-safe assertions for agents, memory, performance, and state
- **Performance Testing**: Benchmarking, memory profiling, CPU profiling, load testing
- **Integration Testing**: Test runners, E2E builders, contract testing, orchestration
- **Memory Utilities**: HNSW mock, hybrid memory, semantic search mocks
- **Security Testing**: Mock security agents, threat detection

## Installation

```bash
npm install @claude-flow/testing
```

## Quick Start

### Basic Testing

```typescript
import {
  createTestContext,
  createMockAgent,
  createMockMemory,
  expectAgent
} from '@claude-flow/testing';

describe('Agent', () => {
  it('should execute task', async () => {
    const agent = createMockAgent({ type: 'coder' });
    const memory = createMockMemory();

    agent.call('execute', { task: 'write code' });
    memory.store('result', { status: 'done' });

    expectAgent(agent).toHaveCalled('execute');
    expect(memory.retrieve('result')).toBeDefined();
  });
});
```

### Fixtures

```typescript
import {
  FixtureBuilder,
  CommonFixtures,
  FixtureRepository
} from '@claude-flow/testing';

it('should use fixtures', () => {
  // Create fixture
  const userFixture = CommonFixtures.user({
    name: 'John Doe'
  });

  // Build custom fixture
  const taskFixture = new FixtureBuilder()
    .set('title', 'Test Task')
    .setArray('subtasks', 3, (i) => ({ id: i, done: false }))
    .build();

  // Store in repository
  const repo = new FixtureRepository();
  repo.register('user', userFixture);
  repo.register('task', taskFixture);
});
```

### Performance Testing

```typescript
import {
  benchmarker,
  memoryProfiler,
  loadTester
} from '@claude-flow/testing';

async function testPerformance() {
  // Benchmark operations
  const results = await benchmarker.compare('String Operations', [
    {
      name: 'concat',
      fn: async () => 'a' + 'b' + 'c'
    },
    {
      name: 'template',
      fn: async () => `${'a'}${'b'}${'c'}`
    }
  ]);

  // Profile memory
  const before = memoryProfiler.snapshot('before');
  const largeArray = Array(1000000).fill(0);
  const after = process.memoryUsage();
  memoryProfiler.compare(before, after);

  // Load test
  await loadTester.test(
    async () => {
      await simulateRequest();
    },
    { concurrency: 50, duration: 10000 }
  );
}
```

### Integration Testing

```typescript
import {
  IntegrationTestRunner,
  E2ETestBuilder,
  ContractTestBuilder
} from '@claude-flow/testing';

// Sequential integration tests
const runner = new IntegrationTestRunner({
  timeout: 5000,
  retries: 2,
  parallel: false
});

runner
  .add('setup', async () => { /* ... */ })
  .add('execute', async () => { /* ... */ });

const report = await runner.run(
  async () => { /* setup */ },
  async () => { /* teardown */ }
);

// E2E with rollback
const e2e = new E2ETestBuilder();
e2e
  .addStep('create resource', createFn, rollbackFn)
  .addStep('verify resource', verifyFn);

await e2e.execute();

// Contract testing
const contracts = new ContractTestBuilder();
contracts.addContract('API', providerFn, consumerFn);
await contracts.verify();
```

## API Reference

### Test Helpers

```typescript
// Context management
createTestContext(name, metadata?)
completeTestContext(context, status, error?)

// Async utilities
sleep(ms)
retry(fn, options)
waitFor(condition, options)
withTimeout(promise, ms)

// Console capture
captureConsoleOutput()

// Performance measurement
measureAsyncExecution(fn)
measureSyncExecution(fn)

// Utilities
createDeferred<T>()
cleanup(cleanupFns)
formatDuration(ms)
getMemoryUsageDelta(before, after)
```

### Mock Factories

```typescript
// Core mocks
createMockAgent(overrides?)
createMockMemory()
createMockCLIExecutor()
createMockHttpClient()
createMockEventEmitter()
createMockLogger()
createSpy<T>(fn?)

// Agent-specific
createBehavioralMockAgent(behavior)
createMockSwarmAgent(id?)
createMockCoordinator()
createMockByzantineCoordinator(quorumSize?)
createMockLearningAgent()
createMockSecurityAgent()

// Memory-specific
createMockHNSWMemory(options?)
createMockHybridMemory()
createMockEmbeddingService()
createMockSemanticIndex()
```

### Fixtures

```typescript
// Loader
new FixtureLoader(options?)
  .load(name, type?)
  .loadMany(names, type?)
  .createFixture(name, data, type?)
  .createFromTemplate(name, template, overrides?)
  .clear()

// Builder
new FixtureBuilder()
  .set(key, value)
  .merge(obj)
  .setArray(key, count, factory)
  .setNested(path, value)
  .build()
  .reset()

// Repository
new FixtureRepository()
  .register(name, fixture)
  .get(name)
  .getAll()
  .query(predicate)
  .count()

// Common fixtures
CommonFixtures.user(overrides?)
CommonFixtures.agent(overrides?)
CommonFixtures.task(overrides?)
CommonFixtures.memoryEntry(overrides?)
CommonFixtures.pattern(overrides?)

// Snapshots
new SnapshotManager()
  .snapshot(name, data)
  .verify(name, data)
  .get(name)
  .clear()
```

### Custom Assertions

```typescript
// Test context
expectTestContext(context)
  .toHavePassed()
  .toHaveFailed()
  .toBeSkipped()
  .toHaveDuration(min, max)
  .toHaveError(message?)
  .toHaveMetadata(key, value?)

// Agent
expectAgent(agent)
  .toHaveCalled(method?)
  .toHaveCalledTimes(times, method?)
  .toHaveCalledWith(method, args)
  .toHaveError(message?)
  .toHaveErrorCount(count)
  .toHaveInput(input)
  .toHaveOutput(output)

// Performance
expectPerformance(metrics)
  .toBeWithinDuration(min, max)
  .toHaveCallCount(count)
  .toUseMemory(expected, tolerance?)
  .toUseLessThanMemory(max)

// Collections
expectCollection(collection)
  .toContainItem(item)
  .toContainItemMatching(predicate)
  .toHaveLength(length)
  .toBeEmpty()
  .toNotBeEmpty()

// Error handling
expectError(error)
  .toExist()
  .toNotExist()
  .toHaveMessage(message)
  .toBeOfType(type)
  .toHaveCode(code)

// Structure
expectStructure(data)
  .toHaveProperties(props)
  .toHaveProperty(prop, value?)
  .toMatch(pattern)
```

### Performance Testing

```typescript
// Benchmarking
benchmarker.run(name, fn, iterations?)
benchmarker.compare(label, fns, iterations?)

// Memory profiling
memoryProfiler.snapshot(label?)
memoryProfiler.compare(before, after)

// CPU profiling
cpuProfiler.profile(fn)

// Load testing
loadTester.test(fn, options)
```

### Integration Testing

```typescript
// Test runner
new IntegrationTestRunner(config?)
  .add(name, fn, timeout?)
  .run(setup?, teardown?)

// E2E builder
new E2ETestBuilder()
  .addStep(name, fn, rollback?)
  .execute()

// Contract tester
new ContractTestBuilder()
  .addContract(name, provider, consumer)
  .verify()

// Orchestrator
new TestOrchestrator()
  .addSuite(name, tests)
  .runAllSuites()
```

## Test Coverage

- Unit test utilities: >95% coverage
- Mock factories: >95% coverage
- Fixture utilities: >95% coverage
- Custom assertions: >95% coverage
- Performance utilities: >95% coverage
- Integration utilities: >95% coverage

## Examples

See the `examples/` directory for complete examples:

- `basic-testing.ts` - Basic test setup and assertions
- `fixture-testing.ts` - Fixture creation and management
- `performance-testing.ts` - Benchmarking and profiling
- `integration-testing.ts` - E2E and contract testing

## Best Practices

1. **Use mock factories** instead of creating mocks manually
2. **Leverage common fixtures** for consistent test data
3. **Test performance** from the start, not as an afterthought
4. **Use custom assertions** for readable test failures
5. **Isolate tests** with proper setup/teardown
6. **Snapshot for verification** when appropriate
7. **Load test critical paths** under realistic conditions
8. **Contract test** service boundaries
9. **Profile memory** for leak detection
10. **Benchmark performance** for regressions

## Advanced Usage

### Custom Assertions

```typescript
import { expect } from 'vitest';
import { expectAgent } from '@claude-flow/testing';

describe('Advanced Assertions', () => {
  it('should assert complex behavior', () => {
    const agent = createMockAgent();
    agent.call('process', [1, 2, 3]);

    expectAgent(agent)
      .toHaveCalled('process')
      .toHaveCalledTimes(1);

    const call = agent.getCalls()[0];
    expect(call.args[0]).toEqual([1, 2, 3]);
  });
});
```

### Custom Fixtures

```typescript
const complexFixture = new FixtureBuilder()
  .setNested('config.database.primary.host', 'localhost')
  .setNested('config.database.primary.port', 5432)
  .setArray('agents', 10, (i) => ({
    id: `agent-${i}`,
    type: i % 2 === 0 ? 'coder' : 'reviewer'
  }))
  .build();
```

### Performance Benchmarking

```typescript
const results = await benchmarker.run(
  'Complex Operation',
  async () => {
    return await expensiveOperation();
  },
  1000 // iterations
);

console.log(`Mean: ${results.meanDuration}ms`);
console.log(`Throughput: ${results.throughput} ops/sec`);
```

## Troubleshooting

### Tests are slow

Use `parallel: true` in IntegrationTestRunner for concurrent test execution.

### Memory leaks in tests

Use `memoryProfiler` to identify memory growth. Check cleanup functions are being called.

### Mock not recording calls

Ensure you're calling the mock through the correct interface (e.g., `agent.call()` not `agent.execute()`).

### Fixture data stale

Use `FixtureLoader` with `cache: false` for fresh data or call `.clear()` after each test.

## Contributing

Contributions welcome! Please ensure:

- Tests pass: `npm test`
- Coverage >95%: `npm run test:coverage`
- No lint errors: `npm run lint`
- Clean code: `npm run build`

## License

MIT

## Related Packages

- [@claude-flow/cli](https://github.com/ruvnet/claude-flow) - CLI tools
- [@claude-flow/core](https://github.com/ruvnet/claude-flow) - Core agents
- [@claude-flow/memory](https://github.com/ruvnet/claude-flow) - Memory systems
- [@claude-flow/security](https://github.com/ruvnet/claude-flow) - Security utilities

## Support

- GitHub Issues: https://github.com/ruvnet/claude-flow/issues
- Documentation: https://github.com/ruvnet/claude-flow/tree/main/packages/testing
- Examples: https://github.com/ruvnet/claude-flow/tree/main/packages/testing/examples
