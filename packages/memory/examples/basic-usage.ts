/**
 * Basic Usage Example
 * Demonstrates core VectorDatabase operations
 */

import { createVectorDatabase } from '../src/index.js';

async function main() {
  console.log('=== Basic VectorDatabase Usage ===\n');

  // Create a vector database with 128-dimensional vectors
  const db = createVectorDatabase(128, {
    backend: 'memory',
    hnsw: {
      enabled: true,
      m: 16,
      efConstruction: 200,
      efSearch: 100
    },
    quantization: {
      enabled: false,
      bits: 8
    }
  });

  console.log('✓ Created VectorDatabase');

  // Insert some vectors
  const embeddings = [
    { id: 'doc-1', text: 'AI agent memory system', vector: randomVector(128) },
    { id: 'doc-2', text: 'Vector database implementation', vector: randomVector(128) },
    { id: 'doc-3', text: 'HNSW indexing algorithm', vector: randomVector(128) }
  ];

  for (const doc of embeddings) {
    await db.insert(doc.id, doc.vector, { text: doc.text });
  }

  console.log(`✓ Inserted ${embeddings.length} vectors`);

  // Build HNSW index for fast search
  await db.buildHNSWIndex();
  console.log('✓ Built HNSW index');

  // Search for similar vectors
  const query = randomVector(128);
  const results = await db.search(query, 2);

  console.log('\n=== Search Results ===');
  for (const result of results) {
    console.log(`ID: ${result.id}`);
    console.log(`  Distance: ${result.distance.toFixed(4)}`);
    console.log(`  Text: ${result.metadata.text}`);
  }

  // Get statistics
  const stats = await db.getStats();
  console.log('\n=== Database Statistics ===');
  console.log(`Total Vectors: ${stats.totalVectors}`);
  console.log(`Backend: ${stats.backend}`);
  if (stats.hnsw) {
    console.log(`HNSW Index Size: ${(stats.hnsw.indexSize / 1024).toFixed(2)} KB`);
    console.log(`Average Degree: ${stats.hnsw.avgDegree.toFixed(2)}`);
    console.log(`P50 Search Time: ${stats.hnsw.searchTimeP50.toFixed(2)} ms`);
  }
}

function randomVector(dimension: number): Float32Array {
  const vector = new Float32Array(dimension);
  for (let i = 0; i < dimension; i++) {
    vector[i] = Math.random();
  }
  return vector;
}

main().catch(console.error);
