/**
 * Memory-specific mock implementations
 */

import { v4 as uuidv4 } from 'uuid';

export interface MockMemoryOptions {
  capacity?: number;
  ttl?: number;
  enableVectorSearch?: boolean;
}

/**
 * Create a mock HNSW (Hierarchical Navigable Small World) memory
 */
export function createMockHNSWMemory(options: MockMemoryOptions = {}) {
  const { capacity = 1000, ttl = 3600000, enableVectorSearch = true } = options;
  const store: Map<string, { value: unknown; embedding: number[]; timestamp: number }> = new Map();
  const accessLog: Array<{ key: string; type: 'read' | 'write' | 'search'; timestamp: number }> = [];

  return {
    async insert(key: string, value: unknown, embedding?: number[]): Promise<void> {
      if (store.size >= capacity) {
        // Simple eviction: remove oldest
        const oldest = Array.from(store.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        )[0];
        if (oldest) store.delete(oldest[0]);
      }

      store.set(key, {
        value,
        embedding: embedding || Array(768).fill(Math.random()),
        timestamp: Date.now()
      });

      accessLog.push({ key, type: 'write', timestamp: Date.now() });
    },

    async get(key: string): Promise<unknown | null> {
      const entry = store.get(key);
      accessLog.push({ key, type: 'read', timestamp: Date.now() });

      // Check TTL
      if (entry && Date.now() - entry.timestamp > ttl) {
        store.delete(key);
        return null;
      }

      return entry?.value || null;
    },

    async search(queryEmbedding: number[], k: number = 5): Promise<Array<{ key: string; value: unknown; distance: number }>> {
      if (!enableVectorSearch) {
        throw new Error('Vector search not enabled');
      }

      const results = Array.from(store.entries())
        .map(([key, entry]) => ({
          key,
          value: entry.value,
          distance: computeCosineSimilarity(queryEmbedding, entry.embedding)
        }))
        .sort((a, b) => b.distance - a.distance)
        .slice(0, k);

      accessLog.push({ key: 'search', type: 'search', timestamp: Date.now() });
      return results;
    },

    async delete(key: string): Promise<void> {
      store.delete(key);
      accessLog.push({ key, type: 'write', timestamp: Date.now() });
    },

    async clear(): Promise<void> {
      store.clear();
    },

    async getSize(): Promise<number> {
      return store.size;
    },

    async getCapacity(): Promise<number> {
      return capacity;
    },

    async getAccessLog(): Promise<typeof accessLog> {
      return accessLog;
    },

    async getStats(): Promise<{ size: number; capacity: number; accessCount: number; evictionCount: number }> {
      return {
        size: store.size,
        capacity,
        accessCount: accessLog.length,
        evictionCount: 0
      };
    }
  };
}

/**
 * Compute cosine similarity between two embeddings
 */
function computeCosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magA && magB ? dotProduct / (magA * magB) : 0;
}

/**
 * Create a mock hybrid memory (combines in-memory and persistent storage)
 */
export function createMockHybridMemory() {
  const inMemory: Map<string, unknown> = new Map();
  const persistent: Map<string, unknown> = new Map();
  const operations: Array<{ op: string; key: string; timestamp: number }> = [];

  return {
    async store(key: string, value: unknown, namespace: string = 'default'): Promise<void> {
      const fullKey = `${namespace}:${key}`;
      inMemory.set(fullKey, value);
      operations.push({ op: 'store', key: fullKey, timestamp: Date.now() });
    },

    async retrieve(key: string, namespace: string = 'default'): Promise<unknown | null> {
      const fullKey = `${namespace}:${key}`;
      operations.push({ op: 'retrieve', key: fullKey, timestamp: Date.now() });
      return inMemory.get(fullKey) || persistent.get(fullKey) || null;
    },

    async persist(key: string, namespace: string = 'default'): Promise<void> {
      const fullKey = `${namespace}:${key}`;
      const value = inMemory.get(fullKey);
      if (value) {
        persistent.set(fullKey, value);
      }
      operations.push({ op: 'persist', key: fullKey, timestamp: Date.now() });
    },

    async flush(): Promise<void> {
      for (const [key, value] of inMemory) {
        persistent.set(key, value);
      }
    },

    async clear(): Promise<void> {
      inMemory.clear();
      persistent.clear();
    },

    async getStats(): Promise<{ inMemory: number; persistent: number; operations: number }> {
      return {
        inMemory: inMemory.size,
        persistent: persistent.size,
        operations: operations.length
      };
    }
  };
}

/**
 * Create a mock embedding service
 */
export function createMockEmbeddingService() {
  const embeddings: Map<string, number[]> = new Map();
  const similarityCache: Map<string, number> = new Map();

  return {
    async embed(text: string): Promise<number[]> {
      if (embeddings.has(text)) {
        return embeddings.get(text)!;
      }

      // Deterministic hash-based embedding for testing
      const embedding = hashToEmbedding(text);
      embeddings.set(text, embedding);
      return embedding;
    },

    async similarity(text1: string, text2: string): Promise<number> {
      const key = `${text1}:${text2}`;
      if (similarityCache.has(key)) {
        return similarityCache.get(key)!;
      }

      const emb1 = await this.embed(text1);
      const emb2 = await this.embed(text2);
      const similarity = computeCosineSimilarity(emb1, emb2);

      similarityCache.set(key, similarity);
      return similarity;
    },

    async batch(texts: string[]): Promise<number[][]> {
      return Promise.all(texts.map(text => this.embed(text)));
    },

    getEmbeddingCount(): number {
      return embeddings.size;
    },

    reset(): void {
      embeddings.clear();
      similarityCache.clear();
    }
  };
}

/**
 * Hash string to deterministic embedding for testing
 */
function hashToEmbedding(text: string): number[] {
  const embedding: number[] = [];
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }

  for (let i = 0; i < 768; i++) {
    hash = (hash * 9301 + 49297) % 233280;
    embedding.push((hash % 1000) / 1000 - 0.5);
  }

  return embedding;
}

/**
 * Create a mock semantic search index
 */
export function createMockSemanticIndex() {
  const documents: Map<string, { id: string; text: string; embedding: number[]; timestamp: number }> = new Map();
  const searchLog: Array<{ query: string; results: number; duration: number }> = [];

  return {
    async index(id: string, text: string, embedding: number[]): Promise<void> {
      documents.set(id, {
        id,
        text,
        embedding,
        timestamp: Date.now()
      });
    },

    async search(query: string, embedding: number[], k: number = 10): Promise<Array<{ id: string; text: string; relevance: number }>> {
      const startTime = Date.now();

      const results = Array.from(documents.values())
        .map(doc => ({
          id: doc.id,
          text: doc.text,
          relevance: computeCosineSimilarity(embedding, doc.embedding)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, k);

      const duration = Date.now() - startTime;
      searchLog.push({ query, results: results.length, duration });

      return results;
    },

    async getStats(): Promise<{ documentCount: number; searchCount: number; avgSearchTime: number }> {
      const avgSearchTime = searchLog.length > 0
        ? searchLog.reduce((sum, s) => sum + s.duration, 0) / searchLog.length
        : 0;

      return {
        documentCount: documents.size,
        searchCount: searchLog.length,
        avgSearchTime
      };
    },

    async clear(): Promise<void> {
      documents.clear();
      searchLog.length = 0;
    }
  };
}
