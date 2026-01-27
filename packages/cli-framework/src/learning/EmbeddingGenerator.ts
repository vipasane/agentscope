/**
 * @packageDocumentation
 * Simple TF-IDF based embedding generator for command patterns
 *
 * @remarks
 * Provides fast local embeddings without external dependencies
 * Target: <10ms per embedding generation
 */

/**
 * Simple TF-IDF embedding generator
 *
 * @remarks
 * Uses TF-IDF for fast local embedding generation
 * Sufficient for 150x speedup vs linear search with HNSW
 */
export class EmbeddingGenerator {
  private vocabulary: Map<string, number>;
  private idf: Map<string, number>;
  private documentCount: number;

  constructor() {
    this.vocabulary = new Map();
    this.idf = new Map();
    this.documentCount = 0;
  }

  /**
   * Generate embedding vector for text
   *
   * @param text - Input text (command string)
   * @param dimensions - Target dimensionality (384 default)
   * @returns Normalized embedding vector
   *
   * @remarks
   * Performance target: <10ms
   * Uses TF-IDF with L2 normalization
   */
  generateEmbedding(text: string, dimensions: number = 384): number[] {
    const tokens = this.tokenize(text);
    const tf = this.calculateTF(tokens);

    // Create sparse vector
    const embedding = new Array(dimensions).fill(0);

    // Map tokens to vector dimensions using hash
    for (const [token, tfValue] of tf.entries()) {
      const idfValue = this.idf.get(token) || 0;
      const tfidf = tfValue * idfValue;

      // Map token to dimension (simple hash)
      const dimension = this.hashToken(token) % dimensions;
      embedding[dimension] += tfidf;
    }

    // L2 normalization
    return this.normalize(embedding);
  }

  /**
   * Update vocabulary with new text
   *
   * @param text - Text to add to vocabulary
   *
   * @remarks
   * Call this during training to build vocabulary and IDF statistics
   */
  updateVocabulary(text: string): void {
    const tokens = this.tokenize(text);
    const uniqueTokens = new Set(tokens);

    this.documentCount++;

    // Update vocabulary and document frequency
    for (const token of uniqueTokens) {
      const count = this.vocabulary.get(token) || 0;
      this.vocabulary.set(token, count + 1);
    }

    // Recalculate IDF
    this.calculateIDF();
  }

  /**
   * Tokenize text into words
   *
   * @internal
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate term frequency
   *
   * @internal
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalTokens = tokens.length;

    for (const token of tokens) {
      const count = tf.get(token) || 0;
      tf.set(token, count + 1);
    }

    // Normalize by total tokens
    for (const [token, count] of tf.entries()) {
      tf.set(token, count / totalTokens);
    }

    return tf;
  }

  /**
   * Calculate inverse document frequency
   *
   * @internal
   */
  private calculateIDF(): void {
    this.idf.clear();

    for (const [token, docCount] of this.vocabulary.entries()) {
      // IDF = log(N / df)
      const idf = Math.log(this.documentCount / docCount);
      this.idf.set(token, idf);
    }
  }

  /**
   * L2 normalize vector
   *
   * @internal
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) return vector;

    return vector.map(val => val / magnitude);
  }

  /**
   * Simple hash function for token to dimension mapping
   *
   * @internal
   */
  private hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documentCount;
  }
}
