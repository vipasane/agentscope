import { describe, it, expect, beforeEach } from 'vitest';
import { VectorDatabase, createVectorDatabase } from '../src/index.js';

describe('VectorDatabase', () => {
  let db: VectorDatabase;
  const dimension = 128;

  beforeEach(() => {
    db = createVectorDatabase(dimension, {
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
  });

  describe('insert and search', () => {
    it('should insert and retrieve vectors', async () => {
      const vector = new Float32Array(dimension).fill(0.5);
      const metadata = { type: 'test', value: 42 };

      await db.insert('test-1', vector, metadata);

      const result = await db.get('test-1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('test-1');
      expect(result!.metadata).toEqual(metadata);
    });

    it('should find similar vectors', async () => {
      // Insert test vectors
      const vec1 = new Float32Array(dimension).fill(0.5);
      const vec2 = new Float32Array(dimension).fill(0.6);
      const vec3 = new Float32Array(dimension).fill(0.1);

      await db.insert('vec-1', vec1, { type: 'A' });
      await db.insert('vec-2', vec2, { type: 'A' });
      await db.insert('vec-3', vec3, { type: 'B' });

      // Build index
      await db.buildHNSWIndex();

      // Search for similar to vec1
      const query = new Float32Array(dimension).fill(0.55);
      const results = await db.search(query, 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toMatch(/vec-[12]/);
    });

    it('should filter search results', async () => {
      const vec1 = new Float32Array(dimension).fill(0.5);
      const vec2 = new Float32Array(dimension).fill(0.6);

      await db.insert('vec-1', vec1, { type: 'include' });
      await db.insert('vec-2', vec2, { type: 'exclude' });

      await db.buildHNSWIndex();

      const query = new Float32Array(dimension).fill(0.55);
      const results = await db.search(query, 10, {
        filter: (metadata) => metadata.type === 'include'
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vec-1');
    });

    it('should support namespace isolation', async () => {
      db.createNamespace({ name: 'ns1' });
      db.createNamespace({ name: 'ns2' });

      const vec1 = new Float32Array(dimension).fill(0.5);
      const vec2 = new Float32Array(dimension).fill(0.6);

      await db.insert('vec-1', vec1, {}, { namespace: 'ns1' });
      await db.insert('vec-2', vec2, {}, { namespace: 'ns2' });

      const results1 = await db.search(vec1, 10, { namespace: 'ns1' });
      expect(results1).toHaveLength(1);
      expect(results1[0].id).toBe('vec-1');

      const results2 = await db.search(vec2, 10, { namespace: 'ns2' });
      expect(results2).toHaveLength(1);
      expect(results2[0].id).toBe('vec-2');
    });
  });

  describe('delete', () => {
    it('should delete vectors', async () => {
      const vector = new Float32Array(dimension).fill(0.5);
      await db.insert('test-1', vector);

      const deleted = await db.delete('test-1');
      expect(deleted).toBe(true);

      const result = await db.get('test-1');
      expect(result).toBeUndefined();
    });

    it('should return false for non-existent vectors', async () => {
      const deleted = await db.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('namespace management', () => {
    it('should create namespaces', () => {
      db.createNamespace({ name: 'test-ns' });
      const namespaces = db.listNamespaces();
      expect(namespaces.find(ns => ns.name === 'test-ns')).toBeDefined();
    });

    it('should delete namespaces', async () => {
      db.createNamespace({ name: 'test-ns' });

      const vector = new Float32Array(dimension).fill(0.5);
      await db.insert('test-1', vector, {}, { namespace: 'test-ns' });

      db.deleteNamespace('test-ns');

      const namespaces = db.listNamespaces();
      expect(namespaces.find(ns => ns.name === 'test-ns')).toBeUndefined();
    });

    it('should not allow deleting default namespace', () => {
      expect(() => db.deleteNamespace('default')).toThrow();
    });
  });

  describe('statistics', () => {
    it('should provide database statistics', async () => {
      const vector = new Float32Array(dimension).fill(0.5);
      await db.insert('test-1', vector);
      await db.buildHNSWIndex();

      const stats = await db.getStats();
      expect(stats.totalVectors).toBeGreaterThan(0);
      expect(stats.backend).toBe('memory');
    });

    it('should track HNSW statistics', async () => {
      const vectors = Array.from({ length: 10 }, (_, i) =>
        new Float32Array(dimension).fill(i / 10)
      );

      for (let i = 0; i < vectors.length; i++) {
        await db.insert(`vec-${i}`, vectors[i]);
      }

      await db.buildHNSWIndex();

      const stats = await db.getHNSWStats();
      expect(stats.hnsw).toBeDefined();
      expect(stats.hnsw!.vectorCount).toBe(10);
    });
  });

  describe('quantization', () => {
    it('should quantize vectors', async () => {
      const vector = new Float32Array(dimension).fill(0.5);
      await db.insert('test-1', vector);

      await db.quantize(8);

      const stats = db.getQuantizationStats();
      expect(stats.quantization).toBeDefined();
      expect(stats.quantization!.bits).toBe(8);
    });
  });

  describe('export and import', () => {
    it('should export and import data', async () => {
      const vector1 = new Float32Array(dimension).fill(0.5);
      const vector2 = new Float32Array(dimension).fill(0.6);

      await db.insert('vec-1', vector1, { type: 'A' });
      await db.insert('vec-2', vector2, { type: 'B' });

      const exported = await db.export();
      expect(exported).toHaveProperty('entries');
      expect(exported).toHaveProperty('namespaces');

      // Create new database and import
      const db2 = createVectorDatabase(dimension);
      await db2.import(exported as any);

      const result = await db2.get('vec-1');
      expect(result).toBeDefined();
      expect(result!.metadata).toEqual({ type: 'A' });
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired entries', async () => {
      const vector = new Float32Array(dimension).fill(0.5);

      // Insert with very short TTL
      await db.insert('test-1', vector, {}, { ttl: 1 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await db.cleanup();
      expect(result.expired).toBeGreaterThan(0);
    });
  });

  describe('flash attention', () => {
    it('should compute flash attention', async () => {
      const query = new Float32Array(dimension).fill(0.5);
      const keys = [
        new Float32Array(dimension).fill(0.4),
        new Float32Array(dimension).fill(0.6)
      ];
      const values = keys;

      const result = await db.flashAttention(query, keys, values);

      expect(result.output).toBeInstanceOf(Float32Array);
      expect(result.output.length).toBe(dimension);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should handle large number of vectors efficiently', async () => {
      const count = 1000;
      const startTime = performance.now();

      // Insert vectors
      for (let i = 0; i < count; i++) {
        const vector = new Float32Array(dimension).fill(Math.random());
        await db.insert(`vec-${i}`, vector, { index: i });
      }

      // Build index
      await db.buildHNSWIndex();

      const insertTime = performance.now() - startTime;
      expect(insertTime).toBeLessThan(5000); // Should take less than 5 seconds

      // Search
      const searchStart = performance.now();
      const query = new Float32Array(dimension).fill(0.5);
      const results = await db.search(query, 10);

      const searchTime = performance.now() - searchStart;
      expect(searchTime).toBeLessThan(100); // Should be very fast with HNSW
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });
});
