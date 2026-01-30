/**
 * @file quantization.bench.ts
 * @description Benchmarks for QuantizationEngine
 *
 * Validates performance targets:
 * - 50-75% memory reduction
 * - <1ms quantization time for 1K vectors
 * - <1% accuracy loss
 * - Efficient large-scale quantization
 */

import { describe, it, expect } from 'vitest';
import { QuantizationEngine } from '../src/optimization/QuantizationEngine';

describe('Quantization Performance Benchmarks', () => {
  it('should achieve 75% memory reduction with int8', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));

    const originalBytes = vector.length * 4; // float32
    const quantized = engine.quantize(vector);
    const quantizedBytes = quantized.data.byteLength;

    const reductionPercent = ((originalBytes - quantizedBytes) / originalBytes) * 100;

    expect(reductionPercent).toBe(75);
    expect(engine.getStatistics().compressionRatio).toBeCloseTo(4, 1);
  });

  it('should achieve 75% memory reduction with int4', () => {
    const engine = new QuantizationEngine({ precision: 'int4' });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));

    const originalBytes = vector.length * 4; // float32
    const quantized = engine.quantize(vector);
    const quantizedBytes = quantized.data.byteLength;

    const reductionPercent = ((originalBytes - quantizedBytes) / originalBytes) * 100;

    expect(reductionPercent).toBeGreaterThanOrEqual(70); // ~87.5% for int4
  });

  it('should quantize 1K vectors in <1ms', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));

    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.quantize(vector);
    }

    const duration = performance.now() - start;
    const avgDuration = duration / iterations;

    console.log(`Average quantization time (1K): ${avgDuration.toFixed(3)}ms`);
    expect(avgDuration).toBeLessThan(1);
  });

  it('should dequantize 1K vectors in <0.5ms', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));
    const quantized = engine.quantize(vector);

    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.dequantize(quantized);
    }

    const duration = performance.now() - start;
    const avgDuration = duration / iterations;

    console.log(`Average dequantization time (1K): ${avgDuration.toFixed(3)}ms`);
    expect(avgDuration).toBeLessThan(0.5);
  });

  it('should maintain <1% accuracy loss', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));

    const quantized = engine.quantize(vector);
    const restored = engine.dequantize(quantized);

    const accuracy = calculateCosineSimilarity(vector, restored);
    const accuracyLoss = (1 - accuracy) * 100;

    console.log(`Accuracy loss (int8): ${accuracyLoss.toFixed(4)}%`);
    expect(accuracyLoss).toBeLessThan(1);
    expect(accuracy).toBeGreaterThan(0.99);
  });

  it('should handle 10K vectors efficiently', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 10000 }, (_, i) => Math.sin(i * 0.001));

    const start = performance.now();
    const quantized = engine.quantize(vector);
    const quantizeTime = performance.now() - start;

    const start2 = performance.now();
    const restored = engine.dequantize(quantized);
    const dequantizeTime = performance.now() - start2;

    console.log(`Quantization time (10K): ${quantizeTime.toFixed(3)}ms`);
    console.log(`Dequantization time (10K): ${dequantizeTime.toFixed(3)}ms`);

    expect(quantizeTime).toBeLessThan(10);
    expect(dequantizeTime).toBeLessThan(5);

    // Verify accuracy
    const accuracy = calculateCosineSimilarity(vector, restored);
    expect(accuracy).toBeGreaterThan(0.99);
  });

  it('should benchmark auto-selection performance', () => {
    const engine = new QuantizationEngine({ autoSelect: true });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));

    const start = performance.now();
    const precision = engine.selectPrecision(vector, 0.99);
    const duration = performance.now() - start;

    console.log(`Auto-selection time: ${duration.toFixed(3)}ms`);
    console.log(`Selected precision: ${precision}`);

    expect(duration).toBeLessThan(5); // <5ms target
    expect(['int4', 'int8', 'float16', 'float32']).toContain(precision);
  });

  it('should benchmark batch quantization', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const matrix = Array.from({ length: 100 }, () =>
      Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01))
    );

    const start = performance.now();
    const quantized = engine.quantizeMatrix(matrix);
    const duration = performance.now() - start;

    console.log(`Batch quantization (100x1K): ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(100); // <100ms for 100 vectors

    const stats = engine.getStatistics();
    console.log(`Total memory saved: ${(stats.memorySaved / 1024).toFixed(2)} KB`);
    console.log(`Compression ratio: ${stats.compressionRatio.toFixed(2)}x`);

    expect(quantized).toHaveLength(100);
    expect(stats.quantizedVectors).toBe(100);
  });

  it('should compare precision levels', () => {
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));
    const precisions = ['int4', 'int8', 'float16', 'float32'] as const;

    console.log('\n=== Precision Comparison ===');

    precisions.forEach(precision => {
      const engine = new QuantizationEngine({ precision });
      const quantized = engine.quantize(vector);
      const restored = engine.dequantize(quantized);

      const originalBytes = vector.length * 4;
      const quantizedBytes = quantized.data.byteLength;
      const reduction = ((originalBytes - quantizedBytes) / originalBytes) * 100;
      const accuracy = calculateCosineSimilarity(vector, restored);
      const accuracyLoss = (1 - accuracy) * 100;

      console.log(`\n${precision}:`);
      console.log(`  Memory reduction: ${reduction.toFixed(2)}%`);
      console.log(`  Compression ratio: ${(originalBytes / quantizedBytes).toFixed(2)}x`);
      console.log(`  Accuracy: ${(accuracy * 100).toFixed(4)}%`);
      console.log(`  Accuracy loss: ${accuracyLoss.toFixed(4)}%`);
    });
  });

  it('should benchmark memory efficiency', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vectors = Array.from({ length: 1000 }, () =>
      Array.from({ length: 1536 }, () => Math.random()) // OpenAI embedding size
    );

    const originalMemory = vectors.length * vectors[0].length * 4; // float32
    const quantized = engine.quantizeMatrix(vectors);
    const quantizedMemory = quantized.reduce((sum, q) => sum + q.data.byteLength, 0);

    const reduction = ((originalMemory - quantizedMemory) / originalMemory) * 100;

    console.log('\n=== Memory Efficiency (1K embeddings) ===');
    console.log(`Original: ${(originalMemory / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Quantized: ${(quantizedMemory / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Saved: ${((originalMemory - quantizedMemory) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Reduction: ${reduction.toFixed(2)}%`);

    expect(reduction).toBeGreaterThanOrEqual(70);
  });

  it('should validate throughput targets', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 1536 }, () => Math.random());

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.quantize(vector);
    }

    const duration = performance.now() - start;
    const throughput = (iterations / duration) * 1000; // vectors per second

    console.log(`\n=== Throughput ===`);
    console.log(`Quantized ${iterations} vectors in ${duration.toFixed(2)}ms`);
    console.log(`Throughput: ${throughput.toFixed(0)} vectors/second`);

    expect(throughput).toBeGreaterThan(10000); // >10K vectors/sec
  });
});

// Helper function
function calculateCosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 1.0;

  return dotProduct / denominator;
}
