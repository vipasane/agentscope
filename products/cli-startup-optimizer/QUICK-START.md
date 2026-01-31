# Quick Start Guide - CLI Startup Optimizer

**Get started with Phase 1 lazy loading in 5 minutes**

---

## Installation

```bash
cd /workspaces/agentscope/products/cli-startup-optimizer
npm install
npm run build
```

---

## Basic Usage

### 1. Simple CLI Execution

```typescript
import { executeCLI } from '@agentscope/cli-startup-optimizer';

// Execute CLI with arguments
await executeCLI(['agent', 'spawn', '--type', 'coder']);
```

### 2. With Performance Tracking

```typescript
import { CLIEntryPoint } from '@agentscope/cli-startup-optimizer';

const cli = new CLIEntryPoint();
await cli.execute(['--version']);

// Get performance metrics
const stats = cli.exportStats();
console.log(`Startup time: ${stats.totalTime.toFixed(1)}ms`);
console.log(`Modules loaded: ${stats.moduleStats.moduleCount}`);
console.log(`Cache hits: ${stats.moduleStats.cacheHits}`);
```

### 3. Manual Module Loading

```typescript
import { LazyModuleRegistry } from '@agentscope/cli-startup-optimizer';

const registry = new LazyModuleRegistry();

// Load module on-demand
const command = await registry.load('./commands/agent');

// Get statistics
const stats = registry.getStats();
console.log(`Cache hit rate: ${(registry.getCacheHitRate() * 100).toFixed(1)}%`);
```

### 4. Preloading for Performance

```typescript
import { globalRegistry } from '@agentscope/cli-startup-optimizer';

// Preload common modules in background
globalRegistry.preload([
  './commands/agent',
  './commands/swarm',
  './commands/memory'
]);

// Later executions will be faster
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test File

```bash
npm test -- lazy-loader.test.ts
```

---

## Benchmarking

### Cold Start Benchmark

```bash
npm run benchmark:cold
```

**Expected Output:**
```
Running 100 cold start iterations...
  Progress: 100/100

📊 Cold Start Results (--version):
  Mean:   700ms
  P95:    750ms ✅ (<800ms target)

🎯 Phase 1 Target Progress:
  Target:   800ms
  Current:  750ms
  Margin:   6.3% ✅
```

### Warm Start Benchmark

```bash
npm run benchmark:warm
```

**Expected Output:**
```
Running 100 warm start iterations...

📊 Warm Start Results (--version):
  Mean:   300ms
  P95:    350ms ✅ (<400ms target)
```

### Memory Benchmark

Memory benchmark is included in cold start benchmark:

```
💾 Memory Footprint:
  Heap Used:  40 MB ✅ (<60MB target)
  RSS:        55 MB
```

---

## Debug Mode

Enable debug logging to see performance metrics:

```bash
export CLI_DEBUG=true
node dist/src/cli-entry.js --version
```

**Output:**
```
1.0.0-alpha.1
[DEBUG] version completed in 45.2ms

[PERFORMANCE METRICS]
Total time: 45.2ms
Module loads: 0
Cache hits: 0
Avg load time: 0.0ms
Cache hit rate: 0.0%
```

---

## Progress Indicator

Show progress during module loading:

```bash
export CLI_PROGRESS=true
node dist/src/cli-entry.js agent spawn
```

---

## Common Patterns

### Pattern 1: Fast Path Execution

```typescript
// --version and --help use fast paths (0ms module load)
await executeCLI(['--version']); // ~45ms
await executeCLI(['--help']); // ~60ms
```

### Pattern 2: Command Execution

```typescript
// Commands lazy load required modules (~50ms first time)
await executeCLI(['agent', 'spawn']); // ~700ms first time
await executeCLI(['agent', 'list']); // ~650ms (reuses cached modules)
```

### Pattern 3: Statistics Monitoring

```typescript
import { getGlobalStats } from '@agentscope/cli-startup-optimizer';

// After several CLI executions
const stats = getGlobalStats();

console.log({
  totalLoads: stats.totalLoads,
  cacheHits: stats.cacheHits,
  cacheHitRate: (stats.cacheHits / stats.totalLoads * 100).toFixed(1) + '%',
  averageLoadTime: stats.averageLoadTime.toFixed(1) + 'ms',
  slowestModule: stats.slowestModule
});
```

### Pattern 4: Custom Registry

```typescript
// Create isolated registry for testing
import { LazyModuleRegistry } from '@agentscope/cli-startup-optimizer';

const testRegistry = new LazyModuleRegistry();

// Load modules independently
await testRegistry.load('./test-module');

// Clear when done
testRegistry.clear();
```

---

## API Quick Reference

### LazyModuleRegistry

| Method | Description | Example |
|--------|-------------|---------|
| `load<T>(path, options?)` | Load module dynamically | `await registry.load('./module')` |
| `preload(paths)` | Preload in background | `registry.preload(['./m1', './m2'])` |
| `getStats()` | Get statistics | `const stats = registry.getStats()` |
| `getCacheHitRate()` | Get cache hit rate | `const rate = registry.getCacheHitRate()` |
| `isLoaded(path)` | Check if loaded | `if (registry.isLoaded('./module'))` |
| `clear()` | Clear cache | `registry.clear()` |

### CLIEntryPoint

| Method | Description | Example |
|--------|-------------|---------|
| `execute(args)` | Execute CLI | `await cli.execute(['--version'])` |
| `exportStats()` | Export statistics | `const stats = cli.exportStats()` |

### Global Functions

| Function | Description | Example |
|----------|-------------|---------|
| `executeCLI(args?)` | Execute CLI (convenience) | `await executeCLI(['agent', 'spawn'])` |
| `lazyLoad<T>(path, options?)` | Load using global registry | `await lazyLoad('./module')` |
| `getGlobalStats()` | Get global statistics | `const stats = getGlobalStats()` |

---

## Troubleshooting

### Issue: Module not found

**Solution:** Check module path is correct

```typescript
// Use relative or absolute paths
await registry.load('./commands/agent'); // Relative
await registry.load('/path/to/module'); // Absolute
```

### Issue: Timeout error

**Solution:** Increase timeout or check module health

```typescript
await registry.load('./slow-module', {
  timeout: 10000, // 10 seconds
  retry: 2 // Retry twice
});
```

### Issue: Low cache hit rate

**Solution:** Use global registry and consistent paths

```typescript
import { globalRegistry } from '@agentscope/cli-startup-optimizer';

// Always use global registry for sharing
await globalRegistry.load('./module');
```

---

## Performance Tips

1. **Use Fast Paths** - --version/--help don't load modules
2. **Share Registry** - Use global registry across app
3. **Preload Predictable** - Preload common modules in background
4. **Set Appropriate Timeouts** - Balance speed vs reliability
5. **Monitor Metrics** - Track cache hit rate (aim >50%)

---

## Next Steps

1. ✅ Build and test the implementation
2. ✅ Run benchmarks to validate targets
3. 📝 Review Phase 1 documentation
4. 🔜 Plan Phase 2 (Module Caching)

---

## Documentation

- **README**: `/workspaces/agentscope/products/cli-startup-optimizer/README.md`
- **API Reference**: `/workspaces/agentscope/products/cli-startup-optimizer/docs/API.md`
- **Implementation Guide**: `/workspaces/agentscope/products/cli-startup-optimizer/docs/PHASE-1-IMPLEMENTATION.md`
- **Status Report**: `/workspaces/agentscope/products/cli-startup-optimizer/IMPLEMENTATION-STATUS.md`

---

**Ready to optimize your CLI startup time from 1,549ms to <800ms!** 🚀
