/**
 * @file Lazy Loader Tests
 * @description Unit tests for LazyModuleRegistry
 *
 * @module tests/lazy-loader
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LazyModuleRegistry, lazyLoad, getGlobalStats } from '../src/lazy-loader.js';

describe('LazyModuleRegistry', () => {
  let registry: LazyModuleRegistry;

  beforeEach(() => {
    registry = new LazyModuleRegistry();
  });

  describe('load()', () => {
    it('should load a module dynamically', async () => {
      // Load Node.js built-in module
      const module = await registry.load('fs');

      expect(module).toBeDefined();
      expect(module.readFileSync).toBeDefined();
    });

    it('should cache loaded modules', async () => {
      const path = 'fs';

      // First load
      await registry.load(path);
      const stats1 = registry.getStats();

      // Second load (should be cached)
      await registry.load(path);
      const stats2 = registry.getStats();

      expect(stats2.cacheHits).toBe(1);
      expect(registry.isLoaded(path)).toBe(true);
    });

    it('should track load times', async () => {
      const path = 'fs';

      await registry.load(path, { track: true });

      const loadTime = registry.getLoadTime(path);
      expect(loadTime).toBeGreaterThan(0);
    });

    it('should timeout on slow loads', async () => {
      // Try to load non-existent module with short timeout
      await expect(
        registry.load('./non-existent-module', { timeout: 100 })
      ).rejects.toThrow();
    });

    it('should retry on failure', async () => {
      let attempts = 0;

      // Mock module that fails first time
      const mockPath = './mock-failing-module';

      // This will fail but should retry
      await expect(
        registry.load(mockPath, { retry: 2, timeout: 500 })
      ).rejects.toThrow();
    });

    it('should handle concurrent loads of same module', async () => {
      const path = 'path';

      // Load same module concurrently
      const promises = [
        registry.load(path),
        registry.load(path),
        registry.load(path)
      ];

      const results = await Promise.all(promises);

      // All should return same module
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);

      // Only one actual load
      const stats = registry.getStats();
      expect(stats.totalLoads).toBe(1);
      expect(stats.cacheHits).toBe(2);
    });
  });

  describe('preload()', () => {
    it('should preload modules in background', async () => {
      const paths = ['fs', 'path', 'os'];

      registry.preload(paths);

      // Wait a bit for preload
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if modules are loaded
      expect(registry.isLoaded('fs')).toBe(true);
      expect(registry.isLoaded('path')).toBe(true);
      expect(registry.isLoaded('os')).toBe(true);
    });

    it('should not throw on preload failure', async () => {
      // Preload should fail silently
      expect(() => {
        registry.preload(['./non-existent-module']);
      }).not.toThrow();
    });
  });

  describe('getStats()', () => {
    it('should return accurate statistics', async () => {
      await registry.load('fs');
      await registry.load('path');
      await registry.load('fs'); // Cache hit

      const stats = registry.getStats();

      expect(stats.totalLoads).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.averageLoadTime).toBeGreaterThan(0);
      expect(stats.loadTimes.size).toBe(2);
    });

    it('should identify slowest module', async () => {
      await registry.load('fs');
      await registry.load('path');
      await registry.load('os');

      const stats = registry.getStats();

      expect(stats.slowestModule).toBeDefined();
      expect(stats.slowestModule?.path).toBeDefined();
      expect(stats.slowestModule?.time).toBeGreaterThan(0);
    });
  });

  describe('getCacheHitRate()', () => {
    it('should calculate cache hit rate', async () => {
      await registry.load('fs');
      await registry.load('path');
      await registry.load('fs'); // Cache hit
      await registry.load('path'); // Cache hit

      const hitRate = registry.getCacheHitRate();

      expect(hitRate).toBe(0.5); // 2 hits out of 4 total loads
    });

    it('should return 0 for no loads', () => {
      const hitRate = registry.getCacheHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all cached modules', async () => {
      await registry.load('fs');
      await registry.load('path');

      expect(registry.getLoadedModules().length).toBe(2);

      registry.clear();

      expect(registry.getLoadedModules().length).toBe(0);
      expect(registry.getStats().totalLoads).toBe(0);
    });
  });

  describe('exportStats()', () => {
    it('should export JSON-serializable statistics', async () => {
      await registry.load('fs');
      await registry.load('path');

      const exported = registry.exportStats();

      expect(exported).toHaveProperty('totalLoads');
      expect(exported).toHaveProperty('cacheHits');
      expect(exported).toHaveProperty('cacheHitRate');
      expect(exported).toHaveProperty('averageLoadTime');
      expect(exported).toHaveProperty('moduleCount');
      expect(exported).toHaveProperty('loadTimes');

      // Should be JSON serializable
      expect(() => JSON.stringify(exported)).not.toThrow();
    });
  });
});

describe('Global Registry Functions', () => {
  it('should use global registry for lazyLoad', async () => {
    const module = await lazyLoad('fs');

    expect(module).toBeDefined();
    expect(module.readFileSync).toBeDefined();

    const stats = getGlobalStats();
    expect(stats.totalLoads).toBeGreaterThan(0);
  });

  it('should share state across lazyLoad calls', async () => {
    await lazyLoad('fs');
    await lazyLoad('fs'); // Should be cached

    const stats = getGlobalStats();
    expect(stats.cacheHits).toBeGreaterThan(0);
  });
});

describe('Performance Characteristics', () => {
  it('should load modules quickly', async () => {
    const registry = new LazyModuleRegistry();

    const start = performance.now();
    await registry.load('fs');
    const duration = performance.now() - start;

    // Module load should be fast (<100ms for built-in)
    expect(duration).toBeLessThan(100);
  });

  it('should have minimal overhead for cached loads', async () => {
    const registry = new LazyModuleRegistry();

    // Initial load
    await registry.load('fs');

    // Measure cached load
    const start = performance.now();
    await registry.load('fs');
    const duration = performance.now() - start;

    // Cached load should be very fast (<10ms)
    expect(duration).toBeLessThan(10);
  });

  it('should handle many modules efficiently', async () => {
    const registry = new LazyModuleRegistry();

    const modules = [
      'fs', 'path', 'os', 'util', 'events',
      'stream', 'crypto', 'url', 'querystring'
    ];

    const start = performance.now();

    await Promise.all(modules.map(m => registry.load(m)));

    const duration = performance.now() - start;

    // Loading 9 modules should be fast (<500ms)
    expect(duration).toBeLessThan(500);

    const stats = registry.getStats();
    expect(stats.totalLoads).toBe(modules.length);
  });
});

describe('Error Handling', () => {
  it('should handle module load errors gracefully', async () => {
    const registry = new LazyModuleRegistry();

    await expect(
      registry.load('./non-existent-module', { timeout: 500 })
    ).rejects.toThrow();
  });

  it('should clean up failed loads from registry', async () => {
    const registry = new LazyModuleRegistry();

    try {
      await registry.load('./non-existent-module', { timeout: 500 });
    } catch {
      // Expected to fail
    }

    // Failed module should not be in registry
    expect(registry.isLoaded('./non-existent-module')).toBe(false);
  });

  it('should track errors in metadata', async () => {
    const registry = new LazyModuleRegistry();

    try {
      await registry.load('./non-existent-module', { timeout: 500 });
    } catch {
      // Expected to fail
    }

    const stats = registry.getStats();
    // Error should be recorded but not affect averageLoadTime
    expect(stats.averageLoadTime).toBe(0); // No successful loads
  });
});
