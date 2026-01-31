# API Reference

## LazyModuleRegistry

Core class for dynamic module loading with caching and tracking.

### Constructor

```typescript
new LazyModuleRegistry()
```

Creates a new registry instance. Each instance maintains its own cache.

### Methods

#### load<T>(modulePath: string, options?: LoadOptions): Promise<T>

Load a module dynamically with caching.

**Parameters:**
- `modulePath` - Path to module (relative or absolute)
- `options` - Optional load configuration
  - `track?: boolean` - Enable timing instrumentation (default: true)
  - `timeout?: number` - Timeout in ms (default: 5000)
  - `retry?: number` - Retry count on failure (default: 0)
  - `preload?: boolean` - Preload hint (default: false)

**Returns:** Promise resolving to module exports

**Example:**
```typescript
const registry = new LazyModuleRegistry();

// Load with defaults
const fs = await registry.load('fs');

// Load with timeout
const module = await registry.load('./heavy-module', { timeout: 3000 });

// Load with retry
const unreliable = await registry.load('./flaky-module', { retry: 2 });
```

#### preload(modulePaths: string[], options?: LoadOptions): void

Preload modules in background without blocking.

**Parameters:**
- `modulePaths` - Array of module paths to preload
- `options` - Optional load configuration

**Example:**
```typescript
// Preload common modules
registry.preload([
  './commands/agent',
  './commands/swarm',
  './commands/memory'
]);
```

#### getStats(): ModuleStats

Get statistics about loaded modules.

**Returns:** ModuleStats object

**Example:**
```typescript
const stats = registry.getStats();

console.log({
  totalLoads: stats.totalLoads,
  cacheHits: stats.cacheHits,
  averageLoadTime: stats.averageLoadTime,
  slowestModule: stats.slowestModule,
  loadTimes: stats.loadTimes
});
```

#### getCacheHitRate(): number

Get cache hit rate as decimal (0-1).

**Returns:** Cache hit rate

**Example:**
```typescript
const hitRate = registry.getCacheHitRate();
console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
```

#### getLoadTime(modulePath: string): number | undefined

Get load time for a specific module.

**Parameters:**
- `modulePath` - Module path

**Returns:** Load time in ms, or undefined if not loaded

**Example:**
```typescript
const time = registry.getLoadTime('./commands/agent');
console.log(`Agent command loaded in ${time}ms`);
```

#### isLoaded(modulePath: string): boolean

Check if module is loaded.

**Parameters:**
- `modulePath` - Module path

**Returns:** True if module is loaded

**Example:**
```typescript
if (registry.isLoaded('./commands/agent')) {
  console.log('Agent module ready');
}
```

#### getLoadedModules(): string[]

Get all loaded module paths.

**Returns:** Array of loaded module paths

**Example:**
```typescript
const modules = registry.getLoadedModules();
console.log(`Loaded ${modules.length} modules`);
```

#### clear(): void

Clear the registry cache. Use with caution.

**Example:**
```typescript
registry.clear();
// All modules will need to be reloaded
```

#### exportStats(): object

Export JSON-serializable statistics for monitoring.

**Returns:** Statistics object

**Example:**
```typescript
const stats = registry.exportStats();

// Send to monitoring system
await sendMetrics('cli-startup', stats);

// Or log to file
fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
```

## CLIEntryPoint

Optimized CLI entry point with lazy loading.

### Constructor

```typescript
new CLIEntryPoint(showProgress?: boolean)
```

**Parameters:**
- `showProgress` - Show progress indicator during load (default: false)

### Methods

#### execute(args: string[]): Promise<number>

Execute CLI with given arguments.

**Parameters:**
- `args` - Command-line arguments

**Returns:** Promise resolving to exit code (0 = success, 1 = error)

**Example:**
```typescript
const cli = new CLIEntryPoint();

const exitCode = await cli.execute(['agent', 'spawn', '--type', 'coder']);

if (exitCode === 0) {
  console.log('Success');
}
```

#### exportStats(): object

Export execution statistics.

**Returns:** Statistics object with totalTime and moduleStats

**Example:**
```typescript
const cli = new CLIEntryPoint();
await cli.execute(['--version']);

const stats = cli.exportStats();
console.log(`Total time: ${stats.totalTime}ms`);
console.log(`Modules loaded: ${stats.moduleStats.moduleCount}`);
```

## Global Functions

### lazyLoad<T>(modulePath: string, options?: LoadOptions): Promise<T>

Convenience function using global registry.

**Parameters:**
- `modulePath` - Path to module
- `options` - Optional load configuration

**Returns:** Promise resolving to module exports

**Example:**
```typescript
import { lazyLoad } from '@agentscope/cli-startup-optimizer';

const { spawnCommand } = await lazyLoad('./commands/spawn');
```

### getGlobalStats(): ModuleStats

Get statistics from global registry.

**Returns:** ModuleStats object

**Example:**
```typescript
import { getGlobalStats } from '@agentscope/cli-startup-optimizer';

const stats = getGlobalStats();
console.log(`Cache hit rate: ${stats.cacheHits / stats.totalLoads}`);
```

### executeCLI(args?: string[]): Promise<number>

Execute CLI using global instance.

**Parameters:**
- `args` - Command-line arguments (default: process.argv.slice(2))

**Returns:** Promise resolving to exit code

**Example:**
```typescript
import { executeCLI } from '@agentscope/cli-startup-optimizer';

// Use process.argv
await executeCLI();

// Or provide args
await executeCLI(['agent', 'spawn']);
```

## Type Definitions

### ModuleStats

```typescript
interface ModuleStats {
  totalLoads: number;
  cacheHits: number;
  averageLoadTime: number;
  slowestModule: { path: string; time: number } | null;
  loadTimes: Map<string, number>;
}
```

### LoadOptions

```typescript
interface LoadOptions {
  track?: boolean;
  timeout?: number;
  retry?: number;
  preload?: boolean;
}
```

## Environment Variables

### CLI_DEBUG

Enable debug logging with performance metrics.

```bash
export CLI_DEBUG=true
agentscope --version
```

Output includes:
- Total execution time
- Module load statistics
- Cache hit rate
- Slowest module

### CLI_PROGRESS

Show progress indicator during module loading.

```bash
export CLI_PROGRESS=true
agentscope agent spawn
```

Shows: "Loading command..." during lazy load.

### CLI_VERSION

Override version string display.

```bash
export CLI_VERSION=1.0.0-custom
agentscope --version
```

## Usage Patterns

### Pattern 1: Simple CLI Execution

```typescript
import { executeCLI } from '@agentscope/cli-startup-optimizer';

await executeCLI(process.argv.slice(2));
```

### Pattern 2: With Statistics Monitoring

```typescript
import { CLIEntryPoint } from '@agentscope/cli-startup-optimizer';

const cli = new CLIEntryPoint();
const exitCode = await cli.execute(process.argv.slice(2));

// Log performance metrics
const stats = cli.exportStats();
console.error(`Performance: ${stats.totalTime}ms`);

process.exit(exitCode);
```

### Pattern 3: Preloading for Performance

```typescript
import { globalRegistry, executeCLI } from '@agentscope/cli-startup-optimizer';

// Preload common modules at app start
globalRegistry.preload([
  './commands/agent',
  './commands/swarm',
  './commands/memory'
]);

// Later executions are faster
await executeCLI(['agent', 'spawn']); // Uses preloaded module
```

### Pattern 4: Custom Registry for Isolation

```typescript
import { LazyModuleRegistry } from '@agentscope/cli-startup-optimizer';

// Create isolated registry
const customRegistry = new LazyModuleRegistry();

// Load modules independently
const module1 = await customRegistry.load('./module1');
const module2 = await customRegistry.load('./module2');

// Get statistics for this registry only
const stats = customRegistry.getStats();
```

## Error Handling

### Module Load Timeout

```typescript
try {
  await registry.load('./slow-module', { timeout: 1000 });
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Module load timed out');
  }
}
```

### Module Not Found

```typescript
try {
  await registry.load('./non-existent');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('Module not found');
  }
}
```

### Retry on Failure

```typescript
// Automatically retry up to 3 times
const module = await registry.load('./flaky-module', {
  retry: 3,
  timeout: 2000
});
```

## Performance Best Practices

1. **Use Global Registry** - Share cache across application
2. **Preload Predictable Modules** - Load common modules in background
3. **Set Appropriate Timeouts** - Balance speed vs reliability
4. **Monitor Cache Hit Rate** - Aim for >50% after warmup
5. **Fast Path Check** - Handle --version/--help without module loads

## Migration Guide

### From Eager Loading

**Before:**
```typescript
import { spawnCommand } from './commands/spawn';
import { listCommand } from './commands/list';
import { statusCommand } from './commands/status';

// All modules loaded upfront
```

**After:**
```typescript
import { lazyLoad } from '@agentscope/cli-startup-optimizer';

// Load only when needed
const command = args[0];

if (command === 'spawn') {
  const { spawnCommand } = await lazyLoad('./commands/spawn');
  // Use spawnCommand
}
```

### From Custom Loader

**Before:**
```typescript
async function loadCommand(name: string) {
  return await import(`./commands/${name}`);
}
```

**After:**
```typescript
import { globalRegistry } from '@agentscope/cli-startup-optimizer';

async function loadCommand(name: string) {
  return await globalRegistry.load(`./commands/${name}`, {
    timeout: 3000,
    track: true
  });
}
```
