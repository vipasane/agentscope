# API Documentation Guide

Complete guide to using the AgentScope API documentation, generated from TypeScript JSDoc comments using TypeDoc.

## Quick Start

### Accessing the Documentation

1. **Browse Online**: Open `docs/api/index.html` in your browser
2. **Navigation**: Use the left sidebar to browse packages and types
3. **Search**: Use the search feature to find specific types, classes, or functions
4. **Cross-References**: Click on type names to navigate to their definitions

### Documentation Structure

```
docs/api/
├── index.html              # Main entry point
├── modules.html            # Package overview
├── classes.html            # All class definitions
├── interfaces.html         # All interface definitions
├── types.html              # Type aliases
├── functions.html          # Exported functions
├── variables.html          # Module exports
├── enums.html              # Enumeration types
├── hierarchy.html          # Class hierarchy
├── modules/                # Package documentation
│   ├── types.html
│   ├── errors_src.html
│   ├── _claude-flow_security.html
│   ├── _claude-flow_memory.html
│   ├── _claude-flow_performance.html
│   ├── learning_src.html
│   └── testing_src.html
├── classes/                # Class pages
├── interfaces/             # Interface pages
├── types/                  # Type alias pages
├── functions/              # Function pages
├── assets/                 # CSS, JS, and styling
└── .nojekyll              # GitHub Pages marker
```

## Documented Packages

### 1. @vipasane/types - Core Type Definitions

**File**: `modules/types.html`

Contains comprehensive TypeScript type definitions for Claude Flow V3.

#### Key Exports

**Agent Types**:
- `AgentType` - Enumeration of agent types
- `Agent` - Agent interface
- `Tool` - Tool definition
- `Capability` - Agent capability
- `AgentId` - Branded ID type for agents

**Memory Types**:
- `MemoryEntry` - Indexed memory data structure
- `VectorEmbedding` - Vector representation
- `Pattern` - Learned pattern
- `SearchQuery` - Query for semantic search
- `MemoryStats` - Storage statistics

**Security Types**:
- `SecurityFinding` - Security vulnerability report
- `ThreatLevel` - Risk enumeration
- `Threat` - Threat assessment
- `ValidationError` - Input validation error
- `Validation` - Validation result

**Learning Types**:
- `Trajectory` - Reinforcement learning trajectory
- `TrajectoryStep` - Single step in trajectory
- `Pattern` - Learned pattern
- `Consolidation` - Pattern consolidation
- `LearningMetrics` - Learning statistics

**CLI Types**:
- `Command` - Command definition
- `Option` - Option configuration
- `OutputFormat` - Output format type
- `ParseResult` - Parsing result

**Common Types**:
- `Result<T>` - Result type for operations
- `AsyncResult<T>` - Async result type
- `Branded<T, B>` - Branded type wrapper

#### Example Usage

```typescript
import type {
  Agent,
  SecurityFinding,
  MemoryEntry,
  Pattern
} from '@vipasane/types';

// Use imported types in your code
const agent: Agent = {
  id: 'agent-1' as AgentId,
  type: 'coder',
  capabilities: ['code-generation', 'testing']
};
```

---

### 2. @vipasane/errors - Error Handling Framework

**File**: `modules/errors_src.html`

Provides structured error handling with multiple reporting backends.

#### Key Classes

**BaseError**
- Foundation error class
- Properties: `message`, `code`, `severity`
- Methods: `toJSON()`, `toString()`

**ErrorFactory**
- Factory for creating typed errors
- Methods: `createBaseError()`, `createSecurityError()`, `createValidationError()`

**ErrorHandler**
- Central error management
- Methods: `handle()`, `report()`, `recover()`

**ErrorReporter**
- Base reporter class
- Methods: `report()`, `flush()`

**ConsoleReporterBackend**
- Console output reporting
- Formats errors for terminal display

**BatchReporterBackend**
- Batch error collection
- Methods: `flush()`, `getErrors()`

#### Error Types

**SecurityError**
- Security-related errors
- Properties: `finding`, `dreadScore`

**ValidationError**
- Input validation errors
- Properties: `field`, `constraint`

**MemoryError**
- Memory system errors
- Properties: `operation`, `reason`

**NetworkError**
- Network operation errors
- Properties: `statusCode`, `retryable`

#### Example Usage

```typescript
import { ErrorFactory, ErrorHandler } from '@vipasane/errors';

const factory = new ErrorFactory();
const handler = new ErrorHandler();

try {
  // Application code
  throw new Error('Something went wrong');
} catch (error) {
  const appError = factory.createBaseError(
    'Operation failed',
    'OPERATION_FAILED',
    'error'
  );
  handler.report(appError);
}
```

---

### 3. @vipasane/security - Security Framework

**File**: `modules/_claude-flow_security.html`

Comprehensive security framework for threat detection and validation.

#### Key Interfaces

**SecurityFinding**
- Vulnerability documentation
- Properties: `id`, `type`, `severity`, `description`, `mitigation`

**Threat**
- Threat assessment result
- Properties: `type`, `level`, `confidence`, `details`

**ValidationError**
- Input validation error
- Properties: `field`, `message`, `constraint`

**SecurityContext**
- Scanning configuration
- Properties: `scope`, `strictMode`, `customRules`

#### Security Operations

**Threat Detection**
- Identifies potential security issues
- Supports multiple threat types
- Confidence scoring

**Input Validation**
- Sanitizes and validates inputs
- Custom validation rules
- Type-safe validation

**Path Security**
- Prevents path traversal attacks
- Validates file system operations
- URL/URI validation

#### Example Usage

```typescript
import type { SecurityFinding, ThreatLevel } from '@vipasane/security';

const finding: SecurityFinding = {
  id: 'finding-1',
  type: 'input-injection',
  severity: 'high' as ThreatLevel,
  description: 'Potential XSS vulnerability',
  mitigation: 'Sanitize user input'
};
```

---

### 4. @vipasane/memory - Memory & Vector Search

**File**: `modules/_claude-flow_memory.html`

Advanced memory management with semantic search using HNSW indexing.

#### Key Interfaces

**MemoryEntry**
- Indexed memory data
- Properties: `id`, `namespace`, `content`, `embedding`, `metadata`

**VectorEmbedding**
- Vector representation
- Type: `Float32Array` or `number[]`

**SearchQuery**
- Semantic search configuration
- Properties: `query`, `topK`, `threshold`, `namespace`

**MemoryStats**
- Storage statistics
- Properties: `totalEntries`, `totalSize`, `lastAccess`

#### Memory Operations

**Store**: Save embeddings and content
**Retrieve**: Get specific memory entries
**Search**: Semantic vector search
**Update**: Modify existing entries
**Delete**: Remove entries
**Batch**: Bulk operations

#### Performance Features

- **HNSW Indexing**: 150x-12,500x faster search
- **Vector Caching**: LRU cache for hot vectors
- **Batch Operations**: Bulk store/retrieve
- **TTL Support**: Automatic expiration

#### Example Usage

```typescript
import type { MemoryEntry, SearchQuery } from '@vipasane/memory';

const entry: MemoryEntry = {
  id: 'mem-1',
  namespace: 'patterns',
  content: 'Authentication using JWT tokens',
  embedding: new Float32Array([0.1, 0.2, 0.3]),
  createdAt: new Date(),
  metadata: { confidence: 0.95, tags: ['auth', 'security'] }
};

const query: SearchQuery = {
  query: 'JWT authentication',
  topK: 5,
  threshold: 0.7,
  namespace: 'patterns'
};
```

---

### 5. @vipasane/performance - Performance Monitoring

**File**: `modules/_claude-flow_performance.html`

Performance tracking and profiling system.

#### Key Types

**Metric**
- Single performance measurement
- Properties: `name`, `value`, `unit`, `timestamp`, `tags`

**PerformanceSnapshot**
- Memory state snapshot
- Properties: `memory`, `cpu`, `timestamp`

**ExecutionStats**
- Execution metrics
- Properties: `duration`, `count`, `min`, `max`, `avg`, `p95`, `p99`

**BenchmarkResult**
- Benchmark execution result
- Properties: `name`, `duration`, `iterations`, `stats`

#### Performance Operations

**Recording**: Capture metrics
**Profiling**: CPU/memory analysis
**Batching**: Bulk metric collection
**Analysis**: Statistical calculations
**Reporting**: Export metrics

#### Overhead

- Recording: <0.1ms per metric
- Snapshot: <1ms (99th percentile: <0.2ms)
- Analysis: <0.01ms
- Reporting: Variable based on backend

#### Example Usage

```typescript
import type { Metric, ExecutionStats } from '@vipasane/performance';

const metric: Metric = {
  name: 'api_response_time',
  value: 42.5,
  unit: 'ms',
  timestamp: Date.now(),
  tags: { endpoint: '/api/users', method: 'GET' }
};

const stats: ExecutionStats = {
  duration: 1000,
  count: 100,
  min: 8.5,
  max: 125.3,
  avg: 42.5,
  p95: 89.2,
  p99: 120.1
};
```

---

### 6. @vipasane/learning - Learning & Adaptation

**File**: `modules/learning_src.html`

Reinforcement learning and pattern optimization framework.

#### Key Classes

**EWCConsolidator**
- Elastic Weight Consolidation implementation
- Prevents catastrophic forgetting
- Methods: `consolidate()`, `adapt()`

**QLearningOptimizer**
- Q-Learning algorithm implementation
- Methods: `learn()`, `predict()`, `optimize()`

**PatternAnalyzer**
- Pattern extraction and analysis
- Methods: `analyze()`, `extract()`, `score()`

**TrajectoryRecorder**
- Execution trajectory tracking
- Methods: `record()`, `getTrajectory()`, `replay()`

#### Key Types

**Trajectory**
- Learning trajectory sequence
- Properties: `id`, `steps`, `reward`, `metadata`

**TrajectoryStep**
- Single step in trajectory
- Properties: `action`, `state`, `reward`, `timestamp`

**Pattern**
- Learned pattern
- Properties: `id`, `pattern`, `confidence`, `applications`

**LearningMetrics**
- Learning performance metrics
- Properties: `convergence`, `accuracy`, `efficiency`

#### Consolidation Strategy

- Records learning trajectories
- Extracts successful patterns
- Consolidates with EWC++ to prevent forgetting
- Stores patterns for future reference

#### Example Usage

```typescript
import { EWCConsolidator, TrajectoryRecorder } from '@vipasane/learning';

const recorder = new TrajectoryRecorder();
const consolidator = new EWCConsolidator();

// Record trajectory
recorder.record('action-1', { success: true });
recorder.record('action-2', { success: true });

// Get trajectory and consolidate
const trajectory = recorder.getTrajectory();
consolidator.consolidate(trajectory);
```

---

### 7. @vipasane/testing - Testing Utilities

**File**: `modules/testing_src.html`

Comprehensive testing framework and utilities.

#### Key Utilities

**Test Builders**
- Fluent API for test creation
- Methods: `given()`, `when()`, `then()`

**Mock Factories**
- Mock object generation
- Support for all types
- Customizable behavior

**Assertion Helpers**
- Type-safe assertions
- Custom matchers
- Detailed error messages

**Integration Helpers**
- Scenario testing
- Multi-step workflows
- Assertion composition

#### Testing Patterns

**Unit Testing**
```typescript
test('should add numbers', () => {
  expect(add(2, 3)).toBe(5);
});
```

**Integration Testing**
```typescript
test('should process request', async () => {
  const response = await api.get('/data');
  expect(response.status).toBe(200);
});
```

**Scenario Testing**
```typescript
test('should handle workflow', async () => {
  given('initial state')
    .when('action triggered')
    .then('expect outcome');
});
```

---

## Navigation Tips

### Finding Documentation

1. **By Package**: Start at `modules.html` to see all packages
2. **By Type**: Use `types.html` for type aliases, `interfaces.html` for interfaces
3. **By Class**: Browse `classes.html` for class definitions
4. **By Hierarchy**: Check `hierarchy.html` for inheritance chains
5. **By Function**: See `functions.html` for exported functions

### Using Search

1. Click the search icon (magnifying glass)
2. Type a name (e.g., "SecurityFinding", "MemoryEntry")
3. Results show:
   - Type of item (class, interface, type)
   - File location
   - Brief description
4. Click to jump to documentation

### Understanding Type Documentation

Each type page shows:

1. **Type Definition**: Code snippet
2. **Description**: Detailed explanation
3. **Properties**: For interfaces and types
4. **Methods**: For classes
5. **Examples**: Usage examples
6. **See Also**: Related types and references

### Following Links

- **Bold names** are cross-references to other types
- **Code blocks** show examples or syntax
- **Notes** highlight important information
- **Links** navigate to related documentation

---

## Updating Documentation

### Adding JSDoc Comments

All API documentation comes from JSDoc comments in source files. To update documentation:

1. Find the source file (e.g., `packages/types/src/index.ts`)
2. Update the JSDoc comment above the type/function
3. Run `npm run build:docs` to regenerate HTML
4. JSDoc syntax:
   ```typescript
   /**
    * Brief description
    *
    * Longer description with details.
    *
    * @example
    * ```typescript
    * // Usage example
    * ```
    *
    * @see Related types
    */
   ```

### Regenerating Documentation

```bash
# Generate documentation
npx typedoc --options typedoc-build.json

# Or using npm script (if added)
npm run build:docs
```

### Viewing Changes

1. Open `docs/api/index.html` in browser
2. Use `Ctrl+F5` to force refresh (bypass cache)
3. Navigate to modified type
4. Verify changes are present

---

## Known Limitations

### Excluded Packages

**cli-framework** is excluded from this documentation due to TypeScript compilation constraints related to complex JSDoc examples. For cli-framework documentation, see:
- Source: `packages/cli-framework/src/`
- Types: `packages/cli-framework/src/types.ts`

### Cross-Package References

- Internal links work correctly
- External package references may not resolve in some contexts
- See "Architecture Docs" section for complete API overview

---

## Statistical Summary

**Generation Details**:
- **Generated With**: TypeDoc 0.28.16
- **TypeScript Version**: 5.9.3
- **Total HTML Pages**: 253
- **Documentation Size**: ~5.5MB

**Coverage**:
- Documented Packages: 7/8
- Total Classes: 45+
- Total Interfaces: 60+
- Total Types: 100+
- Total Functions: 150+

---

## Support & Resources

### Additional Documentation

- **ADR-012**: [Agent Security Architecture](../adr/ADR-012-agent-security-architecture.md)
- **Architecture**: [V1.2 Architecture Summary](../architecture/v1.2-architecture-summary.md)
- **Package Docs**: [docs/packages/](../packages/)

### Generate Fresh Documentation

```bash
# Full regeneration
npm run build && npx typedoc --options typedoc-build.json

# Watch mode (if available)
npx typedoc --options typedoc-build.json --watch
```

### Offline Usage

The generated documentation is completely static HTML and can be:
- Downloaded and viewed locally
- Deployed to any static hosting
- Included in offline documentation bundles
- Embedded in other documentation sites

---

**Last Updated**: 2026-01-26
**Documentation Version**: 0.1.0
**Status**: Complete for 7/8 packages
