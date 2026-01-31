/**
 * Main Test Runner for Integration Test Suite
 * Executes all test categories with self-learning
 */

import { TestOrchestrator, runIntegrationTests } from '../src/orchestrator.js';
import { TestScenario } from '../src/domain/orchestration/entities.js';
import {
  TestCategory,
  ScenarioId,
  PackageId,
  Duration
} from '../src/domain/orchestration/value-objects.js';
import { patternStorage } from '../src/learning/pattern-storage.js';

async function main() {
  console.log('🚀 AgentScope Cross-Package Integration Test Suite');
  console.log('=' .repeat(60));
  console.log('📦 Testing 4 packages:');
  console.log('  - @claude-flow/performance');
  console.log('  - @vipasane/agentscope-learning');
  console.log('  - @vipasane/agentscope-security');
  console.log('  - @claude-flow/cli-framework');
  console.log('='.repeat(60));
  console.log('');

  // Initialize orchestrator with configuration
  const orchestrator = new TestOrchestrator({
    parallelism: 4,
    timeout: 300, // 5 minutes
    environment: 'local'
  });

  // Register test suites for each category
  // Note: Actual test scenarios are defined in the test files
  // This is a placeholder to show the orchestration pattern

  const categories = [
    TestCategory.PERFORMANCE_LEARNING,
    TestCategory.SECURITY_LEARNING,
    TestCategory.CLI_SECURITY,
    TestCategory.ALL_PACKAGES
  ];

  console.log(`📋 Registered ${categories.length} test categories\n`);

  // Execute before hooks - search for similar patterns
  console.log('🧠 Checking learning system for previous patterns...');
  for (const category of categories) {
    const similar = await patternStorage.findSimilarSuccess(category);
    if (similar.length > 0) {
      console.log(`  Found ${similar.length} similar patterns for ${category}`);
    }
  }
  console.log('');

  // Run all integration tests
  const startTime = Date.now();
  const success = await runIntegrationTests(orchestrator);
  const totalDuration = Date.now() - startTime;

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Performance Target (<5min): ${totalDuration < 300000 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`All Tests Passed: ${success ? '✅ YES' : '❌ NO'}`);

  // Export learning data
  const learningData = patternStorage.exportForTraining();
  console.log('');
  console.log('🧠 Learning Statistics:');
  console.log(`  Success Patterns: ${learningData.successPatterns.length}`);
  console.log(`  Failure Patterns: ${learningData.failurePatterns.length}`);

  for (const category of categories) {
    const metrics = patternStorage.getPerformanceMetrics(category);
    if (metrics.totalTests > 0) {
      console.log(`\n  ${category}:`);
      console.log(`    Avg Reward: ${metrics.avgReward.toFixed(3)}`);
      console.log(`    Avg Time: ${metrics.avgExecutionTime.toFixed(2)}ms`);
      console.log(`    Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    }
  }

  console.log('');
  console.log('💡 Next Steps:');
  if (success) {
    console.log('  ✅ All tests passed! Integration is working correctly.');
    console.log('  ✅ Store patterns for future learning:');
    console.log('     npx @claude-flow/cli@latest memory store \\');
    console.log('       --namespace integration-patterns \\');
    console.log('       --key latest-run \\');
    console.log('       --value "$(cat test-results/results.json)"');
  } else {
    console.log('  ❌ Some tests failed. Review the failures above.');
    console.log('  ⚠️  Check test-results/report.md for detailed analysis.');
    console.log('  🔧 Auto-repair suggestions available in learning system.');
  }

  console.log('');

  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main };
