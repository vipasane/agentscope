# Learning Integration

Command pattern learning with ReasoningBank + HNSW for intelligent CLI suggestions.

## Overview

The Learning Integration component provides adaptive intelligence for the CLI framework through:

- **Command Pattern Tracking**: Records successful and failed command executions
- **Smart Suggestions**: HNSW-based semantic search for command suggestions (150x-12,500x faster)
- **Error Recovery**: Pattern matching for similar errors with suggested fixes
- **Performance**: <5ms tracking, <10ms suggestions, >1000 tracks/sec throughput

## Architecture

```
CommandExecution → CommandPatternService → HNSW Index
                                        ↓
                                   Suggestions
```

### Components

1. **EmbeddingGenerator**: TF-IDF based embedding generation (<10ms)
2. **CommandPatternService**: Pattern storage with HNSW indexing
3. **LearningConfig**: Configuration with validated defaults

## Quick Start

### Enable Learning

```typescript
import { CommandPatternService, createLearningConfig } from '@vipasane/agentscope-cli-framework';

// Create configuration (disabled by default per review Q28)
const config = createLearningConfig({ enabled: true });

// Initialize service
const service = new CommandPatternService(config);
await service.initialize();
```

### Track Command Execution

```typescript
import { CommandContext } from '@vipasane/agentscope-cli-framework';

const context: CommandContext = {
  command: 'npm install',
  args: ['lodash'],
  options: { 'save-dev': true },
  executionTime: 1500,
};

// Track successful execution
await service.trackExecution('npm install', context, 'success');

// Track failure
const error = new Error('Package not found');
await service.trackExecution('npm install', context, 'failure', error);
```

### Get Command Suggestions

```typescript
// Search for suggestions
const suggestions = await service.suggestCommands('npm install', 5);

for (const suggestion of suggestions) {
  console.log(`${suggestion.command} ${suggestion.args.join(' ')}`);
  console.log(`  Confidence: ${suggestion.confidence.toFixed(2)}`);
  console.log(`  Reason: ${suggestion.reason}`);
  console.log(`  Used: ${suggestion.usageCount} times`);
}
```

### Find Error Patterns

```typescript
try {
  // Command execution
} catch (error) {
  // Search for similar errors
  const patterns = await service.findSimilarErrors(error);

  if (patterns.length > 0) {
    console.log('Similar errors found:');
    for (const pattern of patterns) {
      console.log(`- ${pattern.errorMessage}`);
      if (pattern.suggestedFix) {
        console.log(`  Suggested fix: ${pattern.suggestedFix}`);
      }
    }
  }
}
```

## Configuration

### Default Configuration

Based on review decisions from CLI-FRAMEWORK-PHASE-3.5-REVIEW.md:

```typescript
const DEFAULT_CONFIG = {
  enabled: false, // Opt-in (Q28)
  embeddingDimensions: 384,
  hnswConfig: {
    M: 16, // From Q32
    efConstruction: 200, // From Q32
    efSearch: 100,
  },
  patternStorage: {
    maxPatterns: 10000,
    persistToDisk: true,
  },
  suggestions: {
    enabled: true,
    threshold: 0.75, // From Q33
    maxSuggestions: 5,
  },
  errorRecovery: {
    enabled: true,
    threshold: 0.8, // From Q34
  },
};
```

### Environment Variables

```bash
# Enable learning
export CLI_LEARNING_ENABLED=true

# Set max patterns
export CLI_LEARNING_MAX_PATTERNS=20000

# Set suggestion threshold
export CLI_LEARNING_SUGGESTION_THRESHOLD=0.8
```

### Custom Configuration

```typescript
import { createLearningConfig, validateLearningConfig } from '@vipasane/agentscope-cli-framework';

const config = createLearningConfig({
  enabled: true,
  hnswConfig: {
    M: 32, // More accuracy (slower)
    efConstruction: 400,
  },
  suggestions: {
    threshold: 0.8, // More confident suggestions
  },
});

// Validate configuration
validateLearningConfig(config);
```

## HNSW Tuning

### Parameters

- **M** (16 default): Number of connections per node
  - Lower (8-12): Faster search, lower recall
  - Higher (24-32): Slower search, higher recall

- **efConstruction** (200 default): Build quality
  - Lower (100-150): Faster build, lower quality
  - Higher (300-500): Slower build, higher quality

- **efSearch** (100 default): Search quality
  - Lower (50): Faster search, lower recall
  - Higher (200): Slower search, higher recall

### Recommendations

| Dataset Size | M  | efConstruction | efSearch |
|--------------|----|--------------  |----------|
| <1K patterns | 8  | 100            | 50       |
| 1K-10K       | 16 | 200            | 100      |
| 10K-100K     | 24 | 300            | 150      |
| >100K        | 32 | 400            | 200      |

## Performance Targets

From CLI-FRAMEWORK-PHASE-3.5-REVIEW.md:

| Operation | Target | Method |
|-----------|--------|--------|
| Pattern tracking | <5ms | Async storage |
| Embedding generation | <10ms | TF-IDF |
| HNSW search | <2ms | M=16, efConstruction=200 |
| Command suggestions | <10ms | HNSW + filtering |
| Throughput | >1000/sec | Batched operations |

## Cold Start Handling

When database is empty:

```typescript
const suggestions = await service.suggestCommands('npm', 5);
// Returns: [] (empty array, no error)

const stats = await service.getStatistics();
// Returns: { totalPatterns: 0, successRate: 0, ... }
```

Seed with common patterns:

```typescript
const commonPatterns = [
  { command: 'npm install', args: ['<package>'] },
  { command: 'git commit', args: ['-m', '<message>'] },
  { command: 'npm run', args: ['<script>'] },
];

for (const pattern of commonPatterns) {
  const context: CommandContext = {
    command: pattern.command,
    args: pattern.args,
    options: {},
    executionTime: 10,
  };

  await service.trackExecution(pattern.command, context, 'success');
}
```

## Privacy and GDPR

### Opt-In by Default

Learning is **disabled by default** (review Q28) to respect user privacy.

### Data Stored

- Command strings (e.g., "npm install")
- Arguments (e.g., ["lodash"])
- Execution outcomes (success/failure)
- Timestamps
- **Not stored**: Sensitive data, secrets, passwords

### User Control

```typescript
// Clear all patterns (GDPR right-to-erasure)
await service.clearPatterns();

// Check statistics
const stats = await service.getStatistics();
console.log(`Stored patterns: ${stats.totalPatterns}`);
```

## Testing

### Unit Tests

```bash
npm test -- packages/cli-framework/tests/learning
```

Coverage targets:
- EmbeddingGenerator: >90%
- CommandPatternService: >90%
- Overall: >90%

### Integration Tests

```bash
npm test -- packages/cli-framework/tests/integration/learning-integration.test.ts
```

### Benchmarks

```bash
npm run benchmark -- packages/cli-framework/benchmarks/learning/pattern-learning.bench.ts
```

Expected results:
- All benchmarks pass (<5ms tracking, <10ms suggestions)
- Throughput >1000 tracks/sec
- 150x speedup vs linear search (HNSW)

## Troubleshooting

### Slow Suggestions

If suggestions take >10ms:

1. Check HNSW parameters (reduce efSearch)
2. Prune old patterns
3. Rebuild HNSW index

```typescript
// Reduce search quality for speed
const config = createLearningConfig({
  hnswConfig: {
    efSearch: 50, // Reduce from 100
  },
});
```

### Low-Quality Suggestions

If suggestions are not relevant:

1. Increase confidence threshold
2. Increase efSearch for better recall
3. Track more patterns

```typescript
const config = createLearningConfig({
  suggestions: {
    threshold: 0.8, // Increase from 0.75
  },
  hnswConfig: {
    efSearch: 150, // Increase from 100
  },
});
```

### Memory Usage

If memory usage is high:

1. Reduce maxPatterns
2. Enable pattern pruning
3. Disable persistence

```typescript
const config = createLearningConfig({
  patternStorage: {
    maxPatterns: 5000, // Reduce from 10000
    persistToDisk: false,
  },
});
```

## API Reference

See generated TypeScript documentation:

```bash
npm run docs
```

## Related

- [ADR-025-UPDATE](../../docs/adr/ADR-025-UPDATE-critical-gaps.md) - Architecture specification
- [DDD-007-UPDATE](../../docs/architecture/DDD-007-UPDATE-critical-gaps.md) - Domain model
- [CLI-FRAMEWORK-PHASE-3.5-REVIEW](../../docs/reviews/CLI-FRAMEWORK-PHASE-3.5-REVIEW.md) - Review decisions
