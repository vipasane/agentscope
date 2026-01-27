# Learning Integration - Quick Start

Get started with command pattern learning in 5 minutes.

## Install

```bash
npm install @vipasane/agentscope
```

## Basic Usage

### 1. Enable Learning

```typescript
import { CommandPatternService, createLearningConfig } from '@vipasane/agentscope-cli-framework';

const config = createLearningConfig({ enabled: true });
const service = new CommandPatternService(config);
await service.initialize();
```

### 2. Track Commands

```typescript
import { CommandContext } from '@vipasane/agentscope-cli-framework';

// Track successful execution
await service.trackExecution('npm install', {
  command: 'npm install',
  args: ['lodash'],
  options: {},
  executionTime: 1500,
}, 'success');

// Track failure
await service.trackExecution('npm install', {
  command: 'npm install',
  args: ['bad-package'],
  options: {},
  executionTime: 500,
}, 'failure', new Error('Package not found'));
```

### 3. Get Suggestions

```typescript
const suggestions = await service.suggestCommands('npm', 5);

console.log('Suggestions:');
for (const s of suggestions) {
  console.log(`- ${s.command} ${s.args.join(' ')} (${s.confidence.toFixed(2)})`);
}
```

### 4. Find Similar Errors

```typescript
try {
  // Your command
} catch (error) {
  const patterns = await service.findSimilarErrors(error);

  if (patterns.length > 0) {
    console.log('Similar errors found:');
    patterns.forEach(p => console.log(`- ${p.errorMessage}`));
  }
}
```

## Configuration

### Environment Variables

```bash
export CLI_LEARNING_ENABLED=true
export CLI_LEARNING_MAX_PATTERNS=20000
export CLI_LEARNING_SUGGESTION_THRESHOLD=0.8
```

### Custom Config

```typescript
const config = createLearningConfig({
  enabled: true,
  suggestions: {
    threshold: 0.8,     // Higher confidence
    maxSuggestions: 10, // More suggestions
  },
  patternStorage: {
    maxPatterns: 20000, // Store more patterns
  },
});
```

## Statistics

```typescript
const stats = await service.getStatistics();

console.log(`Total patterns: ${stats.totalPatterns}`);
console.log(`Success rate: ${stats.successRate.toFixed(2)}`);
console.log('Top commands:', stats.topCommands);
```

## Privacy

```typescript
// Clear all patterns (GDPR)
await service.clearPatterns();
```

## Performance

All operations are fast:
- Pattern tracking: <5ms
- Suggestions: <10ms
- Throughput: >1000 tracks/sec

## Next Steps

- Read [full documentation](./README.md)
- See [architecture decisions](../../docs/adr/ADR-025-UPDATE-critical-gaps.md)
- Run [benchmarks](../../benchmarks/learning/pattern-learning.bench.ts)
