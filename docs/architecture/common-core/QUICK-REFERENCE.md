# Common Core Quick Reference

> **Purpose**: Fast lookup for package dependencies, exports, and usage
> **Related**: INTEGRATION-ARCHITECTURE.md, IMPLEMENTATION-CHECKLIST.md

---

## Package Summary

| Package | Layer | Dependencies | Size | Key Exports |
|---------|-------|--------------|------|-------------|
| `@claude-flow/types` | 0 | 0 | 10KB | Types, interfaces |
| `@claude-flow/errors` | 1 | types | 5KB | Error classes, codes |
| `@claude-flow/security` | 2 | types, errors, zod | 50KB | Validators, sanitizers |
| `@claude-flow/performance` | 2 | types, errors | 20KB | Metrics, profiling |
| `@claude-flow/cli-framework` | 2 | types, errors, commander | 30KB | CLI utilities |
| `@claude-flow/memory` | 3 | types, errors, security, agentdb | 500KB | Memory, cache, HNSW |
| `@claude-flow/learning` | 3 | types, errors, memory, onnx | 300KB | Neural, RuVector |
| `@claude-flow/testing` | 4 | ALL | 100KB | Mocks, fixtures |

---

## Quick Import Guide

### Types Package
```typescript
// Full import (not recommended)
import { AgentConfig, MemoryConfig } from '@claude-flow/types';

// Submodule import (better for tree shaking)
import { AgentConfig } from '@claude-flow/types/agent';
import { MemoryConfig } from '@claude-flow/types/memory';
import { HookContext } from '@claude-flow/types/hooks';
```

### Errors Package
```typescript
import { ValidationError, SecurityError, ErrorCode } from '@claude-flow/errors';

// Create custom error
const error = new ValidationError('Invalid input', {
  code: ErrorCode.INVALID_INPUT,
  context: { field: 'email' }
});

// Type guard
if (isClaudeFlowError(error)) {
  console.log(error.code, error.context);
}
```

### Security Package
```typescript
import { InputValidator, PathSanitizer, AIDefence } from '@claude-flow/security';

// Validate input
const validator = new InputValidator();
validator.validate({ email: 'test@example.com' });

// Sanitize path
const sanitizer = new PathSanitizer();
const safePath = sanitizer.sanitize(userInput);

// Detect threats
const aidefence = new AIDefence();
const threat = await aidefence.scan(content);
```

### Performance Package
```typescript
import { MetricsCollector, Profiler, Benchmark } from '@claude-flow/performance';

// Collect metrics
const metrics = new MetricsCollector();
metrics.record('scan.duration', 1234);

// Profile function
const profiler = new Profiler();
profiler.start('operation');
await doWork();
profiler.stop('operation');

// Benchmark
const bench = new Benchmark('My Test');
bench.add('operation', () => doWork());
bench.run();
```

### CLI Framework Package
```typescript
import { Command, ArgParser, OutputFormatter } from '@claude-flow/cli-framework';

// Create command
class ScanCommand extends Command {
  async execute(args: Record<string, any>) {
    console.log('Scanning...', args);
  }
}

// Parse args
const parser = new ArgParser();
const args = parser.parse(process.argv);

// Format output
const formatter = new OutputFormatter();
formatter.table([
  { name: 'Agent 1', status: 'active' },
  { name: 'Agent 2', status: 'idle' }
]);
```

### Memory Package
```typescript
import { MemoryClient, VectorStore, LRUCache } from '@claude-flow/memory';

// Store data
const memory = new MemoryClient();
await memory.store('key', { value: 'data' }, {
  namespace: 'patterns',
  ttl: 3600
});

// Search (HNSW)
const results = await memory.search('query text', {
  namespace: 'patterns',
  limit: 10
});

// Cache
const cache = new LRUCache({ maxSize: 1000 });
cache.set('key', 'value');
const value = cache.get('key');
```

### Learning Package
```typescript
import { NeuralTrainer, RuVector, LearningPipeline } from '@claude-flow/learning';

// Train neural model
const trainer = new NeuralTrainer();
await trainer.train({
  trajectories: [...],
  verdicts: [...]
}, { epochs: 10 });

// RuVector intelligence
const ruvector = new RuVector();
const prediction = await ruvector.predict({
  task: 'scan architecture',
  context: { ... }
});

// Full pipeline
const pipeline = new LearningPipeline({ memory });
await pipeline.run();
```

### Testing Package
```typescript
import { createMockAgent, agentFixtures, assertValidAgent } from '@claude-flow/testing';

// Create mock
const mockAgent = createMockAgent({
  name: 'test-agent',
  type: 'coder'
});

// Use fixture
const agent = agentFixtures.coderAgent;

// Assert
assertValidAgent(agent);
```

---

## Dependency Graph (Visual)

```
                    ┌─────────────┐
                    │   types     │  Layer 0 (0 deps)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   errors    │  Layer 1 (1 dep)
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
   │ security  │    │performance│    │    cli    │  Layer 2 (2 deps)
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                 │                 │
         └────────┬────────┴─────────────────┘
                  │
           ┌──────▼──────┐
           │   memory    │  Layer 3A (3 deps)
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │  learning   │  Layer 3B (3 deps)
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │   testing   │  Layer 4 (7 deps)
           └─────────────┘
```

---

## Build Order

**Sequential**:
```bash
npm run build -w @claude-flow/types
npm run build -w @claude-flow/errors
npm run build -w @claude-flow/security
npm run build -w @claude-flow/performance
npm run build -w @claude-flow/cli-framework
npm run build -w @claude-flow/memory
npm run build -w @claude-flow/learning
npm run build -w @claude-flow/testing
```

**Parallel** (Layer 2 can build concurrently):
```bash
npm run build -w @claude-flow/types && \
npm run build -w @claude-flow/errors && \
npm run build -w @claude-flow/security & \
npm run build -w @claude-flow/performance & \
npm run build -w @claude-flow/cli-framework & \
wait && \
npm run build -w @claude-flow/memory && \
npm run build -w @claude-flow/learning && \
npm run build -w @claude-flow/testing
```

---

## Performance Targets

| Package | Operation | Target | Measurement |
|---------|-----------|--------|-------------|
| **types** | Import | <0.01ms | No runtime cost |
| **errors** | Create error | <0.1ms | Instantiation |
| **security** | Validate | <1ms | Single validation |
| **security** | Sanitize | <0.5ms | Single sanitization |
| **security** | Threat detect | <10ms | With cache |
| **performance** | Metric collection | <0.1ms | Per metric |
| **performance** | Timer | <0.01ms | Start/stop |
| **cli** | Parse args | <5ms | CLI startup |
| **memory** | Store | <50ms | Write to AgentDB |
| **memory** | Search (HNSW) | <10ms | 10K items |
| **memory** | Cache L1 hit | <0.01ms | In-memory |
| **memory** | Cache L2 hit | <1ms | LRU |
| **learning** | SONA adapt | <0.05ms | Adaptation |
| **learning** | Flash Attention | 2.49x-7.47x | Speedup |
| **learning** | Neural predict | <10ms | ONNX inference |

---

## Test Coverage Targets

| Package | Unit | Integration | E2E |
|---------|------|-------------|-----|
| **types** | N/A (type-only) | N/A | N/A |
| **errors** | >95% | N/A | N/A |
| **security** | >95% | >90% | Critical paths |
| **performance** | >95% | N/A | N/A |
| **cli-framework** | >95% | >90% | N/A |
| **memory** | >95% | >90% | Critical paths |
| **learning** | >95% | >90% | Critical paths |
| **testing** | >90% | N/A | N/A |

---

## Common Tasks

### Add New Package
```bash
# 1. Create directory
mkdir -p packages/new-package/src

# 2. Create package.json
cat > packages/new-package/package.json <<EOF
{
  "name": "@claude-flow/new-package",
  "version": "3.0.0-alpha.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "@claude-flow/types": "3.0.0-alpha.1"
  }
}
EOF

# 3. Create tsconfig.json
cat > packages/new-package/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [
    { "path": "../types" }
  ]
}
EOF

# 4. Install dependencies
npm install -w packages/new-package
```

### Bump Version
```bash
# Bump all packages to new version
VERSION=3.0.0-alpha.2
for pkg in packages/*/package.json; do
  npm version $VERSION --workspace $(dirname $pkg) --no-git-tag-version
done
npm version $VERSION --no-git-tag-version
```

### Run Tests
```bash
# All tests
npm test

# Specific package
npm test -w @claude-flow/security

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Build All
```bash
# Clean build
npm run clean
npm run build:order

# Incremental build
npm run build

# Watch mode
npm run dev
```

### Check Circular Dependencies
```bash
npx madge --circular --extensions ts packages/
```

### Benchmark
```bash
# Run all benchmarks
npm run benchmark

# Compare to baseline
node scripts/compare-benchmarks.js \
  --current ./results.json \
  --baseline ./baseline.json \
  --threshold 10%
```

---

## Troubleshooting

### Build Errors

**"Cannot find module '@claude-flow/types'"**
- Check if types package is built first
- Run `npm run build -w @claude-flow/types`

**"Circular dependency detected"**
- Run `npx madge --circular --extensions ts packages/`
- Fix the circular import
- Rebuild

**"TypeScript errors in package X"**
- Check if dependencies are built
- Run `npm run build:order` to build in correct order
- Check `tsconfig.json` references are correct

### Test Failures

**"Module not found in tests"**
- Check if package is built: `npm run build -w @claude-flow/packagename`
- Check test imports use correct package name

**"Timeout in integration tests"**
- Increase timeout: `{ timeout: 10000 }` in test
- Check if async operations are awaited

### Performance Issues

**"HNSW search is slow"**
- Check index is built: `memory.buildHNSWIndex()`
- Check cache is enabled
- Profile with: `npm run benchmark`

**"High memory usage"**
- Enable quantization in memory config
- Use three-tier cache
- Check for memory leaks with profiler

---

## Configuration Examples

### Minimal (Types + Errors Only)
```json
{
  "dependencies": {
    "@claude-flow/types": "^3.0.0-alpha.1",
    "@claude-flow/errors": "^3.0.0-alpha.1"
  }
}
```

### Standard (With Security)
```json
{
  "dependencies": {
    "@claude-flow/types": "^3.0.0-alpha.1",
    "@claude-flow/errors": "^3.0.0-alpha.1",
    "@claude-flow/security": "^3.0.0-alpha.1"
  }
}
```

### Full Stack (All Packages)
```json
{
  "dependencies": {
    "@claude-flow/types": "^3.0.0-alpha.1",
    "@claude-flow/errors": "^3.0.0-alpha.1",
    "@claude-flow/security": "^3.0.0-alpha.1",
    "@claude-flow/performance": "^3.0.0-alpha.1",
    "@claude-flow/cli-framework": "^3.0.0-alpha.1",
    "@claude-flow/memory": "^3.0.0-alpha.1",
    "@claude-flow/learning": "^3.0.0-alpha.1"
  },
  "devDependencies": {
    "@claude-flow/testing": "^3.0.0-alpha.1"
  }
}
```

---

## Related Documentation

- [INTEGRATION-ARCHITECTURE.md](./INTEGRATION-ARCHITECTURE.md) - Full architecture document
- [IMPLEMENTATION-CHECKLIST.md](./IMPLEMENTATION-CHECKLIST.md) - Implementation plan
- [ADR-019](../../adr/ADR-019-comprehensive-claude-flow-integration.md) - Claude-Flow V3 Integration
- [Performance Benchmarks](../../performance/BENCHMARK-SPECIFICATION.md)

---

**Last Updated**: 2026-01-26
**Maintained By**: Core Team

---

*This is a living document. Update as packages evolve.*
