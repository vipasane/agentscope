/**
 * Basic ReasoningBank usage example
 *
 * Demonstrates the 4-step learning pipeline:
 * 1. RETRIEVE - Learn from past experiences
 * 2. JUDGE - Evaluate outcomes
 * 3. DISTILL - Extract patterns
 * 4. CONSOLIDATE - Preserve knowledge
 */

import { ReasoningBank } from '@claude-flow/learning';
import { VectorDatabase } from '@claude-flow/memory';

async function main() {
  // Initialize vector database with HNSW indexing
  const vectorDB = new VectorDatabase({
    backend: 'hybrid',
    hnsw: {
      enabled: true,
      m: 16,
      efConstruction: 200,
      efSearch: 100,
    },
    quantization: {
      enabled: true,
      bits: 8,
    },
    gnn: {
      enabled: false,
    },
  });

  // Initialize ReasoningBank
  const learning = new ReasoningBank(vectorDB, {
    retrievalK: 5,
    minReward: 0.8,
    ewcLambda: 0.5,
    distillationEpochs: 10,
    learningRate: 0.001,
  });

  console.log('🧠 ReasoningBank Learning Example\n');

  // ==================== STEP 1: RETRIEVE ====================
  console.log('📚 STEP 1: RETRIEVE - Learn from past experiences');

  const taskDescription = 'Implement user authentication with JWT';

  const similarPatterns = await learning.retrieve(taskDescription, 5);

  if (similarPatterns.length > 0) {
    console.log(`Found ${similarPatterns.length} similar past experiences:`);
    similarPatterns.forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern.task} (reward: ${pattern.reward.toFixed(2)})`);
      console.log(`     ${pattern.critique}`);
    });
  } else {
    console.log('No past experiences found - learning from scratch!\n');
  }

  // ==================== EXECUTE TASK ====================
  console.log('\n💻 Executing task...');

  // Start tracking trajectory
  const trajectoryId = await learning.startTrajectory(
    'session-example-1',
    taskDescription,
    {
      requirements: 'JWT with refresh tokens',
      framework: 'Express.js',
    }
  );

  console.log(`Started trajectory: ${trajectoryId}`);

  // Simulate task execution with steps
  await learning.addTrajectoryStep(trajectoryId, {
    action: 'Install jsonwebtoken package',
    observation: 'Package installed successfully',
    thought: 'Need JWT library for token generation',
    timestamp: Date.now(),
  });

  await learning.addTrajectoryStep(trajectoryId, {
    action: 'Create User model with password hashing',
    observation: 'User model created with bcrypt',
    thought: 'Security best practice: never store plain passwords',
    timestamp: Date.now(),
  });

  await learning.addTrajectoryStep(trajectoryId, {
    action: 'Implement login endpoint',
    observation: 'POST /auth/login endpoint created',
    thought: 'Return JWT on successful authentication',
    timestamp: Date.now(),
  });

  await learning.addTrajectoryStep(trajectoryId, {
    action: 'Add JWT middleware for protected routes',
    observation: 'Middleware validates tokens on each request',
    thought: 'Centralized authentication check',
    timestamp: Date.now(),
  });

  await learning.addTrajectoryStep(trajectoryId, {
    action: 'Write tests for authentication flow',
    observation: 'All tests passing',
    thought: 'Comprehensive test coverage ensures security',
    timestamp: Date.now(),
  });

  // Complete trajectory
  const implementationResult = {
    files: ['models/User.js', 'routes/auth.js', 'middleware/auth.js'],
    testCoverage: 95,
    latency: '< 100ms',
  };

  await learning.endTrajectory(trajectoryId, implementationResult, true);

  console.log('✅ Task completed successfully\n');

  // ==================== STEP 2: JUDGE ====================
  console.log('⚖️  STEP 2: JUDGE - Evaluate the outcome');

  const verdict = await learning.judge(
    trajectoryId,
    true,
    0.95,
    'Excellent implementation with proper security practices. ' +
    'Good test coverage and efficient implementation.'
  );

  console.log(`Success: ${verdict.success}`);
  console.log(`Reward: ${verdict.reward.toFixed(2)}`);
  console.log(`Critique: ${verdict.critique}`);
  console.log(`Confidence: ${verdict.confidence?.toFixed(2)}`);

  if (verdict.improvements.length > 0) {
    console.log('Suggested improvements:');
    verdict.improvements.forEach((imp, i) => {
      console.log(`  ${i + 1}. ${imp}`);
    });
  }

  // ==================== STEP 3: DISTILL ====================
  console.log('\n🔬 STEP 3: DISTILL - Extract key learnings');

  const distilled = await learning.distill(trajectoryId);

  console.log(`Consolidated ${distilled.consolidationCount} patterns`);
  console.log(`Consolidated reward: ${distilled.consolidatedReward.toFixed(2)}`);

  if (distilled.keyLearnings.length > 0) {
    console.log('Key learnings:');
    distilled.keyLearnings.forEach((learning, i) => {
      console.log(`  ${i + 1}. ${learning}`);
    });
  }

  if (distilled.applicability.length > 0) {
    console.log('Applicable when:');
    distilled.applicability.forEach((condition, i) => {
      console.log(`  ${i + 1}. ${condition}`);
    });
  }

  if (distilled.antiPatterns.length > 0) {
    console.log('Anti-patterns to avoid:');
    distilled.antiPatterns.forEach((antiPattern, i) => {
      console.log(`  ${i + 1}. ${antiPattern}`);
    });
  }

  // ==================== STEP 4: CONSOLIDATE ====================
  console.log('\n🔒 STEP 4: CONSOLIDATE - Preserve knowledge with EWC++');

  await learning.consolidate(distilled);

  console.log('Pattern consolidated with catastrophic forgetting prevention');
  console.log('This knowledge will be preserved when learning new patterns\n');

  // ==================== STATISTICS ====================
  console.log('📊 Learning Statistics');

  const stats = await learning.getStats();

  console.log(`Total patterns: ${stats.totalPatterns}`);
  console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`Average reward: ${stats.avgReward.toFixed(2)}`);
  console.log(`Average latency: ${stats.avgLatencyMs.toFixed(0)}ms`);

  if (stats.topPatterns.length > 0) {
    console.log('\nTop patterns:');
    stats.topPatterns.slice(0, 3).forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern.task} (${pattern.reward.toFixed(2)})`);
    });
  }

  console.log('\n✨ Learning cycle complete!');
}

main().catch(console.error);
