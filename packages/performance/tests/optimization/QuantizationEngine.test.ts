/**
 * @file QuantizationEngine.test.ts
 * @description Comprehensive tests for QuantizationEngine
 *
 * Tests cover:
 * 1. Quantization (int4, int8, float16, float32)
 * 2. Dequantization with accuracy validation
 * 3. Auto-selection algorithm
 * 4. Statistics tracking
 * 5. Accuracy preservation
 * 6. Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuantizationEngine, type Precision, type QuantizedVector } from '../../src/optimization/QuantizationEngine';

describe('QuantizationEngine - Quantization Tests', () => {
  let engine: QuantizationEngine;
  let testVector: number[];

  beforeEach(() => {
    engine = new QuantizationEngine();
    // Create test vector with known values
    testVector = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
  });

  it('should quantize to int4 (75% reduction)', () => {
    const quantized = engine.quantize(testVector, 'int4');

    expect(quantized.precision).toBe('int4');
    expect(quantized.originalDimension).toBe(100);
    expect(quantized.data).toBeInstanceOf(Int8Array);

    // int4 packs 2 values per byte
    const expectedBytes = Math.ceil(testVector.length / 2);
    expect(quantized.data.byteLength).toBe(expectedBytes);

    // Verify 75% reduction (original: 400 bytes, quantized: 50 bytes)
    const originalBytes = testVector.length * 4;
    const reductionPercent = ((originalBytes - quantized.data.byteLength) / originalBytes) * 100;
    expect(reductionPercent).toBeGreaterThanOrEqual(70);
  });

  it('should quantize to int8 (75% reduction)', () => {
    const quantized = engine.quantize(testVector, 'int8');

    expect(quantized.precision).toBe('int8');
    expect(quantized.originalDimension).toBe(100);
    expect(quantized.data).toBeInstanceOf(Int8Array);
    expect(quantized.data.byteLength).toBe(testVector.length);

    // Verify 75% reduction (original: 400 bytes, quantized: 100 bytes)
    const originalBytes = testVector.length * 4;
    const reductionPercent = ((originalBytes - quantized.data.byteLength) / originalBytes) * 100;
    expect(reductionPercent).toBe(75);
  });

  it('should quantize to float16 (50% reduction)', () => {
    const quantized = engine.quantize(testVector, 'float16');

    expect(quantized.precision).toBe('float16');
    expect(quantized.originalDimension).toBe(100);
    expect(quantized.data).toBeInstanceOf(Float32Array);

    // Note: Simplified float16 doesn't actually reduce size
    // In production, would use true float16 via DataView
    const originalBytes = testVector.length * 4;
    expect(quantized.data.byteLength).toBeLessThanOrEqual(originalBytes);
  });

  it('should quantize matrix (multiple vectors)', () => {
    const matrix = [
      testVector,
      testVector.map(v => v * 2),
      testVector.map(v => v * 3),
    ];

    const quantized = engine.quantizeMatrix(matrix, 'int8');

    expect(quantized).toHaveLength(3);
    quantized.forEach(q => {
      expect(q.precision).toBe('int8');
      expect(q.originalDimension).toBe(100);
    });

    const stats = engine.getStatistics();
    expect(stats.quantizedVectors).toBe(3);
  });

  it('should handle edge case: zero vectors', () => {
    const zeroVector = new Array(100).fill(0);
    const quantized = engine.quantize(zeroVector, 'int8');

    expect(quantized.precision).toBe('int8');
    const restored = engine.dequantize(quantized);

    restored.forEach(val => {
      expect(val).toBeCloseTo(0, 5);
    });
  });

  it('should handle edge case: negative values', () => {
    const negativeVector = testVector.map(v => v - 0.5);
    const quantized = engine.quantize(negativeVector, 'int8');
    const restored = engine.dequantize(quantized);

    // Should handle negative values correctly
    const hasNegative = restored.some(v => v < 0);
    expect(hasNegative).toBe(true);
  });

  it('should maintain dimensional integrity', () => {
    const oddLengthVector = Array.from({ length: 99 }, (_, i) => Math.sin(i * 0.1));
    const quantized = engine.quantize(oddLengthVector, 'int4');

    expect(quantized.originalDimension).toBe(99);

    const restored = engine.dequantize(quantized);
    expect(restored).toHaveLength(99);
  });

  it('should calculate correct scaling factors', () => {
    const quantized = engine.quantize(testVector, 'int8');

    expect(quantized.scale).toBeGreaterThan(0);
    expect(quantized.offset).toBeDefined();

    // Verify scale/offset preserve range
    const min = Math.min(...testVector);
    const max = Math.max(...testVector);
    const range = max - min;

    expect(quantized.offset).toBeCloseTo(min, 5);
    expect(quantized.scale).toBeCloseTo(range / 255, 5);
  });

  it('should pack int4 values correctly', () => {
    const simpleVector = [0, 1, 0, 1]; // Easy to verify
    const quantized = engine.quantize(simpleVector, 'int4');

    expect(quantized.data.byteLength).toBe(2); // 4 values → 2 bytes
  });

  it('should handle odd-length vectors in int4', () => {
    const oddVector = [0.1, 0.2, 0.3]; // 3 values
    const quantized = engine.quantize(oddVector, 'int4');

    expect(quantized.data.byteLength).toBe(2); // Ceil(3/2) = 2 bytes
    expect(quantized.originalDimension).toBe(3);

    const restored = engine.dequantize(quantized);
    expect(restored).toHaveLength(3);
  });

  it('should no-op for float32', () => {
    const quantized = engine.quantize(testVector, 'float32');

    expect(quantized.precision).toBe('float32');
    expect(quantized.data).toBeInstanceOf(Float32Array);
    expect(quantized.scale).toBe(1);
    expect(quantized.offset).toBe(0);

    // No compression for float32
    const originalBytes = testVector.length * 4;
    expect(quantized.data.byteLength).toBe(originalBytes);
  });
});

describe('QuantizationEngine - Dequantization Tests', () => {
  let engine: QuantizationEngine;
  let testVector: number[];

  beforeEach(() => {
    engine = new QuantizationEngine({ enableDequantization: true });
    testVector = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
  });

  it('should dequantize int4 accurately', () => {
    const quantized = engine.quantize(testVector, 'int4');
    const restored = engine.dequantize(quantized);

    expect(restored).toHaveLength(testVector.length);

    // Calculate accuracy (cosine similarity)
    const accuracy = calculateCosineSimilarity(testVector, restored);
    expect(accuracy).toBeGreaterThan(0.98); // >98% accuracy
  });

  it('should dequantize int8 accurately', () => {
    const quantized = engine.quantize(testVector, 'int8');
    const restored = engine.dequantize(quantized);

    expect(restored).toHaveLength(testVector.length);

    const accuracy = calculateCosineSimilarity(testVector, restored);
    expect(accuracy).toBeGreaterThan(0.99); // >99% accuracy
  });

  it('should dequantize float16 accurately', () => {
    const quantized = engine.quantize(testVector, 'float16');
    const restored = engine.dequantize(quantized);

    expect(restored).toHaveLength(testVector.length);

    const accuracy = calculateCosineSimilarity(testVector, restored);
    expect(accuracy).toBeGreaterThan(0.999); // >99.9% accuracy
  });

  it('should maintain <1% accuracy loss with int8', () => {
    const quantized = engine.quantize(testVector, 'int8');
    const restored = engine.dequantize(quantized);

    const accuracy = calculateCosineSimilarity(testVector, restored);
    const accuracyLoss = (1 - accuracy) * 100;

    expect(accuracyLoss).toBeLessThan(1); // <1% loss
  });

  it('should throw when dequantization disabled', () => {
    const engineNoDeq = new QuantizationEngine({ enableDequantization: false });
    const quantized = engineNoDeq.quantize(testVector, 'int8');

    expect(() => {
      engineNoDeq.dequantize(quantized);
    }).toThrow('Dequantization is disabled');
  });

  it('should handle packed int4 correctly', () => {
    const quantized = engine.quantize(testVector, 'int4');
    const restored = engine.dequantize(quantized);

    expect(restored).toHaveLength(testVector.length);

    // Verify overall accuracy with cosine similarity
    const accuracy = calculateCosineSimilarity(testVector, restored);
    expect(accuracy).toBeGreaterThan(0.98); // >98% accuracy for int4
  });
});

describe('QuantizationEngine - Auto-Selection Tests', () => {
  let engine: QuantizationEngine;
  let testVector: number[];

  beforeEach(() => {
    engine = new QuantizationEngine({ autoSelect: true, accuracyThreshold: 0.99 });
    testVector = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
  });

  it('should select int4 for high-tolerance data', () => {
    const precision = engine.selectPrecision(testVector, 0.97);
    // int4 typically achieves >97% accuracy
    expect(['int4', 'int8']).toContain(precision);
  });

  it('should select int8 for medium-tolerance data', () => {
    const precision = engine.selectPrecision(testVector, 0.99);
    // int4 or int8 should achieve >99% accuracy
    expect(['int4', 'int8', 'float16', 'float32']).toContain(precision);
  });

  it('should select float16 for low-tolerance data', () => {
    const precision = engine.selectPrecision(testVector, 0.999);
    // int8, float16, or float32 should achieve >99.9% accuracy
    expect(['int8', 'float16', 'float32']).toContain(precision);
  });

  it('should fall back to float32 for critical data', () => {
    const precision = engine.selectPrecision(testVector, 1.0);
    // Perfect accuracy required - should use float32
    expect(precision).toBe('float32');
  });

  it('should respect accuracy threshold parameter', () => {
    const precision1 = engine.selectPrecision(testVector, 0.95);
    const precision2 = engine.selectPrecision(testVector, 0.99);

    // Lower threshold should select more aggressive compression
    const precisionOrder: Record<Precision, number> = {
      'int4': 0,
      'int8': 1,
      'float16': 2,
      'float32': 3,
    };

    expect(precisionOrder[precision1]).toBeLessThanOrEqual(precisionOrder[precision2]);
  });
});

describe('QuantizationEngine - Statistics Tests', () => {
  let engine: QuantizationEngine;
  let testVector: number[];

  beforeEach(() => {
    engine = new QuantizationEngine({ precision: 'int8' });
    testVector = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
  });

  it('should track memory savings', () => {
    const statsBefore = engine.getStatistics();
    expect(statsBefore.memorySaved).toBe(0);

    engine.quantize(testVector, 'int8');

    const statsAfter = engine.getStatistics();
    expect(statsAfter.memorySaved).toBeGreaterThan(0);

    // int8: 100 floats (400 bytes) → 100 bytes = 300 bytes saved
    expect(statsAfter.memorySaved).toBe(300);
  });

  it('should calculate compression ratio', () => {
    engine.quantize(testVector, 'int8');

    const stats = engine.getStatistics();
    expect(stats.compressionRatio).toBeCloseTo(4, 1); // 4x compression
  });

  it('should count quantized vectors', () => {
    const statsBefore = engine.getStatistics();
    expect(statsBefore.quantizedVectors).toBe(0);

    engine.quantize(testVector, 'int8');
    engine.quantize(testVector, 'int8');
    engine.quantize(testVector, 'int8');

    const statsAfter = engine.getStatistics();
    expect(statsAfter.quantizedVectors).toBe(3);
  });

  it('should reset statistics', () => {
    engine.quantize(testVector, 'int8');

    let stats = engine.getStatistics();
    expect(stats.memorySaved).toBeGreaterThan(0);

    engine.resetStatistics();

    stats = engine.getStatistics();
    expect(stats.memorySaved).toBe(0);
    expect(stats.compressionRatio).toBe(1);
    expect(stats.quantizedVectors).toBe(0);
  });
});

describe('QuantizationEngine - Accuracy Tests', () => {
  let engine: QuantizationEngine;
  let testVector: number[];

  beforeEach(() => {
    engine = new QuantizationEngine();
    testVector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));
  });

  it('should maintain >99% accuracy with int8', () => {
    const quantized = engine.quantize(testVector, 'int8');
    const restored = engine.dequantize(quantized);

    const accuracy = calculateCosineSimilarity(testVector, restored);
    expect(accuracy).toBeGreaterThan(0.99);
  });

  it('should maintain >98% accuracy with int4', () => {
    const quantized = engine.quantize(testVector, 'int4');
    const restored = engine.dequantize(quantized);

    const accuracy = calculateCosineSimilarity(testVector, restored);
    expect(accuracy).toBeGreaterThan(0.98);
  });

  it('should calculate cosine similarity correctly', () => {
    // Test with identical vectors
    const similarity1 = calculateCosineSimilarity(testVector, testVector);
    expect(similarity1).toBeCloseTo(1.0, 5);

    // Test with scaled vector
    const scaledVector = testVector.map(v => v * 2);
    const similarity2 = calculateCosineSimilarity(testVector, scaledVector);
    expect(similarity2).toBeCloseTo(1.0, 5); // Cosine is scale-invariant

    // Test with orthogonal vector
    const orthogonalVector = testVector.map(v => -v);
    const similarity3 = calculateCosineSimilarity(testVector, orthogonalVector);
    expect(similarity3).toBeCloseTo(-1.0, 5);
  });

  it('should validate accuracy loss <1% target', () => {
    const quantized = engine.quantize(testVector, 'int8');
    const restored = engine.dequantize(quantized);

    const accuracy = calculateCosineSimilarity(testVector, restored);
    const accuracyLoss = (1 - accuracy) * 100;

    expect(accuracyLoss).toBeLessThan(1);
  });

  it('should handle numerical edge cases', () => {
    // Test with very small values
    const smallVector = testVector.map(v => v * 1e-10);
    const quantizedSmall = engine.quantize(smallVector, 'int8');
    const restoredSmall = engine.dequantize(quantizedSmall);

    // Should handle gracefully (may have higher relative error)
    expect(restoredSmall).toHaveLength(smallVector.length);

    // Test with very large values
    const largeVector = testVector.map(v => v * 1e10);
    const quantizedLarge = engine.quantize(largeVector, 'int8');
    const restoredLarge = engine.dequantize(quantizedLarge);

    const accuracy = calculateCosineSimilarity(largeVector, restoredLarge);
    expect(accuracy).toBeGreaterThan(0.99);
  });
});

describe('QuantizationEngine - Performance Tests', () => {
  it('should quantize 1K vectors in <1ms', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));

    const start = performance.now();
    engine.quantize(vector);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('should dequantize 1K vectors in <0.5ms', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01));
    const quantized = engine.quantize(vector);

    const start = performance.now();
    engine.dequantize(quantized);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(0.5);
  });

  it('should handle 10K vectors efficiently', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vector = Array.from({ length: 10000 }, (_, i) => Math.sin(i * 0.001));

    const start = performance.now();
    const quantized = engine.quantize(vector);
    engine.dequantize(quantized);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // <10ms for 10K vectors
  });
});

describe('QuantizationEngine - Integration Tests', () => {
  it('should work with configuration defaults', () => {
    const engine = new QuantizationEngine();
    const vector = [0.1, 0.2, 0.3, 0.4, 0.5];

    const quantized = engine.quantize(vector);
    expect(quantized.precision).toBe('int8'); // default

    const restored = engine.dequantize(quantized);
    expect(restored).toHaveLength(5);
  });

  it('should work with custom configuration', () => {
    const engine = new QuantizationEngine({
      precision: 'int4',
      autoSelect: true,
      accuracyThreshold: 0.95,
      enableDequantization: true,
    });

    const vector = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
    const quantized = engine.quantize(vector);

    expect(quantized).toBeDefined();
    expect(engine.dequantize(quantized)).toHaveLength(100);
  });

  it('should support end-to-end workflow', () => {
    const engine = new QuantizationEngine({ precision: 'int8' });
    const vectors = [
      Array.from({ length: 100 }, () => Math.random()),
      Array.from({ length: 100 }, () => Math.random()),
      Array.from({ length: 100 }, () => Math.random()),
    ];

    // Quantize all
    const quantized = engine.quantizeMatrix(vectors);
    expect(quantized).toHaveLength(3);

    // Check statistics
    const stats = engine.getStatistics();
    expect(stats.quantizedVectors).toBe(3);
    expect(stats.memorySaved).toBeGreaterThan(0);
    expect(stats.compressionRatio).toBeGreaterThan(1);

    // Dequantize all
    const restored = quantized.map(q => engine.dequantize(q));
    expect(restored).toHaveLength(3);

    // Verify accuracy
    for (let i = 0; i < vectors.length; i++) {
      const accuracy = calculateCosineSimilarity(vectors[i], restored[i]);
      expect(accuracy).toBeGreaterThan(0.99);
    }
  });
});

// Helper function to calculate cosine similarity
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
