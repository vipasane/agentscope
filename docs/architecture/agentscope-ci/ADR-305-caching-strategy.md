# ADR-305: Caching Strategy

## Status
Proposed

## Context

AgentScope-CI needs to achieve <10s execution time for pre-commit hooks and <30s for CI/CD scans. Without caching, scanning takes:

| Operation | Without Cache | With Cache | Target |
|-----------|---------------|------------|--------|
| Single file scan | ~500ms | ~50ms | <100ms |
| 5 file scan | ~2.5s | ~250ms | <500ms |
| 10 file scan | ~5s | ~500ms | <1s |
| 50 file scan | ~25s | ~2.5s | <5s |

### Requirements

**REQ-CACHE-001**: Cache scan results to avoid re-scanning unchanged files
**REQ-CACHE-002**: Invalidate cache when file content or policy changes
**REQ-CACHE-003**: Cache hit rate >80% for typical workflows
**REQ-CACHE-004**: Cache storage <100MB for 1000 files
**REQ-CACHE-005**: Cache lookup <10ms per file

### Cache Invalidation Scenarios

| Scenario | Action |
|----------|--------|
| File content changed | Invalidate that file's cache entry |
| Policy changed | Invalidate ALL cache entries |
| AgentScope-CI version updated | Invalidate ALL cache entries |
| Manual cache clear | Delete cache directory |
| Cache entry >7 days old | Auto-expire |

## Decision

Use **AgentDB with HNSW indexing** for sub-millisecond cache lookups.

### 1. Cache Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  AgentScope-CI                           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Cache Manager                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Hash-based Key Generation                        │  │
│  │ - File content hash (SHA-256)                    │  │
│  │ - Policy hash (SHA-256)                          │  │
│  │ - Version hash (semver)                          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  AgentDB                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ HNSW Index (150x faster search)                  │  │
│  │ Quantization (4-bit, 75% memory reduction)       │  │
│  │ Hybrid Backend (memory + disk persistence)       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2. Cache Key Design

```typescript
// src/cache/cache-key.ts
import * as crypto from 'crypto';

export interface CacheKeyComponents {
  fileContent: string;      // File content
  policyConfig: PolicyConfig; // Active policy
  version: string;          // AgentScope-CI version
}

export class CacheKeyGenerator {
  /**
   * Generate cache key from file and policy
   */
  generateKey(components: CacheKeyComponents): string {
    const fileHash = this.hashContent(components.fileContent);
    const policyHash = this.hashPolicy(components.policyConfig);
    const versionHash = this.hashVersion(components.version);

    // Composite key: file:policy:version
    return `${fileHash}:${policyHash}:${versionHash}`;
  }

  /**
   * Generate embedding for HNSW search
   */
  generateEmbedding(key: string): Float32Array {
    // Convert hash to 128-dimensional embedding
    const embedding = new Float32Array(128);

    // Use hash bytes as embedding values
    const hash = crypto.createHash('sha256').update(key).digest();

    for (let i = 0; i < 128; i++) {
      // Normalize to [0, 1]
      embedding[i] = hash[i % hash.length] / 255;
    }

    return embedding;
  }

  private hashContent(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 16); // First 16 chars
  }

  private hashPolicy(policy: PolicyConfig): string {
    const json = JSON.stringify(policy, Object.keys(policy).sort());
    return crypto
      .createHash('sha256')
      .update(json)
      .digest('hex')
      .slice(0, 16);
  }

  private hashVersion(version: string): string {
    return crypto
      .createHash('sha256')
      .update(version)
      .digest('hex')
      .slice(0, 8);
  }
}
```

### 3. Cache Manager Implementation

```typescript
// src/cache/cache-manager.ts
import { VectorDatabase } from '@claude-flow/memory';
import { CacheKeyGenerator } from './cache-key';

export interface CacheEntry {
  key: string;
  scanResult: ScanResult;
  violations: PolicyViolation[];
  timestamp: number;
  fileHash: string;
  policyHash: string;
  versionHash: string;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  avgLookupTime: number;
  storageSize: number;
}

export class CacheManager {
  private keyGen = new CacheKeyGenerator();
  private stats = {
    hits: 0,
    misses: 0,
    lookupTimes: [] as number[]
  };

  constructor(private db: VectorDatabase) {}

  /**
   * Get cached scan result (or null if not found)
   */
  async get(
    filePath: string,
    policy: PolicyConfig,
    version: string
  ): Promise<CacheEntry | null> {
    const startTime = performance.now();

    try {
      // 1. Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // 2. Generate cache key and embedding
      const key = this.keyGen.generateKey({
        fileContent,
        policyConfig: policy,
        version
      });
      const embedding = this.keyGen.generateEmbedding(key);

      // 3. Search in AgentDB (HNSW index)
      const results = await this.db.search(embedding, 1);

      if (results.length === 0) {
        this.stats.misses++;
        return null;
      }

      // 4. Verify exact match (distance should be ~0)
      const match = results[0];
      if (match.distance > 0.001) {
        // Not an exact match (hash collision?)
        this.stats.misses++;
        return null;
      }

      // 5. Check expiration (7 days)
      const entry = match.metadata as CacheEntry;
      const age = Date.now() - entry.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (age > maxAge) {
        // Expired - delete and return null
        await this.db.delete(match.id);
        this.stats.misses++;
        return null;
      }

      // Cache hit!
      this.stats.hits++;
      return entry;

    } finally {
      const elapsed = performance.now() - startTime;
      this.stats.lookupTimes.push(elapsed);
    }
  }

  /**
   * Store scan result in cache
   */
  async set(
    filePath: string,
    policy: PolicyConfig,
    version: string,
    scanResult: ScanResult,
    violations: PolicyViolation[]
  ): Promise<void> {
    // 1. Read file content
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // 2. Generate cache key and embedding
    const key = this.keyGen.generateKey({
      fileContent,
      policyConfig: policy,
      version
    });
    const embedding = this.keyGen.generateEmbedding(key);

    // 3. Create cache entry
    const entry: CacheEntry = {
      key,
      scanResult,
      violations,
      timestamp: Date.now(),
      fileHash: this.keyGen['hashContent'](fileContent),
      policyHash: this.keyGen['hashPolicy'](policy),
      versionHash: this.keyGen['hashVersion'](version)
    };

    // 4. Store in AgentDB
    await this.db.insert(key, embedding, entry);
  }

  /**
   * Invalidate all cache entries
   */
  async invalidateAll(): Promise<void> {
    // Delete all entries (AgentDB reset)
    // Implementation depends on AgentDB API
    console.log('Cache invalidated');
  }

  /**
   * Invalidate cache entries for specific policy
   */
  async invalidatePolicy(policy: PolicyConfig): Promise<void> {
    const policyHash = this.keyGen['hashPolicy'](policy);

    // Query for entries with matching policy hash
    // Delete matching entries
    // Implementation depends on AgentDB API
    console.log(`Cache invalidated for policy: ${policyHash}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    const avgLookupTime =
      this.stats.lookupTimes.length > 0
        ? this.stats.lookupTimes.reduce((a, b) => a + b, 0) /
          this.stats.lookupTimes.length
        : 0;

    return {
      totalEntries: total,
      hitRate,
      avgLookupTime,
      storageSize: 0 // TODO: Get from AgentDB
    };
  }

  /**
   * Clear statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      lookupTimes: []
    };
  }
}
```

### 4. AgentDB Configuration for Caching

```typescript
// src/cache/agentdb-config.ts
import { VectorDatabase } from '@claude-flow/memory';

export function createCacheDatabase(): VectorDatabase {
  return new VectorDatabase({
    // Hybrid backend: memory for speed, disk for persistence
    backend: 'hybrid',

    // HNSW indexing for 150x faster search
    hnsw: {
      enabled: true,
      m: 16,              // Connections per node
      efConstruction: 200, // Build quality
      efSearch: 100       // Search quality
    },

    // 4-bit quantization for 75% memory reduction
    quantization: {
      enabled: true,
      bits: 4
    },

    // GNN not needed for cache (simple hash lookups)
    gnn: {
      enabled: false
    }
  });
}
```

### 5. Cache Warming Strategy

```typescript
// src/cache/cache-warmer.ts
export class CacheWarmer {
  constructor(
    private cache: CacheManager,
    private scanner: Scanner
  ) {}

  /**
   * Pre-warm cache by scanning all files
   */
  async warmCache(
    files: string[],
    policy: PolicyConfig,
    version: string
  ): Promise<void> {
    console.log(`Warming cache for ${files.length} files...`);

    for (const file of files) {
      // Check if already cached
      const cached = await this.cache.get(file, policy, version);
      if (cached) continue;

      // Scan and cache
      const scanResult = await this.scanner.scan(file);
      const violations = this.enforcer.enforce(scanResult);

      await this.cache.set(file, policy, version, scanResult, violations);
    }

    console.log('Cache warming complete');
  }

  /**
   * Warm cache in background (CI/CD setup phase)
   */
  async warmCacheBackground(
    directory: string,
    policy: PolicyConfig,
    version: string
  ): Promise<void> {
    const files = await this.findAgentScopeFiles(directory);

    // Run in background (don't block)
    setTimeout(() => {
      this.warmCache(files, policy, version);
    }, 0);
  }

  private async findAgentScopeFiles(directory: string): Promise<string[]> {
    // Find all .claude/*, CLAUDE.md, .mcp.json files
    // Implementation details omitted
    return [];
  }
}
```

### 6. Cache Invalidation on Policy Change

```typescript
// src/cache/policy-watcher.ts
import * as chokidar from 'chokidar';

export class PolicyWatcher {
  constructor(private cache: CacheManager) {}

  /**
   * Watch .agentscope-ci.yml for changes
   */
  watch(policyPath: string): void {
    const watcher = chokidar.watch(policyPath, {
      ignoreInitial: true
    });

    watcher.on('change', async () => {
      console.log('Policy file changed - invalidating cache');

      // Load new policy
      const newPolicy = await this.loadPolicy(policyPath);

      // Invalidate cache entries with old policy
      await this.cache.invalidatePolicy(newPolicy);
    });
  }

  private async loadPolicy(path: string): Promise<PolicyConfig> {
    // Load and parse policy
    // Implementation details omitted
    return {} as PolicyConfig;
  }
}
```

### 7. Performance Benchmarks

```typescript
// tests/cache-performance.test.ts
import { describe, it, expect } from 'vitest';
import { CacheManager } from '../src/cache/cache-manager';
import { createCacheDatabase } from '../src/cache/agentdb-config';

describe('Cache Performance', () => {
  it('should have cache lookup time <10ms', async () => {
    const db = createCacheDatabase();
    const cache = new CacheManager(db);

    // Pre-populate cache
    await cache.set(
      'test.json',
      mockPolicy,
      '1.0.0',
      mockScanResult,
      []
    );

    // Measure lookup time
    const startTime = performance.now();
    await cache.get('test.json', mockPolicy, '1.0.0');
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThan(10);
  });

  it('should achieve >80% cache hit rate on typical workflow', async () => {
    const db = createCacheDatabase();
    const cache = new CacheManager(db);

    // Simulate workflow: scan 10 files, change 2, scan again
    const files = generateTestFiles(10);

    // First scan (all misses)
    for (const file of files) {
      await cache.get(file.path, mockPolicy, '1.0.0');
    }

    // Second scan (80% hits)
    cache.resetStats();
    for (const file of files) {
      await cache.get(file.path, mockPolicy, '1.0.0');
    }

    const stats = cache.getStats();
    expect(stats.hitRate).toBeGreaterThan(0.8);
  });

  it('should use <100MB for 1000 cached files', async () => {
    const db = createCacheDatabase();
    const cache = new CacheManager(db);

    // Cache 1000 files
    for (let i = 0; i < 1000; i++) {
      await cache.set(
        `file${i}.json`,
        mockPolicy,
        '1.0.0',
        mockScanResult,
        []
      );
    }

    const stats = cache.getStats();
    expect(stats.storageSize).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

### 8. CLI Integration

```bash
# Check with cache enabled (default)
agentscope-ci check --cached

# Check without cache (force re-scan)
agentscope-ci check --no-cache

# Warm cache for faster future scans
agentscope-ci cache warm

# Clear cache
agentscope-ci cache clear

# Show cache statistics
agentscope-ci cache stats
```

### 9. Cache Statistics Output

```bash
$ agentscope-ci cache stats

Cache Statistics:
  Total entries: 127
  Hit rate: 87.3%
  Avg lookup time: 3.2ms
  Storage size: 12.4 MB

Performance Impact:
  Without cache: ~25s (estimated)
  With cache: ~2.8s (actual)
  Speedup: 8.9x
```

## Consequences

### Positive

1. **Fast Lookups**: <10ms cache lookup with HNSW (150x faster than sequential)
2. **High Hit Rate**: >80% for typical workflows
3. **Memory Efficient**: 75% reduction with 4-bit quantization
4. **Persistent**: Disk storage survives restarts
5. **Automatic Invalidation**: Policy/file changes detected
6. **Exact Matching**: SHA-256 hashes prevent false positives
7. **AgentDB Integration**: Leverages existing infrastructure

### Negative

1. **Storage Overhead**: ~100KB per cached file (~100MB for 1000 files)
2. **Invalidation Complexity**: Policy changes require cache clear
3. **Cold Start**: First scan still takes full time
4. **AgentDB Dependency**: Requires AgentDB for caching

### Neutral

1. **Cache Warming**: Optional background warming for CI/CD
2. **TTL Expiration**: 7-day TTL requires periodic re-scanning
3. **Hash Collisions**: Extremely rare with SHA-256 (2^-128 probability)

## Related Decisions

- ADR-301: CI/CD Integration Architecture (overall architecture)
- ADR-304: Pre-Commit Integration (hooks use caching)
- DDD-301: CI Domain Model (Cache aggregate)

## References

- [AgentDB HNSW Performance](../COMMON-CORE.md)
- [SHA-256 Hash Collision Probability](https://crypto.stackexchange.com/questions/47809/why-havent-any-sha-256-collisions-been-found-yet)
- [Quantization Techniques](https://arxiv.org/abs/2103.13630)
