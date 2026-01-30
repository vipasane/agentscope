# Intelligent Cache - Quick Reference

## Installation

```bash
npm install @vipasane/agentscope-performance
```

## Quick Start

```typescript
import { IntelligentCache } from '@vipasane/agentscope-performance';

// Create cache
const cache = new IntelligentCache<string>({
  type: 'lru',
  maxSize: 1000,
  preloadThreshold: 3,
  minConfidence: 0.7
});

// Set loader
cache.setLoader(async (key) => {
  return await fetchData(key);
});

// Use cache
const value = await cache.get('key');
```

## Configuration

```typescript
interface CacheStrategy {
  type: 'lru' | 'lfu' | 'adaptive';
  maxSize: number;
  ttl?: number; // Milliseconds
  preloadThreshold?: number; // Default: 3
  minConfidence?: number; // Default: 0.7 (70%)
  enablePreload?: boolean; // Default: true
}
```

## API Reference

### Core Methods

```typescript
// Set loader function
cache.setLoader(async (key: string) => T | undefined)

// Get value (with preload)
await cache.get(key: string): Promise<T | undefined>

// Set value (learns pattern)
cache.set(key: string, value: T, ttl?: number): void

// Check existence
cache.has(key: string): boolean

// Delete key
cache.delete(key: string): boolean

// Clear all
cache.clear(): void

// Get size
cache.size(): number

// Get keys
cache.keys(): string[]
```

### Statistics

```typescript
const stats = cache.getStatistics();
// Returns:
{
  hits: number;
  misses: number;
  hitRate: number; // 0-1
  size: number;
  maxSize: number;
  evictions: number;
  preloads: number;
  preloadHits: number;
  preloadRate: number; // 0-1
  patterns: number;
  avgConfidence: number; // 0-1
  avgLatency: number;
  memory: number;
}
```

### Pattern Management

```typescript
// Get pattern for key
const pattern = cache.getPattern('key');
// Returns:
{
  key: string;
  accessCount: number;
  lastAccess: number;
  predictedNext: string[];
  confidence: number; // 0-1
  successRate: number; // 0-1
}

// Get all patterns
const patterns = cache.getAllPatterns();

// Get top N patterns by confidence
const top = cache.getTopPatterns(10);

// Remove stale patterns
const pruned = cache.prunePatterns();
```

## Usage Patterns

### Basic Caching

```typescript
const cache = new IntelligentCache<User>({
  type: 'lru',
  maxSize: 500
});

cache.set('user-1', userData);
const user = await cache.get('user-1');
```

### With Automatic Loading

```typescript
cache.setLoader(async (key) => {
  return await database.get(key);
});

// Auto-loads if not in cache
const value = await cache.get('key');
```

### Learning Patterns

```typescript
// Access in sequence - cache learns
await cache.get('user-1');
await cache.get('profile-1');
await cache.get('settings-1');

// Repeat to build confidence
await cache.get('user-1');
await cache.get('profile-1');
await cache.get('settings-1');

// Check learned pattern
const pattern = cache.getPattern('user-1');
console.log(pattern.predictedNext); // ['profile-1']
console.log(pattern.confidence); // e.g., 0.85
```

### Monitoring Performance

```typescript
const stats = cache.getStatistics();

console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Preload Rate: ${(stats.preloadRate * 100).toFixed(1)}%`);
console.log(`Patterns: ${stats.patterns}`);
console.log(`Avg Confidence: ${stats.avgConfidence.toFixed(2)}`);

if (stats.hitRate < 0.7) {
  console.warn('Consider increasing cache size or preload threshold');
}
```

### Analyzing Patterns

```typescript
// Top 5 patterns
const top = cache.getTopPatterns(5);

top.forEach(p => {
  console.log(`${p.key}:`);
  console.log(`  Predicts: ${p.predictedNext.join(', ')}`);
  console.log(`  Confidence: ${(p.confidence * 100).toFixed(1)}%`);
  console.log(`  Accesses: ${p.accessCount}`);
});
```

### Maintenance

```typescript
// Prune old patterns (>1 hour old)
const pruned = cache.prunePatterns();
console.log(`Removed ${pruned} stale patterns`);

// Clear everything
cache.clear();
```

## Performance Tips

### 1. Tune Preload Threshold

```typescript
// Conservative (fewer preloads)
minConfidence: 0.8

// Aggressive (more preloads)
minConfidence: 0.6
```

### 2. Adjust Pattern Learning

```typescript
// Quick learning (trigger after 2 accesses)
preloadThreshold: 2

// Conservative learning (trigger after 5 accesses)
preloadThreshold: 5
```

### 3. TTL for Volatile Data

```typescript
const cache = new IntelligentCache({
  maxSize: 1000,
  ttl: 300000 // 5 minutes
});

// Or per-entry
cache.set('key', value, 60000); // 1 minute
```

### 4. Monitor and Adjust

```typescript
setInterval(() => {
  const stats = cache.getStatistics();
  
  if (stats.preloadRate < 0.5) {
    // Too many failed preloads - increase confidence
    cache = new IntelligentCache({
      ...config,
      minConfidence: 0.8
    });
  }
}, 60000); // Check every minute
```

## Common Patterns

### User Session Flow

```typescript
// Pattern: user → profile → settings → preferences
const cache = new IntelligentCache<any>({
  maxSize: 1000,
  preloadThreshold: 2,
  minConfidence: 0.7
});

cache.setLoader(async (key) => {
  const [type, id] = key.split('-');
  switch (type) {
    case 'user': return getUser(id);
    case 'profile': return getProfile(id);
    case 'settings': return getSettings(id);
    case 'preferences': return getPreferences(id);
  }
});

// After learning, accessing user-1 preloads profile-1
```

### API Response Caching

```typescript
const apiCache = new IntelligentCache<Response>({
  maxSize: 500,
  ttl: 60000 // 1 minute
});

apiCache.setLoader(async (endpoint) => {
  return await fetch(endpoint).then(r => r.json());
});

// Learns API call patterns
```

### Database Query Results

```typescript
const dbCache = new IntelligentCache<QueryResult>({
  maxSize: 2000,
  preloadThreshold: 3,
  minConfidence: 0.75
});

dbCache.setLoader(async (query) => {
  return await database.query(query);
});

// Learns query patterns (e.g., users → orders → items)
```

## Troubleshooting

### Low Hit Rate

```typescript
const stats = cache.getStatistics();

if (stats.hitRate < 0.6) {
  // Check:
  // 1. Is maxSize too small?
  // 2. Is TTL too short?
  // 3. Are patterns being learned? (check stats.patterns)
  // 4. Is preload working? (check stats.preloads)
}
```

### High Memory Usage

```typescript
// Reduce cache size
maxSize: 500 // Instead of 2000

// Add TTL
ttl: 300000 // 5 minutes

// Prune patterns regularly
setInterval(() => cache.prunePatterns(), 3600000); // Every hour
```

### Preload Not Working

```typescript
const stats = cache.getStatistics();

if (stats.preloads === 0) {
  // Check:
  // 1. Is enablePreload: true?
  // 2. Is loader set?
  // 3. Is confidence threshold too high?
  // 4. Are patterns being learned?
  
  console.log('Patterns:', stats.patterns);
  console.log('Avg confidence:', stats.avgConfidence);
}
```

## Best Practices

1. **Set Loader Early**: Configure loader before first use
2. **Monitor Stats**: Check hit rate and preload rate regularly
3. **Tune Thresholds**: Adjust based on your access patterns
4. **Use TTL**: For volatile data, always set TTL
5. **Prune Patterns**: Clean up stale patterns periodically
6. **Profile Memory**: Monitor memory usage in production
7. **Test Patterns**: Verify learned patterns match expectations

## Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Hit Rate | >80% | 70-90% |
| Preload Rate | >60% | 50-70% |
| Get Latency | <1ms | 0.1-0.5ms |
| Preload Latency | <5ms | 1-3ms |
| Pattern Learning | <0.5ms | 0.1-0.3ms |
| Memory/Entry | <1KB | 150-500 bytes |

## Examples Repository

See `benchmarks/intelligent-cache.bench.ts` for comprehensive examples.

---

**Package**: @vipasane/agentscope-performance
**Version**: 0.1.0-alpha.1
**License**: MIT
