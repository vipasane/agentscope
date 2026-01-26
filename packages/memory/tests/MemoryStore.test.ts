import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../src/store/MemoryStore.js';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  describe('basic operations', () => {
    it('should store and retrieve entries', async () => {
      const vector = new Float32Array([1, 2, 3]);
      const metadata = { type: 'test' };

      await store.store('test-1', vector, metadata);
      const entry = await store.retrieve('test-1');

      expect(entry).toBeDefined();
      expect(entry!.id).toBe('test-1');
      expect(entry!.vector).toEqual(vector);
      expect(entry!.metadata).toEqual(metadata);
    });

    it('should delete entries', async () => {
      const vector = new Float32Array([1, 2, 3]);
      await store.store('test-1', vector, {});

      const deleted = await store.delete('test-1');
      expect(deleted).toBe(true);

      const entry = await store.retrieve('test-1');
      expect(entry).toBeUndefined();
    });

    it('should update existing entries', async () => {
      const vector1 = new Float32Array([1, 2, 3]);
      const vector2 = new Float32Array([4, 5, 6]);

      await store.store('test-1', vector1, { version: 1 });
      await store.store('test-1', vector2, { version: 2 });

      const entry = await store.retrieve('test-1');
      expect(entry!.vector).toEqual(vector2);
      expect(entry!.metadata.version).toBe(2);
    });
  });

  describe('namespace isolation', () => {
    it('should isolate entries by namespace', async () => {
      store.createNamespace({ name: 'ns1' });
      store.createNamespace({ name: 'ns2' });

      const vector = new Float32Array([1, 2, 3]);

      await store.store('test-1', vector, {}, { namespace: 'ns1' });
      await store.store('test-2', vector, {}, { namespace: 'ns2' });

      const entries1 = await store.list('ns1');
      expect(entries1).toHaveLength(1);
      expect(entries1[0].id).toBe('test-1');

      const entries2 = await store.list('ns2');
      expect(entries2).toHaveLength(1);
      expect(entries2[0].id).toBe('test-2');
    });

    it('should enforce namespace limits', async () => {
      store.createNamespace({ name: 'limited', maxEntries: 2 });

      const vector = new Float32Array([1, 2, 3]);

      await store.store('test-1', vector, {}, { namespace: 'limited' });
      await store.store('test-2', vector, {}, { namespace: 'limited' });

      await expect(
        store.store('test-3', vector, {}, { namespace: 'limited' })
      ).rejects.toThrow();
    });
  });

  describe('tags', () => {
    it('should support tagging', async () => {
      const vector = new Float32Array([1, 2, 3]);

      await store.store('test-1', vector, {}, { tags: ['tag1', 'tag2'] });
      await store.store('test-2', vector, {}, { tags: ['tag2', 'tag3'] });

      const tag2Entries = store.getByTag('tag2');
      expect(tag2Entries).toHaveLength(2);

      const tag1Entries = store.getByTag('tag1');
      expect(tag1Entries).toHaveLength(1);
    });

    it('should list all tags', async () => {
      const vector = new Float32Array([1, 2, 3]);

      await store.store('test-1', vector, {}, { tags: ['tag1'] });
      await store.store('test-2', vector, {}, { tags: ['tag2'] });

      const tags = store.getTags();
      expect(tags).toContain('tag1');
      expect(tags).toContain('tag2');
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', async () => {
      const vector = new Float32Array([1, 2, 3]);

      await store.store('test-1', vector, {}, { ttl: 10 });

      // Entry should exist initially
      let entry = await store.retrieve('test-1');
      expect(entry).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));

      // Entry should be gone
      entry = await store.retrieve('test-1');
      expect(entry).toBeUndefined();
    });

    it('should cleanup expired entries manually', async () => {
      const vector = new Float32Array([1, 2, 3]);

      await store.store('test-1', vector, {}, { ttl: 1 });
      await store.store('test-2', vector, {});

      await new Promise(resolve => setTimeout(resolve, 10));

      const cleaned = await store.cleanup();
      expect(cleaned).toBeGreaterThan(0);
      expect(store.size()).toBe(1);
    });
  });

  describe('batch operations', () => {
    it('should batch store entries', async () => {
      const items = [
        {
          id: 'batch-1',
          vector: new Float32Array([1, 2, 3]),
          metadata: { index: 1 }
        },
        {
          id: 'batch-2',
          vector: new Float32Array([4, 5, 6]),
          metadata: { index: 2 }
        }
      ];

      const result = await store.batchStore(items);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(store.size()).toBe(2);
    });

    it('should batch delete entries', async () => {
      const vector = new Float32Array([1, 2, 3]);
      await store.store('test-1', vector, {});
      await store.store('test-2', vector, {});

      const result = await store.batchDelete(['test-1', 'test-2']);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(store.size()).toBe(0);
    });
  });

  describe('search', () => {
    it('should search by metadata filter', async () => {
      const vector = new Float32Array([1, 2, 3]);

      await store.store('test-1', vector, { type: 'A' });
      await store.store('test-2', vector, { type: 'B' });
      await store.store('test-3', vector, { type: 'A' });

      const results = await store.search({
        filter: (metadata) => metadata.type === 'A'
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.metadata.type === 'A')).toBe(true);
    });

    it('should limit search results', async () => {
      const vector = new Float32Array([1, 2, 3]);

      for (let i = 0; i < 10; i++) {
        await store.store(`test-${i}`, vector, {});
      }

      const results = await store.search({ k: 5 });
      expect(results).toHaveLength(5);
    });
  });

  describe('export and import', () => {
    it('should export all entries', async () => {
      const vector = new Float32Array([1, 2, 3]);
      await store.store('test-1', vector, { type: 'A' });
      await store.store('test-2', vector, { type: 'B' });

      const exported = await store.export();
      expect(exported).toHaveLength(2);
    });

    it('should import entries', async () => {
      const entries = [
        {
          id: 'import-1',
          namespace: 'default',
          vector: new Float32Array([1, 2, 3]),
          metadata: { type: 'A' },
          createdAt: Date.now(),
          lastAccessedAt: Date.now()
        }
      ];

      const result = await store.import(entries);
      expect(result.success).toBe(1);

      const entry = await store.retrieve('import-1');
      expect(entry).toBeDefined();
    });
  });
});
