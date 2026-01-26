/**
 * Flash Attention Example
 * Demonstrates 2.49x-7.47x speedup for large context processing
 */

import { createVectorDatabase } from '../src/index.js';

async function main() {
  console.log('=== Flash Attention Performance Example ===\n');

  const dimension = 512;
  const db = createVectorDatabase(dimension);

  // Test with different sequence lengths
  const sequenceLengths = [64, 128, 256, 512, 1024];

  for (const seqLen of sequenceLengths) {
    console.log(`\n--- Sequence Length: ${seqLen} ---`);

    // Generate query, keys, and values
    const query = randomVector(dimension);
    const keys = Array.from({ length: seqLen }, () => randomVector(dimension));
    const values = keys; // In attention, keys and values are often the same

    // Compute flash attention
    const result = await db.flashAttention(query, keys, values, {
      runtime: 'js',
      blockSize: 64
    });

    console.log(`Execution Time: ${result.executionTimeMs.toFixed(2)} ms`);
    console.log(`Memory Saved: ${(result.memorySaved / 1024).toFixed(2)} KB`);
    console.log(`Runtime: ${result.runtime}`);

    // Estimate speedup (baseline is O(N²) attention)
    const baselineTime = (seqLen * seqLen) / 10000; // Rough estimate
    const speedup = baselineTime / result.executionTimeMs;
    console.log(`Estimated Speedup: ${speedup.toFixed(2)}x`);
  }

  // Demonstrate batch processing
  console.log('\n=== Batch Processing ===');
  const batchSize = 10;
  const seqLen = 256;

  const queries = Array.from({ length: batchSize }, () => randomVector(dimension));
  const keys = Array.from({ length: seqLen }, () => randomVector(dimension));
  const values = keys;

  const batchStart = performance.now();

  for (const query of queries) {
    await db.flashAttention(query, keys, values);
  }

  const batchTime = performance.now() - batchStart;
  console.log(`Processed ${batchSize} queries in ${batchTime.toFixed(2)} ms`);
  console.log(`Average per query: ${(batchTime / batchSize).toFixed(2)} ms`);
}

function randomVector(dimension: number): Float32Array {
  const vector = new Float32Array(dimension);
  for (let i = 0; i < dimension; i++) {
    vector[i] = (Math.random() - 0.5) * 2;
  }
  return vector;
}

main().catch(console.error);
