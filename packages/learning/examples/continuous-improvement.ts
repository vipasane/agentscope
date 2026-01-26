/**
 * Continuous improvement example
 *
 * Shows how ReasoningBank learns from multiple iterations
 * and improves recommendations over time.
 */

import { ReasoningBank } from '@claude-flow/learning';
import { VectorDatabase } from '@claude-flow/memory';

async function runIteration(
  learning: ReasoningBank,
  iteration: number,
  success: boolean,
  reward: number
): Promise<void> {
  console.log(`\n--- Iteration ${iteration} ---`);

  // Retrieve past learnings
  const similar = await learning.retrieve('optimize database query', 3);

  if (similar.length > 0) {
    console.log('Learning from past attempts:');
    similar.forEach(p => {
      console.log(`  - ${p.critique} (reward: ${p.reward.toFixed(2)})`);
    });
  }

  // Execute task
  const id = await learning.startTrajectory(
    `session-${iteration}`,
    'optimize database query',
    { query: 'SELECT * FROM users WHERE active = true' }
  );

  // Simulate different approaches based on iteration
  if (iteration === 1) {
    await learning.addTrajectoryStep(id, {
      action: 'Add index on active column',
      observation: 'Index created',
      thought: 'Basic optimization',
      timestamp: Date.now(),
    });
  } else if (iteration === 2) {
    await learning.addTrajectoryStep(id, {
      action: 'Add index on active column',
      observation: 'Index exists',
      thought: 'Index already present from iteration 1',
      timestamp: Date.now(),
    });
    await learning.addTrajectoryStep(id, {
      action: 'Add query caching',
      observation: 'Cache layer added',
      thought: 'Reduce database hits',
      timestamp: Date.now(),
    });
  } else {
    await learning.addTrajectoryStep(id, {
      action: 'Use existing index and cache',
      observation: 'Both optimizations applied',
      thought: 'Leveraging past learnings',
      timestamp: Date.now(),
    });
    await learning.addTrajectoryStep(id, {
      action: 'Add query result pagination',
      observation: 'Pagination implemented',
      thought: 'Further optimization for large datasets',
      timestamp: Date.now(),
    });
  }

  await learning.endTrajectory(id, { latency: `${100 - iteration * 20}ms` }, success);

  // Judge and learn
  const verdict = await learning.judge(
    id,
    success,
    reward,
    `Iteration ${iteration}: ${success ? 'Successful' : 'Failed'} optimization`
  );

  console.log(`Result: ${verdict.success ? 'Success' : 'Failure'} (reward: ${verdict.reward.toFixed(2)})`);

  // Distill and consolidate
  const distilled = await learning.distill(id);
  await learning.consolidate(distilled);

  if (verdict.improvements.length > 0) {
    console.log('Improvements for next iteration:');
    verdict.improvements.forEach(imp => console.log(`  - ${imp}`));
  }
}

async function main() {
  const vectorDB = new VectorDatabase({
    backend: 'hybrid',
    hnsw: { enabled: true, m: 16, efConstruction: 200, efSearch: 100 },
    quantization: { enabled: true, bits: 8 },
    gnn: { enabled: false },
  });

  const learning = new ReasoningBank(vectorDB, {
    retrievalK: 5,
    minReward: 0.5, // Lower threshold to learn from failures
    ewcLambda: 0.5,
    distillationEpochs: 10,
    learningRate: 0.001,
  });

  console.log('🔄 Continuous Improvement Example\n');

  // Iteration 1: Basic optimization (moderate success)
  await runIteration(learning, 1, true, 0.6);

  // Iteration 2: Learning from iteration 1 (better success)
  await runIteration(learning, 2, true, 0.8);

  // Iteration 3: Applying accumulated learnings (best success)
  await runIteration(learning, 3, true, 0.95);

  // Show improvement over time
  console.log('\n📈 Improvement Analysis');

  const stats = await learning.getStats();

  console.log(`Total patterns learned: ${stats.totalPatterns}`);
  console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`Average reward: ${stats.avgReward.toFixed(2)}`);

  console.log('\nReward progression:');
  stats.topPatterns
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((p, i) => {
      console.log(`  Iteration ${i + 1}: ${p.reward.toFixed(2)}`);
    });

  console.log('\n✨ System improved from 0.6 → 0.95 reward through learning!');
}

main().catch(console.error);
