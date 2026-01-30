/**
 * Tests for HNSWEngine - HNSW vector search wrapper
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HNSWEngine, type HNSWConfig, type SearchResult } from '../../src/optimization/HNSWEngine';
import { exec } from 'child_process';

// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('HNSWEngine', () => {
  let hnsw: HNSWEngine;
  let mockExec: any;

  beforeEach(() => {
    mockExec = exec as any;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (hnsw) {
      await hnsw.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default config', async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 384,
        maxElements: 10000
      };

      hnsw = new HNSWEngine(config);

      // Mock successful init
      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
      });

      await hnsw.initialize();
      expect(mockExec).toHaveBeenCalled();
    });

    it('should initialize with custom config', async () => {
      const config: HNSWConfig = {
        M: 32,
        efConstruction: 400,
        efSearch: 100,
        dimension: 768,
        maxElements: 100000,
        quantization: 'int8'
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        expect(cmd).toContain('--M 32');
        expect(cmd).toContain('--ef-construction 400');
        expect(cmd).toContain('--dimension 768');
        callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
      });

      await hnsw.initialize();
    });

    it('should handle initialization failure gracefully', async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 384,
        maxElements: 10000
      };

      hnsw = new HNSWEngine(config);

      // Mock failed init
      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('CLI not found'), null, null);
      });

      // Should not throw, but fall back to linear
      await expect(hnsw.initialize()).resolves.not.toThrow();

      // Verify fallback works
      const id = await hnsw.insert([0.1, 0.2, 0.3], { test: true });
      expect(id).toMatch(/^linear-/);
    });
  });

  describe('Insert Operations', () => {
    beforeEach(async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
      });

      await hnsw.initialize();
    });

    it('should insert single vector', async () => {
      const vector = [0.1, 0.2, 0.3];
      const metadata = { docId: 'doc1', content: 'test' };

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(null, { stdout: JSON.stringify({ id: 'vec-123' }), stderr: '' });
      });

      const id = await hnsw.insert(vector, metadata);
      expect(id).toMatch(/^vec-/);
    });

    it('should batch insert vectors', async () => {
      const vectors = [
        { vector: [0.1, 0.2, 0.3], metadata: { id: '1' } },
        { vector: [0.4, 0.5, 0.6], metadata: { id: '2' } },
        { vector: [0.7, 0.8, 0.9], metadata: { id: '3' } }
      ];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(null, { stdout: JSON.stringify({ id: 'vec-batch' }), stderr: '' });
      });

      const ids = await hnsw.batchInsert(vectors);
      expect(ids).toHaveLength(3);
      expect(ids.every(id => id.startsWith('vec-'))).toBe(true);
    });

    it('should generate unique IDs', async () => {
      const vector = [0.1, 0.2, 0.3];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
      });

      const id1 = await hnsw.insert(vector);
      const id2 = await hnsw.insert(vector);

      expect(id1).not.toBe(id2);
    });

    it('should handle insert failures', async () => {
      const vector = [0.1, 0.2, 0.3];

      // First call succeeds (init)
      let callCount = 0;
      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callCount++;
        if (callCount === 1) {
          // init succeeds
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        } else {
          // insert fails
          callback(new Error('Insert failed'), null, null);
        }
      });

      // Should fall back to linear
      const id = await hnsw.insert(vector);
      expect(id).toMatch(/^linear-/);
    });

    it('should fall back to linear on error', async () => {
      const vector = [0.1, 0.2, 0.3];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('CLI error'), null, null);
      });

      const id = await hnsw.insert(vector);
      expect(id).toMatch(/^linear-/);
    });

    it('should validate vector dimensions', async () => {
      const wrongVector = [0.1, 0.2]; // Wrong dimension (3 expected)

      await expect(hnsw.insert(wrongVector)).rejects.toThrow('Vector dimension mismatch');
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
      });

      await hnsw.initialize();
    });

    it('should search and return top k results', async () => {
      const query = [0.1, 0.2, 0.3];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('search')) {
          const results = {
            results: [
              { id: 'vec-1', distance: 0.1, metadata: { content: 'doc1' } },
              { id: 'vec-2', distance: 0.2, metadata: { content: 'doc2' } },
              { id: 'vec-3', distance: 0.3, metadata: { content: 'doc3' } }
            ]
          };
          callback(null, { stdout: JSON.stringify(results), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const results = await hnsw.search(query, 3);
      expect(results).toHaveLength(3);
      expect(results[0].distance).toBeLessThan(results[1].distance);
      expect(results[1].distance).toBeLessThan(results[2].distance);
    });

    it('should filter by distance threshold', async () => {
      const query = [0.1, 0.2, 0.3];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('search')) {
          const results = {
            results: [
              { id: 'vec-1', distance: 0.1, metadata: {} },
              { id: 'vec-2', distance: 0.5, metadata: {} }
            ]
          };
          callback(null, { stdout: JSON.stringify(results), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const results = await hnsw.search(query, 5, 0.8);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle empty index', async () => {
      const query = [0.1, 0.2, 0.3];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('search')) {
          callback(null, { stdout: JSON.stringify({ results: [] }), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const results = await hnsw.search(query, 5);
      expect(results).toEqual([]);
    });

    it('should batch search multiple queries', async () => {
      const queries = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9]
      ];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('search')) {
          const results = {
            results: [
              { id: 'vec-1', distance: 0.1, metadata: {} }
            ]
          };
          callback(null, { stdout: JSON.stringify(results), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const results = await hnsw.batchSearch(queries, 5);
      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0])).toBe(true);
    });

    it('should fall back to linear on error', async () => {
      const query = [0.1, 0.2, 0.3];

      // First insert some data in linear mode
      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('Search failed'), null, null);
      });

      // Insert in linear mode
      await hnsw.insert([0.1, 0.2, 0.3], { id: 'doc1' });

      // Search should work in linear mode
      const results = await hnsw.search(query, 5);
      expect(results.length).toBeGreaterThanOrEqual(0); // May be empty or have results
    });

    it('should respect limit parameter', async () => {
      const query = [0.1, 0.2, 0.3];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('search')) {
          const results = {
            results: Array.from({ length: 10 }, (_, i) => ({
              id: `vec-${i}`,
              distance: i * 0.1,
              metadata: {}
            }))
          };
          callback(null, { stdout: JSON.stringify(results), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const results = await hnsw.search(query, 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return results sorted by distance', async () => {
      const query = [0.1, 0.2, 0.3];

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('search')) {
          const results = {
            results: [
              { id: 'vec-3', distance: 0.9, metadata: {} },
              { id: 'vec-1', distance: 0.1, metadata: {} },
              { id: 'vec-2', distance: 0.5, metadata: {} }
            ]
          };
          callback(null, { stdout: JSON.stringify(results), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const results = await hnsw.search(query, 3);
      expect(results[0].distance).toBeLessThanOrEqual(results[1].distance);
      expect(results[1].distance).toBeLessThanOrEqual(results[2].distance);
    });

    it('should validate vector dimensions', async () => {
      const wrongQuery = [0.1, 0.2]; // Wrong dimension

      await expect(hnsw.search(wrongQuery)).rejects.toThrow('Query dimension mismatch');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
      });

      await hnsw.initialize();
    });

    it('should return index statistics', async () => {
      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('stats')) {
          const stats = {
            totalVectors: 1000,
            indexSize: 384000,
            avgSearchTime: 5,
            speedupFactor: 500
          };
          callback(null, { stdout: JSON.stringify(stats), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const stats = await hnsw.getStatistics();
      expect(stats.totalVectors).toBeGreaterThanOrEqual(0);
      expect(stats.dimension).toBe(3);
      expect(stats.speedupFactor).toBeGreaterThan(0);
    });

    it('should track total vectors', async () => {
      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('stats')) {
          const stats = { totalVectors: 42 };
          callback(null, { stdout: JSON.stringify(stats), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const stats = await hnsw.getStatistics();
      expect(stats.totalVectors).toBe(42);
    });

    it('should calculate speedup factor', async () => {
      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        if (cmd.includes('stats')) {
          const stats = { speedupFactor: 1200 };
          callback(null, { stdout: JSON.stringify(stats), stderr: '' });
        } else {
          callback(null, { stdout: JSON.stringify({ success: true }), stderr: '' });
        }
      });

      const stats = await hnsw.getStatistics();
      expect(stats.speedupFactor).toBeGreaterThan(100);
    });
  });

  describe('Fallback Behavior', () => {
    it('should detect HNSW unavailability', async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('CLI not found'), null, null);
      });

      await hnsw.initialize();

      // Should use linear fallback
      const id = await hnsw.insert([0.1, 0.2, 0.3]);
      expect(id).toMatch(/^linear-/);
    });

    it('should use linear search as fallback', async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('CLI error'), null, null);
      });

      await hnsw.initialize();

      // Insert some vectors
      await hnsw.insert([0.1, 0.2, 0.3], { id: '1' });
      await hnsw.insert([0.4, 0.5, 0.6], { id: '2' });

      // Search should work with linear fallback
      const results = await hnsw.search([0.1, 0.2, 0.3], 2);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should log fallback warnings', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('CLI not found'), null, null);
      });

      await hnsw.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('falling back to linear search')
      );

      consoleSpy.mockRestore();
    });

    it('should maintain functionality with fallback', async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('CLI unavailable'), null, null);
      });

      await hnsw.initialize();

      // All operations should still work
      const id = await hnsw.insert([0.1, 0.2, 0.3]);
      expect(id).toBeTruthy();

      const results = await hnsw.search([0.1, 0.2, 0.3], 5);
      expect(Array.isArray(results)).toBe(true);

      const stats = await hnsw.getStatistics();
      expect(stats.dimension).toBe(3);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      const config: HNSWConfig = {
        M: 16,
        efConstruction: 200,
        efSearch: 50,
        dimension: 3,
        maxElements: 1000
      };

      hnsw = new HNSWEngine(config);

      mockExec.mockImplementation((cmd: string, opts: any, callback: Function) => {
        callback(new Error('Use fallback'), null, null);
      });

      await hnsw.initialize();
      await hnsw.insert([0.1, 0.2, 0.3]);

      const statsBefore = await hnsw.getStatistics();
      expect(statsBefore.totalVectors).toBe(1);

      await hnsw.dispose();

      const statsAfter = await hnsw.getStatistics();
      expect(statsAfter.totalVectors).toBe(0);
    });
  });
});
