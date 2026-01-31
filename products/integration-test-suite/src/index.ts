/**
 * Cross-Package Integration Test Suite
 * Entry point for all exports
 */

// Domain exports - Orchestration
export {
  TestSuite,
  type TestResult
} from './domain/orchestration/aggregates.js';

export {
  TestScenario,
  TestExecution,
  ExecutionStatus,
  DomainError,
  type ScenarioResult
} from './domain/orchestration/entities.js';

export {
  TestSuiteId,
  ScenarioId,
  PackageId,
  Duration,
  TestConfiguration,
  TestCategory,
  RetryStrategy,
  TestEnvironment
} from './domain/orchestration/value-objects.js';

// Domain exports - Data Generation
export {
  PerformanceDataFactory,
  LearningDataFactory,
  SecurityDataFactory,
  CLIDataFactory,
  IntegrationTestDataFactory,
  type FlashAttentionTestData,
  type HNSWTestData,
  type ReasoningBankTestData,
  type MaliciousInputTestData,
  type ValidInputTestData,
  type CLITestData
} from './domain/data-generation/factories.js';

// Learning exports
export {
  PatternStorage,
  patternStorage,
  type TestPattern,
  type FailurePattern
} from './learning/pattern-storage.js';

// Orchestrator exports
export {
  TestOrchestrator,
  runIntegrationTests,
  type OrchestratorConfig,
  type ExecutionSummary
} from './orchestrator.js';

// Re-export main runner
export { main as runAllTests } from '../tests/run-all-tests.js';
