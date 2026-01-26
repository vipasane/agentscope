/**
 * Semantic Search Example
 * Demonstrates semantic similarity search with metadata filtering
 */

import { createVectorDatabase } from '../src/index.js';

async function main() {
  console.log('=== Semantic Search Example ===\n');

  const db = createVectorDatabase(384); // Common embedding dimension

  // Create namespaces for different document types
  db.createNamespace({ name: 'documentation' });
  db.createNamespace({ name: 'code' });

  // Simulate document embeddings (in real use, these would come from an embedding model)
  const documents = [
    {
      id: 'doc-1',
      type: 'documentation',
      content: 'HNSW provides fast approximate nearest neighbor search',
      embedding: simulateEmbedding('HNSW fast search algorithm', 384)
    },
    {
      id: 'doc-2',
      type: 'documentation',
      content: 'Vector quantization reduces memory usage by 50-75%',
      embedding: simulateEmbedding('vector quantization memory reduction', 384)
    },
    {
      id: 'code-1',
      type: 'code',
      content: 'async function search(query: Float32Array)',
      embedding: simulateEmbedding('typescript async search function', 384)
    },
    {
      id: 'code-2',
      type: 'code',
      content: 'class VectorDatabase implements IDatabase',
      embedding: simulateEmbedding('typescript vector database class', 384)
    }
  ];

  // Insert documents
  for (const doc of documents) {
    await db.insert(
      doc.id,
      doc.embedding,
      {
        type: doc.type,
        content: doc.content,
        timestamp: Date.now()
      },
      {
        namespace: doc.type,
        tags: [doc.type, 'searchable']
      }
    );
  }

  console.log(`✓ Inserted ${documents.length} documents`);

  // Build index
  await db.buildHNSWIndex();
  console.log('✓ Built search index');

  // Semantic search: Find documents about "search algorithms"
  console.log('\n=== Query: "search algorithms" ===');
  const query1 = simulateEmbedding('search algorithms', 384);
  const results1 = await db.search(query1, 3);

  for (const result of results1) {
    console.log(`\nID: ${result.id}`);
    console.log(`  Distance: ${result.distance.toFixed(4)}`);
    console.log(`  Content: ${result.metadata.content}`);
  }

  // Filtered search: Find only documentation
  console.log('\n=== Query: "memory optimization" (docs only) ===');
  const query2 = simulateEmbedding('memory optimization', 384);
  const results2 = await db.search(query2, 3, {
    namespace: 'documentation'
  });

  for (const result of results2) {
    console.log(`\nID: ${result.id}`);
    console.log(`  Distance: ${result.distance.toFixed(4)}`);
    console.log(`  Content: ${result.metadata.content}`);
  }

  // Tag-based search
  console.log('\n=== Query: All searchable items ===');
  const query3 = simulateEmbedding('anything', 384);
  const results3 = await db.search(query3, 10, {
    tags: ['searchable']
  });

  console.log(`Found ${results3.length} searchable items`);
}

function simulateEmbedding(text: string, dimension: number): Float32Array {
  // Simple hash-based embedding simulation
  // In real use, you'd use a proper embedding model
  const vector = new Float32Array(dimension);
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }

  for (let i = 0; i < dimension; i++) {
    const seed = hash + i;
    vector[i] = Math.sin(seed) * 0.5 + 0.5;
  }

  return vector;
}

main().catch(console.error);
