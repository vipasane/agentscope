# @claude-flow/testing - API Quick Reference

## Import Paths

```typescript
// Main import (all utilities)
import { /* ... */ } from '@claude-flow/testing';

// Specific imports
import { /* helpers */ } from '@claude-flow/testing/helpers';
import { /* mocks */ } from '@claude-flow/testing/mocks';
import { /* fixtures */ } from '@claude-flow/testing/fixtures';
import { /* assertions */ } from '@claude-flow/testing/assertions';
import { /* performance */ } from '@claude-flow/testing/performance';
import { /* integration */ } from '@claude-flow/testing/integration';
```

## Test Helpers

### Core Functions
```typescript
// Context management
createTestContext(name: string, metadata?: Record<string, unknown>): TestContext
completeTestContext(context: TestContext, status: 'passed' | 'failed' | 'skipped', error?: Error): TestContext

// Performance metrics
createPerformanceMetrics(): PerformanceMetrics
completePerformanceMetrics(metrics: PerformanceMetrics, memoryUsed?: number, cpuUsed?: number): PerformanceMetrics

// Async utilities
sleep(ms: number): Promise<void>
retry(fn: () => Promise<T>, options?: AsyncTestOptions): Promise<T>
withTimeout(promise: Promise<T>, ms: number, message?: string): Promise<T>
waitFor(condition: () => boolean | Promise<boolean>, options?: { timeout?: number; interval?: number }): Promise<void>

// Measurement
measureAsyncExecution(fn: () => Promise<T>): Promise<{ result: T; duration: number }>
measureSyncExecution(fn: () => T): { result: T; duration: number }

// Utilities
captureConsoleOutput(): { capture: () => void; release: () => void; getOutput: () => CapturedOutput }
createDeferred(): Deferred<T>
cleanup(cleanupFns: Array<() => Promise<void> | void>): Promise<void>
formatDuration(ms: number): string
getMemoryUsageDelta(before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage): Record<string, number>
```

### Setup Helpers
```typescript
// Environment setup
setupTestEnvironment(options?: TestSetupOptions): { cleanup: () => void }
setupGlobalTestEnvironment(): void
setupPerTestEnvironment(): void

// Context creation
createFixtureContext(): TestFixtureContext
createDatabaseContext(connectionString: string): DatabaseTestContext
createMockServerContext(port?: number): MockServerContext

// Classes
class TestScope
  - addCleanup(fn: () => Promise<void> | void): void
  - cleanup(): Promise<void>
  - reset(): void

function createTestLogger(verbose?: boolean): TestLogger
  - debug(message, data?)
  - info(message, data?)
  - warn(message, data?)
  - error(message, error?)
  - getLogs(): string[]
```

### Teardown Helpers
```typescript
// Cleanup registration
registerCleanup(fn: () => Promise<void> | void): void
registerGlobalCleanup(fn: () => Promise<void> | void): void

// Classes
class CleanupManager
  - add(fn: () => Promise<void> | void, priority?: number): void
  - run(options?: TeardownOptions): Promise<void>
  - clear(): void

class TempFileCleanup
  - add(filePath: string): void
  - cleanup(): Promise<void>

function resetGlobalState(): GlobalStateReset
  - reset(): void
  - restore(): void

class ResourceCleanupTracker
  - track(resource: unknown, cleanup: () => Promise<void> | void): void
  - cleanupAll(): Promise<void>

class CleanupContext
  - initialize(): Promise<void>
  - add(fn: () => Promise<void> | void, priority?: number): void
  - cleanup(): Promise<void>

// Utilities
cleanupAndMeasureMemory(cleanup: () => Promise<void> | void): Promise<MemoryCleanupResult>
createAbortableOperation(): { controller: AbortController; cleanup: () => void }
```

## Mock Factories

### Core Mocks
```typescript
createMockAgent(overrides?: Partial<MockAgent>): MockAgent & {
  call(method: string, ...args: unknown[]): unknown
  recordCall(method: string, args: unknown[], result: unknown, duration: number): void
  recordError(error: Error): void
  getCallCount(method?: string): number
  getCalls(method?: string): AgentCall[]
  reset(): void
}

createMockMemory(): MockMemory & {
  store(key: string, value: unknown): void
  retrieve(key: string): unknown
  search(query: string): unknown[]
  delete(key: string): void
  clear(): void
  getSearchHistory(): SearchOperation[]
}

createMockCLIExecutor(): {
  execute(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>
  getHistory(): Array<{ command: string; args: string[] }>
  reset(): void
}

createMockHttpClient(): {
  get(url: string): Promise<{ status: number; data: unknown }>
  post(url: string, data: unknown): Promise<{ status: number; data: unknown }>
  getRequests(): Array<{ method: string; url: string; data?: unknown }>
  reset(): void
}

createMockEventEmitter(): {
  on(event: string, handler: (data: unknown) => void): void
  emit(event: string, data: unknown): void
  getEvents(): Array<{ event: string; data: unknown }>
  getListeners(event: string): Array<(data: unknown) => void>
  reset(): void
}

createMockLogger(): {
  log(level: string, message: string, data?: unknown): void
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, error?: unknown): void
  getLogs(level?: string): Array<{ level: string; message: string; data?: unknown }>
  reset(): void
}

createSpy<T>(fn?: T): {
  spy: T
  calls: Array<{ args: unknown[]; result: unknown; error?: Error }>
  callCount(): number
  getLastCall(): { args: unknown[]; result: unknown; error?: Error } | undefined
  reset(): void
}
```

### Agent Mocks
```typescript
createBehavioralMockAgent(behavior?: MockAgentBehavior): {
  execute(input: unknown): Promise<unknown>
  batch(inputs: unknown[]): Promise<unknown[]>
  getState(): { behavior: MockAgentBehavior }
  updateBehavior(updates: Partial<MockAgentBehavior>): void
}

createMockSwarmAgent(id?: string): {
  id: string
  spawn(workerId: string, config?: unknown): Promise<void>
  dispatch(task: unknown): Promise<string>
  getStatus(): Promise<{ workers: number; queuedTasks: number }>
  getWorkers(): Promise<string[]>
  getTasks(): Promise<Array<{ id: string; data: unknown }>>
  reset(): void
}

createMockCoordinator(): {
  register(agentId: string, agentType: string): Promise<void>
  coordinate(topic: string, data: unknown): Promise<unknown>
  getAgents(): Promise<Array<[string, { type: string; status: string }]>>
  getDecisions(): Promise<Array<{ topic: string; decision: unknown }>>
  reset(): void
}

createMockByzantineCoordinator(quorumSize?: number): {
  propose(id: string, value: unknown): Promise<void>
  vote(nodeId: string, proposalId: string, value: unknown): Promise<void>
  getConsensus(): Promise<unknown>
  getProposals(): Promise<Array<{ id: string; value: unknown; votes: number }>>
  reset(): void
}

createMockLearningAgent(): {
  recordTrajectory(action: string, result: unknown, reward: number): Promise<void>
  learn(): Promise<{ improvement: number; totalReward: number }>
  predict(input: unknown): Promise<unknown>
  getTrajectory(): Array<{ action: string; result: unknown; reward: number }>
  getTotalReward(): number
  reset(): void
}

createMockSecurityAgent(): {
  scan(input: unknown): Promise<'safe' | 'threat'>
  validateInput(input: unknown): Promise<boolean>
  getScans(): Promise<Array<{ input: unknown; result: 'safe' | 'threat' }>>
  getScanCount(): Promise<{ safe: number; threat: number }>
  reset(): void
}
```

### Memory Mocks
```typescript
createMockHNSWMemory(options?: MockMemoryOptions): {
  insert(key: string, value: unknown, embedding?: number[]): Promise<void>
  get(key: string): Promise<unknown | null>
  search(queryEmbedding: number[], k?: number): Promise<Array<{ key: string; value: unknown; distance: number }>>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  getSize(): Promise<number>
  getCapacity(): Promise<number>
  getAccessLog(): Promise<AccessLog[]>
  getStats(): Promise<{ size: number; capacity: number; accessCount: number; evictionCount: number }>
}

createMockHybridMemory(): {
  store(key: string, value: unknown, namespace?: string): Promise<void>
  retrieve(key: string, namespace?: string): Promise<unknown | null>
  persist(key: string, namespace?: string): Promise<void>
  flush(): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<{ inMemory: number; persistent: number; operations: number }>
}

createMockEmbeddingService(): {
  embed(text: string): Promise<number[]>
  similarity(text1: string, text2: string): Promise<number>
  batch(texts: string[]): Promise<number[][]>
  getEmbeddingCount(): number
  reset(): void
}

createMockSemanticIndex(): {
  index(id: string, text: string, embedding: number[]): Promise<void>
  search(query: string, embedding: number[], k?: number): Promise<Array<{ id: string; text: string; relevance: number }>>
  getStats(): Promise<{ documentCount: number; searchCount: number; avgSearchTime: number }>
  clear(): Promise<void>
}
```

## Fixtures

### FixtureLoader
```typescript
class FixtureLoader {
  load(name: string, type?: 'json' | 'yaml' | 'text' | 'buffer'): Promise<TestFixture>
  loadMany(names: string[], type?: 'json' | 'yaml' | 'text' | 'buffer'): Promise<TestFixture[]>
  createFixture(name: string, data: unknown, type?: 'json' | 'yaml' | 'text' | 'buffer'): TestFixture
  createFromTemplate(name: string, template: Record<string, unknown>, overrides?: Record<string, unknown>): TestFixture
  clear(): void
  getCached(): Map<string, TestFixture>
}
```

### FixtureBuilder
```typescript
class FixtureBuilder {
  set(key: string, value: unknown): this
  merge(obj: Record<string, unknown>): this
  setArray(key: string, count: number, factory: (i: number) => unknown): this
  setNested(path: string, value: unknown): this
  build(): TestFixture
  reset(): this
}
```

### FixtureRepository
```typescript
class FixtureRepository {
  register(name: string, fixture: TestFixture): void
  get(name: string): TestFixture | undefined
  getAll(): TestFixture[]
  query(predicate: (fixture: TestFixture) => boolean): TestFixture[]
  clear(): void
  count(): number
}
```

### CommonFixtures
```typescript
const CommonFixtures = {
  user(overrides?: Record<string, unknown>): TestFixture
  agent(overrides?: Record<string, unknown>): TestFixture
  task(overrides?: Record<string, unknown>): TestFixture
  memoryEntry(overrides?: Record<string, unknown>): TestFixture
  pattern(overrides?: Record<string, unknown>): TestFixture
}
```

### SnapshotManager
```typescript
class SnapshotManager {
  snapshot(name: string, data: unknown): string
  verify(name: string, data: unknown): boolean
  get(name: string): unknown
  clear(): void
}
```

## Custom Assertions

### Test Context
```typescript
expectTestContext(context: TestContext)
  .toHavePassed(): void
  .toHaveFailed(): void
  .toBeSkipped(): void
  .toHaveDuration(min: number, max: number): void
  .toHaveError(message?: string): void
  .toHaveMetadata(key: string, value?: unknown): void
```

### Agent
```typescript
expectAgent(agent: MockAgent)
  .toHaveCalled(method?: string): void
  .toHaveCalledTimes(times: number, method?: string): void
  .toHaveCalledWith(method: string, args: unknown[]): void
  .toHaveError(message?: string): void
  .toHaveErrorCount(count: number): void
  .toHaveInput(input: unknown): void
  .toHaveOutput(output: unknown): void
```

### Performance
```typescript
expectPerformance(metrics: PerformanceMetrics)
  .toBeWithinDuration(min: number, max: number): void
  .toHaveCallCount(count: number): void
  .toHaveCallCount_GreaterThan(count: number): void
  .toHaveCallCount_LessThan(count: number): void
  .toUseMemory(expectedMemory: number, tolerance?: number): void
  .toUseLessThanMemory(maxMemory: number): void
```

### Async
```typescript
expectAsync<T>(promise: Promise<T>)
  .toResolveWith(expected: T): Promise<void>
  .toRejectWith(message: string): Promise<void>
  .toResolveWithin(ms: number): Promise<void>
```

### Collections
```typescript
expectCollection<T>(collection: T[])
  .toContainItem(item: T): void
  .toContainItemMatching(predicate: (item: T) => boolean): void
  .toHaveLength(length: number): void
  .toBeEmpty(): void
  .toNotBeEmpty(): void
```

### Error
```typescript
expectError(error: Error | null)
  .toExist(): void
  .toNotExist(): void
  .toHaveMessage(message: string): void
  .toBeOfType(type: string): void
  .toHaveCode(code: string | number): void
```

### Structure
```typescript
expectStructure<T>(data: T)
  .toHaveProperties(props: (keyof T)[]): void
  .toHaveProperty(prop: keyof T, value?: unknown): void
  .toMatch(pattern: Partial<T>): void
```

## Performance Testing

### Benchmarker
```typescript
class Benchmarker {
  run<T>(name: string, fn: () => T | Promise<T>, iterations?: number): Promise<BenchmarkResult>
  compare<T>(label: string, fns: Array<{ name: string; fn: () => T | Promise<T> }>, iterations?: number): Promise<BenchmarkResult[]>
}

const benchmarker: Benchmarker
```

### MemoryProfiler
```typescript
class MemoryProfiler {
  snapshot(label?: string): NodeJS.MemoryUsage
  compare(before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage): void
}

const memoryProfiler: MemoryProfiler
```

### CPUProfiler
```typescript
class CPUProfiler {
  profile<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number; opsPerSec: number }>
}

const cpuProfiler: CPUProfiler
```

### LoadTester
```typescript
class LoadTester {
  test(fn: () => Promise<void>, options: { concurrency: number; duration: number; name?: string }): Promise<{
    totalRequests: number
    successCount: number
    errorCount: number
    avgDuration: number
    throughput: number
  }>
}

const loadTester: LoadTester
```

## Integration Testing

### IntegrationTestRunner
```typescript
class IntegrationTestRunner {
  add(name: string, fn: () => Promise<void>, timeout?: number): this
  run(setup?: () => Promise<void>, teardown?: () => Promise<void>): Promise<TestReport>
}
```

### E2ETestBuilder
```typescript
class E2ETestBuilder {
  addStep(name: string, fn: () => Promise<void>, rollback?: () => Promise<void>): this
  execute(): Promise<TestReport>
}
```

### ContractTestBuilder
```typescript
class ContractTestBuilder {
  addContract(name: string, provider: () => Promise<unknown>, consumer: (data: unknown) => Promise<void>): this
  verify(): Promise<TestReport>
}
```

### TestOrchestrator
```typescript
class TestOrchestrator {
  addSuite(name: string, tests: Array<() => Promise<void>>): this
  runAllSuites(): Promise<Map<string, TestReport>>
}
```

## Type Definitions

```typescript
interface TestContext {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  error?: Error
  metadata: Record<string, unknown>
}

interface MockAgent {
  id: string
  type: string
  inputs: unknown[]
  outputs: unknown[]
  errors: Error[]
  calls: AgentCall[]
  performance: PerformanceMetrics
}

interface PerformanceMetrics {
  startTime: number
  endTime?: number
  duration?: number
  memoryUsed?: number
  cpuUsed?: number
  calls: number
}

interface BenchmarkResult {
  name: string
  iterations: number
  meanDuration: number
  minDuration: number
  maxDuration: number
  stdDeviation: number
  throughput: number
  samples: number[]
}

interface TestReport {
  totalTests: number
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage: CoverageReport
  tests: TestContext[]
}
```

---

**For complete documentation**, see [README.md](./README.md)
