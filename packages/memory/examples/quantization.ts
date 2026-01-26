/**
 * Quantization Example
 * Demonstrates 50-75% memory reduction with quantization
 */

import { createVectorDatabase } from '../src/index.js';

async function main() {
  console.log('=== Quantization Performance Example ===\n');

  const dimension = 1024;
  const vectorCount = 10000;

  // Test without quantization
  console.log('--- Without Quantization ---');
  const db1 = createVectorDatabase(dimension, {
    backend: 'memory',
    hnsw: { enabled: true, m: 16, efConstruction: 200, efSearch: 100 },
    quantization: { enabled: false, bits: 8 }
  });

  const insertStart1 = performance.now();
  for (let i = 0; i < vectorCount; i++) {
    const vector = randomVector(dimension);
    await db1.insert(`vec-${i}`, vector, { index: i });
  }
  await db1.buildHNSWIndex();
  const insertTime1 = performance.now() - insertStart1;

  const stats1 = await db1.getStats();
  console.log(`Insert Time: ${insertTime1.toFixed(0)} ms`);
  console.log(`Memory Used: ${(stats1.memoryUsed / 1024 / 1024).toFixed(2)} MB`);

  // Test with 8-bit quantization
  console.log('\n--- With 8-bit Quantization ---');
  const db2 = createVectorDatabase(dimension, {
    backend: 'memory',
    hnsw: { enabled: true, m: 16, efConstruction: 200, efSearch: 100 },
    quantization: { enabled: true, bits: 8, calibrationSamples: 100 }
  });

  const insertStart2 = performance.now();
  for (let i = 0; i < vectorCount; i++) {
    const vector = randomVector(dimension);
    await db2.insert(`vec-${i}`, vector, { index: i });
  }
  await db2.buildHNSWIndex();
  const insertTime2 = performance.now() - insertStart2;

  const stats2 = await db2.getStats();
  console.log(`Insert Time: ${insertTime2.toFixed(0)} ms`);
  console.log(`Memory Used: ${(stats2.memoryUsed / 1024 / 1024).toFixed(2)} MB`);

  if (stats2.quantization) {
    console.log(`Compression Ratio: ${stats2.quantization.compressionRatio.toFixed(2)}x`);
    console.log(`Accuracy: ${(stats2.quantization.accuracy * 100).toFixed(1)}%`);
  }

  // Compare search performance
  console.log('\n--- Search Performance Comparison ---');
  const query = randomVector(dimension);

  const searchStart1 = performance.now();
  const results1 = await db1.search(query, 10);
  const searchTime1 = performance.now() - searchStart1;

  const searchStart2 = performance.now();
  const results2 = await db2.search(query, 10);
  const searchTime2 = performance.now() - searchStart2;

  console.log(`Without Quantization: ${searchTime1.toFixed(2)} ms`);
  console.log(`With 8-bit Quantization: ${searchTime2.toFixed(2)} ms`);
  console.log(`Speedup: ${(searchTime1 / searchTime2).toFixed(2)}x`);

  // Memory savings
  const memorySaved = stats1.memoryUsed - stats2.memoryUsed;
  const savingsPercent = (memorySaved / stats1.memoryUsed) * 100;

  console.log('\n=== Summary ===');
  console.log(`Memory Saved: ${(memorySaved / 1024 / 1024).toFixed(2)} MB (${savingsPercent.toFixed(1)}%)`);
  console.log(`Search Performance: ${(searchTime1 / searchTime2).toFixed(2)}x faster`);
}

function randomVector(dimension: number): Float32Array {
  const vector = new Float32Array(dimension);
  for (let i = 0; i < dimension; i++) {
    vector[i] = Math.random() - 0.5;
  }
  return vector;
}

main().catch(console.error);
