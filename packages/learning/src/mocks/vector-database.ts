/**
 * Mock VectorDatabase implementation for development and testing
 * Provides a minimal in-memory vector store interface
 */

export interface VectorDatabase {
  /**
   * Insert a vector with metadata
   */
  insert(
    key: string,
    vector: number[] | Float32Array,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Store a vector with metadata (alias for insert)
   */
  store(key: string, vector: number[], metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Retrieve a vector by key
   */
  get(key: string): Promise<{ vector: number[]; metadata?: Record<string, unknown> } | null>;

  /**
   * Search for similar vectors
   */
  search(
    query: number[] | Float32Array,
    limit: number,
    threshold?: number
  ): Promise<
    Array<{
      key: string;
      id?: string;
      similarity: number;
      metadata?: Record<string, unknown>;
    }>
  >;

  /**
   * Delete a vector
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all vectors
   */
  clear(): Promise<void>;

  /**
   * Get number of stored vectors
   */
  size(): Promise<number>;
}

/**
 * In-memory mock VectorDatabase for testing
 */
export class MockVectorDatabase implements VectorDatabase {
  private data: Map<string, { vector: number[]; metadata?: Record<string, unknown> }> = new Map();

  async insert(
    key: string,
    vector: number[] | Float32Array,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const vec = vector instanceof Float32Array ? Array.from(vector) : vector;
    this.data.set(key, { vector: vec, metadata });
  }

  async store(key: string, vector: number[], metadata?: Record<string, unknown>): Promise<void> {
    this.data.set(key, { vector, metadata });
  }

  async get(key: string): Promise<{ vector: number[]; metadata?: Record<string, unknown> } | null> {
    return this.data.get(key) || null;
  }

  async search(
    query: number[] | Float32Array,
    limit: number,
    threshold: number = 0.5
  ): Promise<Array<{ key: string; id?: string; similarity: number; metadata?: Record<string, unknown> }>> {
    const queryVec = query instanceof Float32Array ? Array.from(query) : query;
    const results: Array<{
      key: string;
      id?: string;
      similarity: number;
      metadata?: Record<string, unknown>;
    }> = [];

    for (const [key, { vector, metadata }] of this.data.entries()) {
      const similarity = this.cosineSimilarity(queryVec, vector);
      if (similarity >= threshold) {
        results.push({ key, id: key, similarity, metadata });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async size(): Promise<number> {
    return this.data.size;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = typeof a[i] === 'number' ? a[i] : 0;
      const bVal = typeof b[i] === 'number' ? b[i] : 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
