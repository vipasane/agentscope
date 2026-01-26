/**
 * Core types for @claude-flow/testing
 */

export interface TestContext {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  error?: Error;
  metadata: Record<string, unknown>;
}

export interface MockAgent {
  id: string;
  type: string;
  inputs: unknown[];
  outputs: unknown[];
  errors: Error[];
  calls: AgentCall[];
  performance: PerformanceMetrics;
}

export interface AgentCall {
  id: string;
  timestamp: number;
  method: string;
  args: unknown[];
  result?: unknown;
  error?: Error;
  duration: number;
}

export interface MockMemory {
  store: Map<string, unknown>;
  searchHistory: SearchOperation[];
  patterns: StoredPattern[];
}

export interface SearchOperation {
  id: string;
  query: string;
  timestamp: number;
  results: unknown[];
  duration: number;
}

export interface StoredPattern {
  key: string;
  value: unknown;
  namespace: string;
  timestamp: number;
  ttl?: number;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsed?: number;
  cpuUsed?: number;
  calls: number;
}

export interface TestFixture {
  name: string;
  path: string;
  data: unknown;
  type: 'json' | 'yaml' | 'text' | 'buffer';
  version?: string;
}

export interface TestSnapshot {
  id: string;
  name: string;
  timestamp: number;
  data: unknown;
  hash: string;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  meanDuration: number;
  minDuration: number;
  maxDuration: number;
  stdDeviation: number;
  throughput: number;
  samples: number[];
}

export interface IntegrationTestConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  setupTimeout: number;
  teardownTimeout: number;
}

export interface TestReport {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: CoverageReport;
  tests: TestContext[];
}

export interface CoverageReport {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface AsyncTestOptions {
  timeout?: number;
  retries?: number;
  backoff?: 'linear' | 'exponential';
  backoffMultiplier?: number;
}

export interface FixtureLoaderOptions {
  basePath?: string;
  cache?: boolean;
  validate?: boolean;
  onLoad?: (fixture: TestFixture) => void;
}
