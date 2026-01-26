# JSDoc Pattern Library for AgentScope

**Version**: 1.0
**Last Updated**: 2026-01-26
**Patterns Stored**: 12 in ReasoningBank (namespace: `patterns`)
**Search Integration**: HNSW-indexed semantic search (150x faster)

This document catalogs successful JSDoc documentation patterns extracted from the AgentScope codebase and stored in ReasoningBank for future reuse and learning.

---

## Quick Reference

| Pattern | Memory Key | Use When | File Example |
|---------|------------|----------|--------------|
| Security Documentation | `jsdoc-security-template` | Documenting security features | `src/core/security/validators.ts` |
| Performance Measurement | `jsdoc-performance-template` | Documenting performance utilities | `src/utils/performance.ts` |
| Builder Pattern | `jsdoc-builder-pattern` | Fluent API implementations | `src/core/formatters/output/document-builder.ts` |
| Configuration Export | `jsdoc-configuration-export` | Export/import functionality | `src/core/export/exporter.ts` |
| Parser/Scanner | `jsdoc-parser-scanner` | Schema parsing with validation | `src/core/scanner/hook-parser.ts` |
| Collection Formatters | `jsdoc-formatters-collection` | Multi-entity formatting | `src/core/formatters/output/section-formatters.ts` |
| Entity Interfaces | `jsdoc-entity-interface` | Type definitions | `src/core/model/types.ts` |
| Defense-in-Depth | `jsdoc-defense-in-depth` | Security best practices | `src/core/security/sanitizers.ts` |
| Module Structure | `jsdoc-module-structure` | Cross-module organization | Multiple (reference architecture) |
| Function Documentation | `jsdoc-function-documentation` | All function-level docs | Common pattern in all modules |
| Class Documentation | `jsdoc-class-documentation` | Class definitions | `src/utils/performance.ts` (PerformanceCache, Timer) |
| Anti-Patterns | `jsdoc-anti-patterns` | What to avoid | Reference guide |

---

## Pattern 1: Security Documentation Template

**Memory Key**: `jsdoc-security-template`
**Source**: `src/core/security/validators.ts`
**Use When**: Documenting security-sensitive functionality, threat models, and protective measures

### Structure

```typescript
/**
 * Security Validators
 *
 * [Concise description of security functionality]
 *
 * ## Security Model
 *
 * This module implements the [architecture layer] protection against [threat types]:
 * 1. **[Layer 1]** - [Description]
 * 2. **[Layer 2]** - [Description]
 * 3. **[Layer 3]** - [Description]
 *
 * ## Threat Vectors Protected
 *
 * - **[Threat 1]**: [Description]
 * - **[Threat 2]**: [Description]
 * - **[Threat 3]**: [Description]
 *
 * ## Usage Pattern
 *
 * Always [sequence] for defense-in-depth:
 * ```typescript
 * // 1. Validate (detect attacks)
 * const result = detectThreats(input);
 *
 * // 2. Sanitize (clean remaining input)
 * const safe = sanitize(input);
 *
 * // 3. Use safely
 * process(safe);
 * ```
 *
 * @module security/validators
 * @see {@link module:security/sanitizers} for output sanitization
 * @see DESIGN-001 security architecture document
 *
 * @example
 * ```typescript
 * import { validateInput, detectThreats } from './validators.js';
 * // Working example showing typical usage
 * ```
 */
```

### Key Components

- **Module Description**: Clear, concise opening
- **Security Model**: Numbered layers with explanations
- **Threat Vectors**: Specific, named threats
- **Usage Pattern**: Step-by-step defensive approach
- **Cross-module Links**: `{@link module:related/module}`
- **Comprehensive Example**: Import + usage flow

### Best Practices

1. Always explain the security architecture upfront
2. Name specific threat types (not just "attacks")
3. Document the validation sequence
4. Show before/after for attacks
5. Link to architecture documents
6. Include working code examples
7. Explain why defense-in-depth matters

---

## Pattern 2: Performance Documentation Template

**Memory Key**: `jsdoc-performance-template`
**Source**: `src/utils/performance.ts`
**Use When**: Documenting performance-critical code, benchmarks, metrics

### Structure

```typescript
/**
 * Performance measurement utilities for [Module Name]
 *
 * Performance Targets (from PRD):
 * - [Metric 1]: [Target] for [condition]
 * - [Metric 2]: [Target] for [condition]
 * - [Metric 3]: [Target] for [condition]
 */

export const PERFORMANCE_TARGETS = {
  // [Metric]: [Value],
  // [Explanation]
  SCAN_MAX_MS: 5000,
  SCAN_MAX_COMPONENTS: 50,
} as const;

/**
 * Measures [what] and [what else]
 *
 * @template T
 * @param operation - Name/description of operation
 * @param fn - Function to measure
 * @returns Object with result and metrics
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  // Implementation with warmup, GC, timing, memory
}

/**
 * Runs [what] multiple times and collects metrics
 *
 * @param name - Benchmark name
 * @param fn - Function to benchmark
 * @param options - Configuration options
 * @returns BenchmarkResult with statistics
 */
export async function benchmark<T>(
  name: string,
  fn: () => Promise<T>,
  options: { iterations?: number; warmupIterations?: number } = {}
): Promise<BenchmarkResult> {
  // Implementation with warmup runs, actual runs, statistics
}
```

### Key Metrics to Document

- **Warmup iterations**: Eliminate startup overhead
- **Statistical measures**: min, max, avg, median, p95, p99, stdDev
- **Memory tracking**: heap usage, delta between operations
- **Target thresholds**: Pass/fail criteria

### Best Practices

1. Define PERFORMANCE_TARGETS as a module-level constant
2. Document benchmarking methodology (warmup, iterations)
3. Include statistical analysis (percentiles)
4. Show memory usage tracking
5. Provide markdown table formatting utilities
6. Support both sync and async measurements
7. Use TypeScript generics for flexibility

---

## Pattern 3: Builder Pattern (Fluent API)

**Memory Key**: `jsdoc-builder-pattern`
**Source**: `src/core/formatters/output/document-builder.ts`
**Use When**: Documenting fluent/chainable APIs and builder patterns

### Structure

```typescript
/**
 * [Builder Name] - [Purpose]
 *
 * Provides a [fluent/chainable] builder pattern for [what it builds]
 * with [feature1], [feature2], [feature3].
 *
 * ## Features
 *
 * - **[Feature 1]**: [Description with benefit]
 * - **[Feature 2]**: [Description with benefit]
 * - **[Feature 3]**: [Description with benefit]
 * - **[Feature 4]**: [Description with benefit]
 *
 * ## Usage Pattern
 *
 * 1. [Step 1 action]
 * 2. [Step 2 action]
 * 3. [Step 3 action]
 * 4. [Step 4 action]
 *
 * @module namespace/builder-name
 * @see {@link RelatedType} for configuration
 *
 * @example
 * ```typescript
 * import { BuilderClass } from './builder.js';
 *
 * const result = new BuilderClass({
 *   option1: true,
 *   option2: 'value'
 * })
 *   .addItem({ field: 'value' })
 *   .addAnother('data')
 *   .withOption('config')
 *   .build();
 * ```
 */

/**
 * [Builder Class] with fluent API for [building what]
 *
 * Provides chainable methods for building [output type] with:
 * - [Capability 1]
 * - [Capability 2]
 * - [Capability 3]
 *
 * @class [BuilderClass]
 */
export class BuilderClass {
  /**
   * [Method description]
   * @param [param1] - [Description]
   * @returns this for method chaining
   */
  addItem(item: Type): this {
    // Implementation
    return this;
  }

  /**
   * [Final build method]
   * @returns Final result
   */
  build(): FinalType {
    // Implementation
  }
}
```

### Key Components

- **Feature list**: Bullet points showing capabilities
- **Usage pattern**: Numbered steps for typical workflow
- **Chainable methods**: Each returns `this`
- **Final build method**: Completes construction
- **Working example**: Shows complete chain

### Best Practices

1. Use feature list for quick capability overview
2. Document usage as numbered steps
3. Make each chainable method clear
4. Use consistent method naming conventions
5. Return `this` from chainable methods
6. Provide comprehensive working examples
7. Document any builder options/configuration

---

## Pattern 4: Configuration Export Documentation

**Memory Key**: `jsdoc-configuration-export`
**Source**: `src/core/export/exporter.ts`
**Use When**: Documenting configuration management, export/import, data portability

### Structure

```typescript
/**
 * Configuration Exporter
 *
 * Exports [entity type] configurations for [use cases]:
 * - [Use case 1]
 * - [Use case 2]
 * - [Use case 3]
 *
 * Ensures [key property] while maintaining [security constraint].
 */

/**
 * Options for [operation]
 */
export interface ExportOptions {
  /** [Field description with invariant] */
  includeSecrets: false;  // Note: Never true
  /** [Field description] */
  bundleMcp: boolean;
  /** [Field description with enum options] */
  format: 'json' | 'yaml';
  /** [Field description] */
  outputDir: string;
}

/**
 * [Manifest/Result] describing the [operation]
 */
export interface ExportManifest {
  /** [Field description] */
  version: string;
  /** [Field description with format] */
  exportedAt: string;
  /** [Field description] */
  entities: EntityCounts;
}

/**
 * Count of [entities] in the [operation]
 */
export interface EntityCounts {
  [entityType]: number;
}
```

### Security Constraints

- Document what is **never** exported (secrets)
- Explain why certain things are excluded
- Show sanitization/transformation applied
- Document integrity verification (checksums)

### Best Practices

1. Start with clear use cases
2. Document security constraints upfront
3. Use field-level JSDoc comments
4. Document invariants (e.g., `includeSecrets: false`)
5. Include manifest/verification information
6. Show entity counts for auditing
7. Reference security architecture

---

## Pattern 5: Parser/Scanner Documentation

**Memory Key**: `jsdoc-parser-scanner`
**Source**: `src/core/scanner/hook-parser.ts`
**Use When**: Documenting schema parsing, validation, configuration reading

### Structure

```typescript
/**
 * [Parser] Module for [Domain]
 *
 * Parses [input source] from [format] (schema [version]).
 * Provides [capabilities]: [capability 1], [capability 2], [capability 3].
 *
 * @module scanner/hook-parser
 */

// ============================================================================
// Types - [Schema Name] [Version]
// ============================================================================

/**
 * [Entity type] from [source schema]
 */
export const VALID_[ENTITY_TYPES] = [
  'value1',
  'value2',
  'value3',
] as const;

export type Valid[EntityType] = typeof VALID_[ENTITY_TYPES][number];

/**
 * Raw [entity] definition from [source format]
 */
export interface Raw[EntityType]Definition {
  /** [Field description] */
  field1: string;
  /** Optional [field description] */
  field2?: string;
}

/**
 * Parsed [entity] with full metadata
 */
export interface Parsed[EntityType] extends [EntityType] {
  /** [Field description] */
  metadata: string;
  /** [Field description] */
  validated: boolean;
}

/**
 * Result of parsing [input] from [source]
 */
export interface ParseResult {
  /** Parsed entities */
  items: Parsed[EntityType][];
  /** Validation errors if any */
  errors: ScanError[];
}
```

### Key Components

- **Schema version**: Document upfront
- **Valid values**: Export as const for type safety
- **Raw vs. Parsed**: Distinguish source and processed types
- **Error handling**: Include error types
- **Type hierarchy**: Show relationships

### Best Practices

1. Document schema version prominently
2. Export constants before types that use them
3. Use Raw* prefix for schema-defined types
4. Use consistent naming (Raw[Entity]Definition)
5. Document validation applied during parsing
6. Include error result types
7. Group types logically with section dividers

---

## Pattern 6: Collection Formatters Documentation

**Memory Key**: `jsdoc-formatters-collection`
**Source**: `src/core/formatters/output/section-formatters.ts`
**Use When**: Documenting formatters for multiple entity types

### Structure

```typescript
/**
 * [Formatter Name] for [Domain] Documentation
 *
 * Generates formatted [output type] sections for all [N] entity types:
 * - [Entity Type 1]
 * - [Entity Type 2]
 * - [Entity Type 3]
 * - [Entity Type 4]
 * - [Entity Type 5]
 * - [Entity Type 6]
 * - [Entity Type 7]
 *
 * Implements the target format from [example reference] with:
 * - [Format feature 1]
 * - [Format feature 2]
 * - [Format feature 3]
 * - [Format feature 4]
 */

export interface FormatterOptions {
  /** [Description with default] */
  compact?: boolean;
  /** [Description with default] */
  includeDetails?: boolean;
  /** [Description with purpose] */
  maxSummaryItems?: number;
}

export interface [EntityType]DisplayInfo {
  /** [Field description] */
  id: string;
  /** [Field description] */
  status: string;
  /** [Computed/formatted field] */
  statusIcon: string;
}

// Utility functions for formatting
```

### Key Components

- **Entity type list**: Bullet points of all supported types
- **Format features**: Bullet points of capabilities
- **Options interface**: Configuration for formatting
- **Display info types**: Computed/formatted field structures
- **Utility functions**: Reusable formatting helpers

### Best Practices

1. List all entity types upfront
2. Document formatting features clearly
3. Create display info types for computed fields
4. Use emoji indicators for status
5. Support both compact and detailed modes
6. Include maximum item limits for scalability
7. Document security sanitization integration

---

## Pattern 7: Entity Interface Documentation

**Memory Key**: `jsdoc-entity-interface`
**Source**: `src/core/model/types.ts`
**Use When**: Documenting data type definitions and interfaces

### Structure

```typescript
/**
 * Core type definitions for [Module]
 * [Brief description of what types represent]
 */

// ============================================================================
// Error Types
// ============================================================================

export type ErrorSeverity = 'fatal' | 'warning' | 'info';

export interface ScanError {
  /** Severity level */
  severity: ErrorSeverity;
  /** Error code identifier */
  code: string;
  /** Human-readable error message */
  message: string;
  /** File where error occurred (optional) */
  file?: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface Agent {
  /** Unique identifier for the agent */
  name: string;
  /** File path where the agent is defined */
  path: string;
  /** Human-readable description */
  description?: string;
  /** Tools/capabilities available to this agent */
  tools?: string[];
  /** Agent type classification */
  type?: AgentType;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type AgentType =
  | 'coordinator'
  | 'worker'
  | 'specialist'
  | 'reviewer'
  | 'custom'
  | string;  // Allows extensibility
```

### Organization Principles

1. **Section dividers**: Use `// =` lines for logical grouping
2. **Field-level comments**: Every exported field documented
3. **One-liner fields**: Concise field descriptions
4. **Optional indicators**: Use `?:` for optional fields
5. **Union types**: Support extensibility with `| string`
6. **Type grouping**: Related types together

### Best Practices

1. Start with short module description
2. Group related types with section dividers
3. Document every interface field
4. Use consistent formatting
5. Support extensibility where appropriate
6. Link to related modules
7. Include usage examples for complex types

---

## Pattern 8: Defense-in-Depth Security Pattern

**Memory Key**: `jsdoc-defense-in-depth`
**Source**: `src/core/security/sanitizers.ts`
**Use When**: Documenting layered security implementations

### Structure

```typescript
/**
 * Security Sanitizers
 *
 * Output sanitization functions for [Module] security, providing the final layer
 * of defense-in-depth protection by ensuring all output is safe for [use].
 *
 * ## Security Model
 *
 * This module implements the output sanitization layer of [ARCHITECTURE]:
 * 1. **[Layer 1]** - [Description and benefit]
 * 2. **[Layer 2]** - [Description and benefit]
 * 3. **[Layer 3]** - [Description and benefit]
 * 4. **[Layer 4]** - [Description and benefit]
 *
 * ## Sanitization Guarantees
 *
 * Each sanitizer provides specific safety guarantees:
 * - `sanitizeId`: [What it ensures] (alphanumeric + underscore only)
 * - `sanitizeLabel`: [What it ensures] (escaped special chars, no HTML/JS)
 * - `sanitizePath`: [What it ensures] (no traversal, within allowed dirs)
 *
 * ## Usage Pattern - Defense in Depth
 *
 * Always use with validation for complete protection:
 * ```typescript
 * // 1. Validate input (detect attacks)
 * const patterns = detectThreats(input);
 * if (patterns.length > 0) {
 *   logger.warn('Attack attempt detected', { patterns });
 * }
 *
 * // 2. Sanitize output (clean remaining input)
 * const safe = sanitize(input);
 *
 * // 3. Use in system (now safe)
 * return safe;
 * ```
 *
 * ## Performance Considerations
 *
 * - Sanitizers use non-backtracking regex to prevent ReDoS
 * - Length limits prevent excessive processing time
 * - Simple string operations (no complex parsing) for speed
 *
 * @module security/sanitizers
 * @see {@link module:security/validators} for input validation
 * @see DESIGN-001 security architecture document
 */
```

### Key Sections

1. **Security Model**: 4-layer approach
2. **Sanitization Guarantees**: Function-specific promises
3. **Usage Pattern**: Step-by-step example
4. **Performance**: Optimization techniques
5. **Cross-references**: Links to validation and architecture

### Best Practices

1. Explain complete security model upfront
2. Document each layer's specific role
3. List sanitization guarantees per function
4. Show validation → sanitization → usage flow
5. Address performance implications
6. Include before/after attack examples
7. Link to supporting architecture docs

---

## Pattern 9: Module Structure and Cross-References

**Memory Key**: `jsdoc-module-structure`
**Source**: All modules (reference pattern)
**Use When**: Organizing cross-module documentation and linking

### Structure

```typescript
/**
 * [Module Purpose]
 *
 * [What this module does and why it matters]
 *
 * [Additional context or implementation details]
 *
 * @module namespace/module-name
 * @see {@link module:related/module1} for [relationship]
 * @see {@link module:related/module2} for [relationship]
 * @see [Architecture Document] for [context]
 *
 * @example
 * ```typescript
 * import { exportedFunction, ExportedType } from './module.js';
 *
 * // Comprehensive example showing typical usage
 * const result = exportedFunction({
 *   param1: 'value',
 *   param2: 'value'
 * });
 *
 * console.log(result);
 * ```
 */

// ============================================================================
// Types Section
// ============================================================================

/**
 * Type definition with purpose
 */
export interface MyType {
  field: string;
}

// ============================================================================
// Constants Section
// ============================================================================

/**
 * Constant description
 */
export const MY_CONSTANT = ['value1', 'value2'] as const;

// ============================================================================
// Functions Section
// ============================================================================

/**
 * Function description with purpose
 * @param param1 - Parameter description
 * @returns Description of return value
 */
export function myFunction(param1: string): ResultType {
  // Implementation
}

// ============================================================================
// Classes Section
// ============================================================================

/**
 * Class description and purpose
 */
export class MyClass {
  // Implementation
}
```

### Organization Pattern

1. **Module-level JSDoc** at top with `@module` tag
2. **Cross-module links** via `{@link module:path/name}`
3. **Section dividers** with full width `// =====` lines
4. **Logical grouping**: Types → Constants → Functions → Classes
5. **Cross-references**: Link to related modules
6. **Comprehensive examples**: Show actual usage patterns

### Link Syntax

```typescript
// Link to another module
@see {@link module:security/validators} for input validation

// Link to type from related module
@see {@link ClassName} from related module

// Link to external reference
@see Architecture document or specification name
```

### Best Practices

1. Always include `@module` tag with full namespace
2. Use `@see` for cross-module relationships
3. Provide comprehensive working examples
4. Use section dividers for organization
5. Keep similar types/functions grouped
6. Link to architecture/design documents
7. Document both internal and external relationships

---

## Pattern 10: Function Documentation

**Memory Key**: `jsdoc-function-documentation`
**Source**: All modules (common pattern)
**Use When**: Documenting functions and methods

### Structure

```typescript
/**
 * [Action verb] [what the function does]
 *
 * [Additional context about why and how]
 *
 * @template T - [Generic type parameter purpose if applicable]
 * @param {type} name - [Description of what this parameter does]
 * @param {Object} options - [Description if options object]
 * @param {type} options.field - [Description of this option]
 * @returns {ReturnType} [Description of what is returned and its structure]
 * @throws {ErrorType} [Description of when/why this error is thrown]
 *
 * @example
 * ```typescript
 * import { myFunction } from './module.js';
 *
 * const result = await myFunction('input', {
 *   option1: true,
 *   option2: 'value'
 * });
 *
 * console.log(result);
 * ```
 */
export async function myFunction<T>(
  input: string,
  options?: { option1?: boolean; option2?: string }
): Promise<T> {
  // Implementation
}

/**
 * Synchronous variant of [related function]
 * @see {@link asyncFunction} for async version
 */
export function myFunctionSync<T>(
  input: string,
  options?: { option1?: boolean; option2?: string }
): T {
  // Implementation
}

/**
 * [Method description for class methods]
 * @returns this for method chaining
 */
class MyClass {
  chainableMethod(param: string): this {
    // Implementation
    return this;
  }
}
```

### Key Tags

- **`@template T`**: Generic type parameters
- **`@param {type} name`**: Function parameters with types
- **`@param {Object} obj.field`**: Destructured parameters
- **`@returns {type}`**: Return value with type
- **`@throws {ErrorType}`**: Errors that can be thrown
- **`@example`**: Working code example
- **`@see`**: Related functions or modules

### Parameter Documentation

```typescript
/**
 * [Description]
 * @param {string} required - A required parameter
 * @param {string} [optional] - An optional parameter with square brackets
 * @param {Object} config - Configuration object
 * @param {string} config.name - Named property
 * @param {number} config.count - Another property
 * @param {string} [config.description] - Optional property
 */
```

### Best Practices

1. Start with action verb (Measures, Validates, Generates, etc.)
2. Document every parameter type and purpose
3. Document return type and what it contains
4. Document errors/exceptions with `@throws`
5. Provide real, working code examples
6. Include optional parameter indicators `[name]`
7. For complex params, break down with dot notation
8. Link to related functions with `@see`

---

## Pattern 11: Class Documentation

**Memory Key**: `jsdoc-class-documentation`
**Source**: `src/utils/performance.ts` (PerformanceCache, Timer classes)
**Use When**: Documenting class definitions and methods

### Structure

```typescript
/**
 * [Class Name] - [What it does]
 *
 * [Detailed description of class purpose and usage]
 *
 * @class [ClassName]
 * @template K - [Type parameter description]
 * @template V - [Type parameter description]
 */
export class MyClass<K, V> {
  /** @type {Map<K, V>} Internal cache storage */
  private cache: Map<K, V> = new Map();

  /** @type {number} Maximum cache size */
  private maxSize: number;

  /**
   * Creates a new [ClassName] instance
   *
   * @param {number} [maxSize=1000] - Maximum number of items to cache
   */
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Retrieves a value from the cache
   *
   * @param {K} key - The key to look up
   * @returns {V | undefined} The cached value or undefined if not found
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Stores a value in the cache with LRU eviction
   *
   * @param {K} key - The key for this value
   * @param {V} value - The value to cache
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  /**
   * [Method description]
   * @returns [Return description]
   */
  getStats(): CacheStats {
    // Implementation
  }

  /**
   * [Private method description]
   */
  private updateHitRate(): void {
    // Implementation
  }
}
```

### Key Components

- **Class-level JSDoc**: Purpose, responsibilities, usage
- **Generic types**: Document `@template` parameters
- **Constructor**: Parameters and initialization
- **Public methods**: Full JSDoc with `@param` and `@returns`
- **Private methods**: Brief inline comments
- **Property comments**: For important state

### Documentation Levels

1. **Class level**: What it is, why it exists, how to use
2. **Constructor level**: Parameters and initialization
3. **Public methods**: Full JSDoc for API
4. **Private methods**: Brief comments for maintainers
5. **Properties**: Comments on important state

### Best Practices

1. Document class purpose and responsibilities
2. Document constructor parameters clearly
3. Document all public method parameters
4. Provide examples of typical usage
5. Include brief comments for private methods
6. Document state transitions if applicable
7. Use `@template` for generic types
8. Link to related types or modules

---

## Pattern 12: Anti-Patterns and What to Avoid

**Memory Key**: `jsdoc-anti-patterns`
**Source**: Reference guide (what NOT to do)
**Use When**: Code review, documentation validation, preventing mistakes

### Common Anti-Patterns

#### ❌ Missing Module-Level Context

```typescript
// BAD - No module purpose
export function validateInput(input: string): boolean {
  // Function implementation
}
```

```typescript
// GOOD - Module purpose documented
/**
 * Security Validators
 *
 * Input validation functions for AgentScope security, implementing
 * defense-in-depth protection against injection attacks, XSS, and malicious input.
 */
export function validateInput(input: string): boolean {
  // Function implementation
}
```

#### ❌ Incomplete Examples

```typescript
// BAD - Incomplete example
/**
 * @example
 * ```typescript
 * validateInput(userInput);
 * ```
 */
```

```typescript
// GOOD - Complete, working example
/**
 * @example
 * ```typescript
 * import { validateInput } from './validators.js';
 *
 * const isValid = validateInput(userInput);
 * if (!isValid) {
 *   throw new Error('Invalid input');
 * }
 * ```
 */
```

#### ❌ Vague Descriptions

```typescript
// BAD - Unclear what validation is done
/**
 * Validates input
 */
export function validate(input: string): boolean;
```

```typescript
// GOOD - Clear about what and why
/**
 * Validates input against injection attack patterns before sanitization.
 * Detects: directive injection, XSS attempts, path traversal, ReDoS patterns.
 * Returns true if only safe input patterns detected.
 */
export function validate(input: string): boolean;
```

#### ❌ Missing Error Documentation

```typescript
// BAD - No error documentation
/**
 * Exports the configuration
 */
export async function exportConfig(path: string): Promise<void>;
```

```typescript
// GOOD - Errors documented
/**
 * Exports the configuration to a file
 * @throws {FileNotFoundError} If output directory does not exist
 * @throws {PermissionError} If no write permissions for output directory
 * @throws {ValidationError} If configuration is invalid
 */
export async function exportConfig(path: string): Promise<void>;
```

#### ❌ Inconsistent Type Documentation

```typescript
// BAD - Inconsistent casing
/** @param {String} name - User name */  // uppercase
/** @param {number} age - User age */      // lowercase
```

```typescript
// GOOD - Consistent lowercase
/** @param {string} name - User name */
/** @param {number} age - User age */
```

#### ❌ Broken Cross-References

```typescript
// BAD - Invalid links
/** @see {@link NonexistentModule} for details */
/** @see {@link module:path} */  // incomplete path
```

```typescript
// GOOD - Valid complete references
/** @see {@link module:security/validators} for input validation */
/** @see {@link module:security/sanitizers} for output sanitization */
```

#### ❌ No Field Documentation

```typescript
// BAD - Interface fields undocumented
export interface Agent {
  name: string;
  path: string;
  description?: string;
  tools?: string[];
}
```

```typescript
// GOOD - Every field documented
export interface Agent {
  /** Unique identifier for the agent */
  name: string;
  /** File path where the agent is defined */
  path: string;
  /** Human-readable description */
  description?: string;
  /** Tools/capabilities available to this agent */
  tools?: string[];
}
```

### Validation Checklist

Use this checklist when writing JSDoc:

- [ ] Is there a module-level JSDoc?
- [ ] Do all public functions have `@param` and `@returns`?
- [ ] Do all interfaces have field-level JSDoc?
- [ ] Are types consistent and lowercase?
- [ ] Are `@link` references valid and complete?
- [ ] Are examples complete and working?
- [ ] Are threat models documented?
- [ ] Are performance characteristics mentioned?
- [ ] Are errors documented with `@throws`?
- [ ] Is the security model explained?

---

## Usage Instructions for Future Development

### Retrieving Patterns from Memory

```bash
# Search for patterns related to a task
npx @claude-flow/cli@latest memory search --query "security documentation" --namespace patterns

# Retrieve a specific pattern
npx @claude-flow/cli@latest memory retrieve --key "jsdoc-security-template" --namespace patterns

# List all patterns
npx @claude-flow/cli@latest memory list --namespace patterns --limit 20
```

### Semantic Search Examples

```bash
# Find patterns for documenting validation
npx @claude-flow/cli@latest memory search --query "validation input checking" --namespace patterns

# Find patterns for builders/fluent APIs
npx @claude-flow/cli@latest memory search --query "builder fluent chainable API" --namespace patterns

# Find performance documentation patterns
npx @claude-flow/cli@latest memory search --query "benchmarks metrics performance targets" --namespace patterns

# Find security patterns
npx @claude-flow/cli@latest memory search --query "security threat defense layers injection" --namespace patterns
```

### Applying Patterns

1. **Identify the task**: What are you documenting? (function, class, module, etc.)
2. **Search for related patterns**: `memory search --query "your task description"`
3. **Retrieve the pattern**: `memory retrieve --key "pattern-key"`
4. **Adapt to your code**: Use the pattern as a template, customize for your needs
5. **Validate**: Check against the validation checklist

### Recording Success

After successfully implementing a new JSDoc pattern:

```bash
# Store your improved pattern variant
npx @claude-flow/cli@latest memory store \
  --key "jsdoc-mypattern-variant" \
  --value '[pattern description]' \
  --namespace patterns
```

---

## Integration with Claude Flow V3

These patterns are integrated with Claude Flow's ReasoningBank intelligence system:

- **HNSW Search**: 150x-12,500x faster semantic search for similar patterns
- **SONA Learning**: Patterns continuously improve through use
- **EWC++ Consolidation**: Prevents catastrophic forgetting of effective patterns
- **Trajectory Tracking**: Each documentation task contributes to learning

When starting a documentation task, Claude Flow will:
1. Search ReasoningBank for similar patterns
2. Suggest the most relevant pattern
3. Track your implementation
4. Learn from successful applications

---

## Summary

| Component | Count | Location | Search |
|-----------|-------|----------|--------|
| Stored Patterns | 12 | ReasoningBank `patterns` namespace | `memory search --query "task"` |
| Pattern Files | 1 | `docs/patterns/JSDOC-PATTERN-LIBRARY.md` | This document |
| Pattern Keys | 12 | Memory database with HNSW indexing | `memory list --namespace patterns` |
| Total Documentation | ~17KB | Memory + this guide | Searchable via vector embeddings |

---

## Maintenance Notes

- **Last Updated**: 2026-01-26
- **Total Patterns**: 12 (comprehensive coverage)
- **Coverage**: Module docs, functions, classes, interfaces, security, performance, builders, anti-patterns
- **Status**: Production ready
- **Vector Indexing**: HNSW enabled (150x faster search)

To add new patterns:
1. Document the new pattern thoroughly
2. Store in memory: `memory store --key "jsdoc-newpattern"`
3. Add entry to this guide with example and best practices
4. Tag in memory for semantic search

---

**Generated with ReasoningBank Intelligence**
See `/workspaces/agentscope/.swarm/memory.db` for pattern storage
