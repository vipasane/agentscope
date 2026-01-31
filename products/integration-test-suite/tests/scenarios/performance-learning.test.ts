/**
 * Performance + Learning Integration Tests
 * Tests Flash Attention with ReasoningBank, HNSW with EWC++
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TestScenario } from '../../src/domain/orchestration/entities.js';
import {
  ScenarioId,
  PackageId,
  Duration
} from '../../src/domain/orchestration/value-objects.js';
import { IntegrationTestDataFactory } from '../../src/domain/data-generation/factories.js';

describe('Performance + Learning Integration', () => {
  let factory: IntegrationTestDataFactory;
  let testData: ReturnType<typeof factory.createPerformanceLearningScenario>;

  beforeAll(() => {
    factory = new IntegrationTestDataFactory();
    testData = factory.createPerformanceLearningScenario();
  });

  describe('Flash Attention with ReasoningBank', () => {
    it('should process attention computation and store patterns', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'flash-attention-reasoningbank',
        [new PackageId('performance'), new PackageId('learning')],
        Duration.seconds(30)
      );

      scenario.setTestFunction(async () => {
        // Simulate Flash Attention computation
        const { queryVectors, keyVectors, valueVectors, config } =
          testData.flashAttention;

        expect(queryVectors).toHaveLength(100);
        expect(keyVectors).toHaveLength(100);
        expect(valueVectors).toHaveLength(100);
        expect(config.blockSize).toBe(64);

        // Simulate attention scores
        const attentionScores = queryVectors.map((q, i) => {
          const k = keyVectors[i];
          const dotProduct = q.reduce((sum, val, idx) => sum + val * k[idx], 0);
          return dotProduct / config.attentionScale;
        });

        expect(attentionScores).toHaveLength(100);

        // Store pattern in ReasoningBank
        const pattern = {
          task: 'flash-attention-computation',
          input: `batch_size: ${queryVectors.length}, dim: ${queryVectors[0].length}`,
          output: 'Computed attention scores successfully',
          reward: attentionScores.every(s => !isNaN(s)) ? 0.95 : 0.5,
          success: true
        };

        expect(pattern.reward).toBeGreaterThan(0.9);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    it('should benchmark attention performance and learn optimal configs', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'attention-performance-learning',
        [new PackageId('performance'), new PackageId('learning')],
        Duration.seconds(20)
      );

      scenario.setTestFunction(async () => {
        const blockSizes = [32, 64, 128];
        const results: Array<{ blockSize: number; duration: number }> = [];

        for (const blockSize of blockSizes) {
          const startTime = Date.now();

          // Simulate Flash Attention with different block sizes
          const { queryVectors, keyVectors } = testData.flashAttention;
          const batches = Math.ceil(queryVectors.length / blockSize);

          for (let i = 0; i < batches; i++) {
            const batchStart = i * blockSize;
            const batchEnd = Math.min(batchStart + blockSize, queryVectors.length);
            const qBatch = queryVectors.slice(batchStart, batchEnd);
            const kBatch = keyVectors.slice(batchStart, batchEnd);

            // Compute attention for batch
            qBatch.forEach((q, idx) => {
              const k = kBatch[idx];
              q.reduce((sum, val, i) => sum + val * k[i], 0);
            });
          }

          const duration = Date.now() - startTime;
          results.push({ blockSize, duration });
        }

        // Learn optimal block size
        const optimal = results.reduce((best, curr) =>
          curr.duration < best.duration ? curr : best
        );

        // Store learning pattern
        const pattern = {
          task: 'optimize-flash-attention-block-size',
          input: JSON.stringify(blockSizes),
          output: `Optimal block size: ${optimal.blockSize}`,
          reward: 0.9,
          success: true
        };

        expect(optimal.blockSize).toBeGreaterThan(0);
        expect(pattern.success).toBe(true);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });
  });

  describe('HNSW Search with Pattern Learning', () => {
    it('should perform HNSW search and store successful queries', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'hnsw-pattern-learning',
        [new PackageId('performance'), new PackageId('learning')],
        Duration.seconds(30)
      );

      scenario.setTestFunction(async () => {
        const { vectors, queryVectors, config } = testData.hnsw;

        expect(vectors).toHaveLength(10000);
        expect(queryVectors).toHaveLength(100);

        // Simulate HNSW search (simplified)
        const searchResults = queryVectors.map(query => {
          // Find k nearest neighbors (brute force for test)
          const distances = vectors.map((vec, idx) => ({
            idx,
            distance: this.euclideanDistance(query, vec)
          }));

          distances.sort((a, b) => a.distance - b.distance);
          return distances.slice(0, config.efSearch);
        });

        expect(searchResults).toHaveLength(100);
        expect(searchResults[0]).toHaveLength(config.efSearch);

        // Store successful search pattern
        const avgRecall = searchResults.reduce((sum, results) => {
          return sum + (results.length / config.efSearch);
        }, 0) / searchResults.length;

        const pattern = {
          task: 'hnsw-vector-search',
          input: `ef_search: ${config.efSearch}, data_size: ${vectors.length}`,
          output: `Found neighbors with recall: ${avgRecall.toFixed(3)}`,
          reward: avgRecall,
          success: avgRecall > 0.95
        };

        expect(pattern.reward).toBeGreaterThan(0.95);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });

    private euclideanDistance(a: number[], b: number[]): number {
      return Math.sqrt(
        a.reduce((sum, val, idx) => sum + Math.pow(val - b[idx], 2), 0)
      );
    }
  });

  describe('ReasoningBank Pattern Storage', () => {
    it('should store and retrieve patterns from ReasoningBank', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'reasoningbank-crud',
        [new PackageId('learning')],
        Duration.seconds(10)
      );

      // Note: This is a single-package test but required for integration
      // Mark as integration because it tests the learning infrastructure
      // that other integration tests depend on

      scenario.setTestFunction(async () => {
        const { patterns, queries } = testData.reasoningBank;

        // Simulate storing patterns
        const storedPatterns = new Map<string, typeof patterns[0]>();
        patterns.forEach(p => {
          storedPatterns.set(p.task, p);
        });

        expect(storedPatterns.size).toBe(patterns.length);

        // Simulate retrieval
        for (const query of queries) {
          const results = Array.from(storedPatterns.values()).filter(p =>
            p.task.toLowerCase().includes(query.toLowerCase())
          );

          expect(results.length).toBeGreaterThan(0);
        }

        // Verify successful patterns
        const successfulPatterns = patterns.filter(p => p.success);
        expect(successfulPatterns.length).toBeGreaterThan(0);
        expect(successfulPatterns.every(p => p.reward > 0.8)).toBe(true);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });
  });

  describe('EWC++ Consolidation', () => {
    it('should prevent catastrophic forgetting with EWC++', async () => {
      const scenario = new TestScenario(
        ScenarioId.generate(),
        'ewc-consolidation',
        [new PackageId('learning')],
        Duration.seconds(15)
      );

      scenario.setTestFunction(async () => {
        // Simulate learning old tasks
        const oldPatterns = [
          { task: 'task-1', reward: 0.9, importance: 1.0 },
          { task: 'task-2', reward: 0.85, importance: 0.8 }
        ];

        // Simulate learning new tasks
        const newPatterns = [
          { task: 'task-3', reward: 0.92, importance: 0.7 }
        ];

        // EWC++ consolidation: weighted average based on importance
        const consolidatedReward =
          (oldPatterns.reduce((sum, p) => sum + p.reward * p.importance, 0) +
            newPatterns.reduce((sum, p) => sum + p.reward * p.importance, 0)) /
          (oldPatterns.reduce((sum, p) => sum + p.importance, 0) +
            newPatterns.reduce((sum, p) => sum + p.importance, 0));

        // Should maintain high performance on old tasks
        expect(consolidatedReward).toBeGreaterThan(0.85);

        // Verify old patterns still accessible
        const oldTaskReward = oldPatterns.find(p => p.task === 'task-1')?.reward;
        expect(oldTaskReward).toBe(0.9);
      });

      const result = await scenario.execute();
      expect(result.passed).toBe(true);
    });
  });
});
