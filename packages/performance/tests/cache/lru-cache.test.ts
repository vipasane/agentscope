import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache } from '../../src/cache/lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({ maxSize: 3 });
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('missing')).toBe(false);
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
      expect(cache.size()).toBe(1);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used item', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.get('key1'); // Move key1 to front

      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should update LRU order on set', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.set('key1', 'updated'); // Move key1 to front

      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should call onEvict callback', () => {
      const onEvict = vi.fn();
      const evictCache = new LRUCache<string>({
        maxSize: 2,
        onEvict
      });

      evictCache.set('key1', 'value1');
      evictCache.set('key2', 'value2');
      evictCache.set('key3', 'value3'); // Evicts key1

      expect(onEvict).toHaveBeenCalledWith('key1', 'value1');
    });
  });

  describe('TTL Support', () => {
    it('should expire items after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire items with zero TTL', async () => {
      cache.set('key1', 'value1', 0); // No expiration

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBe('value1');
    });

    it('should use default TTL when not specified', async () => {
      const ttlCache = new LRUCache<string>({
        maxSize: 10,
        ttl: 100
      });

      ttlCache.set('key1', 'value1');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(ttlCache.get('key1')).toBeUndefined();
    });

    it('should prune expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 200);

      await new Promise(resolve => setTimeout(resolve, 100));

      const pruned = cache.prune();

      expect(pruned).toBe(1);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Eviction

      const stats = cache.getStats();

      expect(stats.evictions).toBe(1);
    });

    it('should track cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });

    it('should reset statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2');

      cache.resetStats();

      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Hot Keys', () => {
    it('should track access frequency', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1');
      cache.get('key1');
      cache.get('key1');
      cache.get('key2');

      const hotKeys = cache.getHotKeys(2);

      expect(hotKeys[0].key).toBe('key1');
      expect(hotKeys[0].hits).toBe(3);
      expect(hotKeys[1].key).toBe('key2');
      expect(hotKeys[1].hits).toBe(1);
    });

    it('should limit hot keys results', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const hotKeys = cache.getHotKeys(2);

      expect(hotKeys).toHaveLength(2);
    });
  });

  describe('Keys and Entries', () => {
    it('should return keys in LRU order', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.get('key1'); // Move to front

      const keys = cache.keys();

      expect(keys[0]).toBe('key1');
    });

    it('should return all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const entries = cache.entries();

      expect(entries).toHaveLength(2);
      expect(entries[0].key).toBe('key2'); // Most recent
      expect(entries[1].key).toBe('key1');
    });

    it('should not return expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 200);

      await new Promise(resolve => setTimeout(resolve, 100));

      const entries = cache.entries();

      expect(entries).toHaveLength(1);
      expect(entries[0].key).toBe('key2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle cache size of 1', () => {
      const tinyCache = new LRUCache<string>({ maxSize: 1 });

      tinyCache.set('key1', 'value1');
      tinyCache.set('key2', 'value2');

      expect(tinyCache.get('key1')).toBeUndefined();
      expect(tinyCache.get('key2')).toBe('value2');
    });

    it('should handle large cache', () => {
      const largeCache = new LRUCache<number>({ maxSize: 10000 });

      for (let i = 0; i < 5000; i++) {
        largeCache.set(`key${i}`, i);
      }

      expect(largeCache.size()).toBe(5000);
    });

    it('should handle different value types', () => {
      const objCache = new LRUCache<{ value: number }>({ maxSize: 10 });

      objCache.set('key1', { value: 1 });
      expect(objCache.get('key1')).toEqual({ value: 1 });
    });
  });
});
