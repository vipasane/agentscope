# AgentScope API Documentation

Complete TypeDoc-generated API reference for all AgentScope packages.

## Available Packages

### Core Types
**[@vipasane/types](./modules/types.html)** - Core TypeScript type definitions for Claude Flow V3

Provides comprehensive type definitions for:
- Agent architecture (AgentType, Agent, Tool, Capability)
- Memory system (MemoryEntry, VectorEmbedding, HNSW indexing)
- Security (SecurityFinding, Threat, Validation)
- Learning (Trajectory, Pattern, Consolidation)
- CLI (Command, Option, OutputFormat)
- Common utilities (Result, branded IDs)

### Error Handling
**[@vipasane/errors](./modules/errors_src.html)** - Error handling and reporting framework

Features:
- Structured error types (BaseError, SecurityError, MemoryError)
- Error factory with custom error creation
- Multiple reporter backends (Console, Batch, Custom)
- Error serialization and recovery strategies
- DREAD scoring for security findings

Key Classes:
- `BaseError` - Foundation error class
- `ErrorFactory` - Create typed errors
- `ErrorHandler` - Central error management
- `ErrorReporter` - Multiple reporting backends

### Security
**[@vipasane/security](./modules/_claude-flow_security.html)** - Comprehensive security framework

Provides:
- Input validation and sanitization
- Threat detection and classification
- CVE tracking and mitigation
- Path security and traversal prevention
- Security scanning for agents and content

Key Types:
- `SecurityFinding` - Vulnerability documentation
- `ThreatLevel` - Risk classification
- `ValidationError` - Input validation errors
- `SecurityContext` - Scan configuration

### Memory & Vector Search
**[@vipasane/memory](./modules/_claude-flow_memory.html)** - Advanced memory management with vector search

Features:
- Vector embeddings with HNSW indexing (150x faster)
- Memory entries with TTL support
- Pattern storage and retrieval
- Semantic search capabilities
- Memory statistics and metrics

Key Interfaces:
- `MemoryEntry` - Indexed memory data
- `VectorEmbedding` - Embedding vectors
- `MemoryStats` - Storage metrics
- `SearchQuery` - Semantic search interface

### Performance Monitoring
**[@vipasane/performance](./modules/_claude-flow_performance.html)** - Performance tracking and profiling

Includes:
- Metric recording and collection
- Memory profiling
- Execution timing
- Batch operations
- Statistical analysis

Key Types:
- `Metric` - Performance measurement
- `PerformanceSnapshot` - Memory state
- `ExecutionStats` - Execution metrics
- `BenchmarkResult` - Benchmark data

### Learning & Adaptation
**[@vipasane/learning](./modules/learning_src.html)** - Reinforcement learning and pattern optimization

Features:
- Trajectory recording and analysis
- Pattern learning with EWC++
- Decision optimization
- Learning metrics
- Neural pattern consolidation

Key Classes:
- `EWCConsolidator` - Elastic Weight Consolidation
- `QLearningOptimizer` - Q-Learning implementation
- `PatternAnalyzer` - Pattern extraction
- `TrajectoryRecorder` - Execution tracking

### Testing Utilities
**[@vipasane/testing](./modules/testing_src.html)** - Comprehensive testing framework

Provides:
- Test builders and utilities
- Mock implementations
- Scenario testing
- Integration testing helpers
- Performance testing tools

Key Exports:
- Test builder functions
- Mock factories
- Assertion helpers
- Integration utilities

---

## Navigation

- [Class Hierarchy](./hierarchy.html) - Browse all classes
- [All Modules](./modules.html) - Complete module listing
- [All Interfaces](./interfaces.html) - Interface definitions
- [All Classes](./classes.html) - Class definitions
- [All Types](./types.html) - Type aliases
- [All Functions](./functions.html) - Exported functions
- [All Variables](./variables.html) - Module exports
- [All Enums](./enums.html) - Enumeration types

## Usage Examples

### Importing Types
```typescript
import type {
  Agent,
  AgentId,
  SecurityFinding,
  Pattern,
  MemoryEntry
} from '@vipasane/types';
```

### Error Handling
```typescript
import { ErrorFactory, ErrorHandler } from '@vipasane/errors';

const factory = new ErrorFactory();
const handler = new ErrorHandler();

try {
  // Application code
} catch (error) {
  const finding = factory.createSecurityError('Invalid input');
  handler.report(finding);
}
```

### Memory & Search
```typescript
import type { MemoryEntry, VectorEmbedding } from '@vipasane/memory';

const entry: MemoryEntry = {
  id: 'mem-1',
  namespace: 'patterns',
  content: 'Authentication pattern',
  embedding: [...],
  createdAt: new Date(),
  metadata: { confidence: 0.95 }
};
```

### Performance Tracking
```typescript
import type { Metric, PerformanceSnapshot } from '@vipasane/performance';

const metric: Metric = {
  name: 'api_latency',
  value: 42.5,
  unit: 'ms',
  timestamp: Date.now(),
  tags: { endpoint: '/api/users' }
};
```

---

## Statistics

- **Total HTML Pages**: 253
- **Documented Packages**: 7
- **Total File Size**: ~5.5MB
- **Generated**: 2026-01-26

## Notes

Some packages (like cli-framework) are excluded from this documentation due to TypeScript compilation constraints. For complete documentation including all packages, see:

- **CLI Framework Docs**: [packages/cli-framework/](../packages/cli-framework/)
- **Type Definitions**: [packages/types/src/](../packages/types/src/)
- **Architecture Docs**: [Architecture Guide](../architecture/)

---

Generated with [TypeDoc 0.28.16](https://typedoc.org)
