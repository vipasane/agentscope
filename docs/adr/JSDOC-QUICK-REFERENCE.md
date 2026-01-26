# JSDoc Quick Reference - ADR-022 Implementation

> **Quick Reference**: Implementation guide for ADR-022 (Common Core JSDoc Architecture)
> **Target**: All 8 `@claude-flow/*` packages
> **Status**: Implementation Ready
> **Last Updated**: 2026-01-26

---

## 5-Layer JSDoc Architecture

### Layer 1: Package-Level Documentation

**Location**: `src/index.ts`

**Template**:
```typescript
/**
 * @claude-flow/{package-name}
 *
 * {Brief description}
 *
 * Features:
 * - {Feature 1 with performance metric}
 * - {Feature 2 with security note}
 * - {Feature 3}
 * - Performance: <{target}ms for {operation}
 *
 * @example
 * ```typescript
 * import { {MainExport} } from '@claude-flow/{package-name}';
 *
 * // Basic usage
 * const result = {MainExport}.{method}({params});
 * ```
 *
 * @see {@link {related-url} | {description}}
 *
 * @packageDocumentation
 */
```

**Example** (security package):
```typescript
/**
 * @claude-flow/security
 *
 * Zero-dependency security validation and sanitization for AI agents
 *
 * Features:
 * - Input validation with Zod-style API
 * - Path traversal prevention (CVE-1 mitigation)
 * - Command injection protection (CVE-2 mitigation)
 * - Secret detection and redaction (CVE-3 mitigation)
 * - Performance: <50ms for validation operations
 *
 * @example
 * ```typescript
 * import { InputValidator, PathValidator } from '@claude-flow/security';
 *
 * const safePath = PathValidator.validate(userInput);
 * const email = InputValidator.string({ email: true }).parse(input);
 * ```
 *
 * @packageDocumentation
 */
```

---

### Layer 2: Class/Function-Level Documentation

**Template**:
```typescript
/**
 * {ClassName} - {Brief purpose}
 *
 * {Detailed description (2-3 sentences)}
 *
 * **Performance**: {timing characteristics}
 * **Security**: {threats mitigated}
 *
 * @example
 * ```typescript
 * // Basic usage
 * {simple example}
 *
 * // Advanced usage
 * {complex example}
 * ```
 *
 * @see {@link {RelatedClass}} for {relationship}
 *
 * @public
 */
export class {ClassName} {
```

**Example** (PathValidator):
```typescript
/**
 * Path Validator - Prevents path traversal attacks (CVE-1 mitigation)
 *
 * Validates and sanitizes file paths to prevent directory traversal
 * and unauthorized file access. Essential for any file system operations.
 *
 * **Performance**: <50ms for path validation
 * **Security**: Prevents CVE-1 (Path Traversal)
 *
 * @example
 * ```typescript
 * // Restrict to workspace
 * const safePath = PathValidator.validate(userInput, {
 *   allowedDirectories: [process.cwd()]
 * });
 *
 * // Check without throwing
 * if (PathValidator.isSafe(userInput)) {
 *   // proceed
 * }
 * ```
 *
 * @see {@link SafeExecutor} for command execution safety
 *
 * @public
 */
export class PathValidator {
```

---

### Layer 3: Parameter Documentation

**Template**:
```typescript
/**
 * {Method description}
 *
 * {Detailed behavior (1-2 sentences)}
 *
 * @param {paramName} - {Description} ({constraints})
 * @param {optionalParam} - {Description} (default: {value})
 * @param options - {Options description}
 * @param options.{field} - {Field description} ({constraints})
 *
 * @returns {Return description}
 *
 * @throws {Error} {Condition when thrown}
 *
 * @example
 * ```typescript
 * {usage example}
 * ```
 *
 * @performance {Performance notes}
 * @security {Security notes}
 *
 * @public
 */
method(paramName: Type, options: Options = {}): ReturnType {
```

**Example** (VectorDatabase.search):
```typescript
/**
 * Search for similar vectors using HNSW indexing
 *
 * Performs approximate nearest neighbor search with 150x-12,500x speedup.
 *
 * @param query - Query vector (must match database dimension)
 * @param k - Number of nearest neighbors to return (1-1000)
 * @param options - Search options
 * @param options.namespace - Filter by namespace (e.g., 'patterns')
 * @param options.tags - Filter by tags (e.g., ['security', 'auth'])
 * @param options.efSearch - HNSW search parameter (default: 100)
 *
 * @returns Array of search results sorted by similarity
 *
 * @example
 * ```typescript
 * // Basic search
 * const results = await db.search(queryVector, 5);
 *
 * // With namespace filter
 * const results = await db.search(queryVector, 10, {
 *   namespace: 'patterns'
 * });
 * ```
 *
 * @performance
 * - HNSW enabled: O(log N) - <10ms for 1M vectors
 * - HNSW disabled: O(N) - ~1.5s for 1M vectors
 *
 * @public
 */
async search(
  query: Float32Array,
  k: number,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
```

---

### Layer 4: Return Value Documentation

**Template**:
```typescript
/**
 * @returns {Type} - {Description}
 *
 * @returns {Structure description}:
 * - `{field}` - {Field description}
 * - `{field}` - {Field description}
 *
 * @returns Empty {type} if {condition}
 */
```

**Example** (ReasoningBank.retrieve):
```typescript
/**
 * Retrieve relevant patterns (Step 1 of 4-step pipeline)
 *
 * @param taskDescription - Task description
 * @param k - Number of patterns to retrieve
 *
 * @returns Promise resolving to array of patterns sorted by similarity.
 *   Empty array if no patterns meet minimum reward threshold.
 *
 * @returns Each pattern contains:
 * - `id` - Unique pattern identifier
 * - `description` - Pattern description
 * - `reward` - Success score (0.0-1.0)
 * - `similarity` - Similarity to query (0.0-1.0)
 *
 * @example
 * ```typescript
 * const patterns = await reasoningBank.retrieve(
 *   'Implement JWT authentication',
 *   5
 * );
 * ```
 *
 * @performance With HNSW: <10ms for 1M patterns (150x speedup)
 *
 * @public
 */
async retrieve(taskDescription: string, k?: number): Promise<Pattern[]> {
```

---

### Layer 5: Examples and Usage Patterns

**Always include**:
1. **Basic Example** - Simplest usage
2. **Advanced Example** - Real-world scenario
3. **Anti-Pattern** - Common mistakes (if applicable)

**Template**:
```typescript
/**
 * @example Basic Usage
 * ```typescript
 * {simple example}
 * ```
 *
 * @example Advanced: {Scenario}
 * ```typescript
 * {complex example}
 * ```
 *
 * @example Anti-Pattern: {Problem}
 * ```typescript
 * // ❌ BAD: {What's wrong}
 * {bad example}
 *
 * // ✅ GOOD: {What's right}
 * {good example}
 * ```
 */
```

**Example** (RetryStrategy):
```typescript
/**
 * @example Basic Usage
 * ```typescript
 * const retry = new RetryStrategy({ maxAttempts: 3 });
 * const result = await retry.execute(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 * ```
 *
 * @example Advanced: Custom Retry Conditions
 * ```typescript
 * const retry = new RetryStrategy({
 *   maxAttempts: 5,
 *   shouldRetry: (error) => error.code === 'ECONNREFUSED'
 * });
 * ```
 *
 * @example Anti-Pattern: Don't Retry Non-Transient Errors
 * ```typescript
 * // ❌ BAD: Retrying validation errors
 * await retry.execute(() => {
 *   if (!isValidEmail(email)) throw new Error('Invalid');
 *   // This will retry 3 times but never succeed!
 * });
 *
 * // ✅ GOOD: Only retry transient errors
 * const retry = new RetryStrategy({
 *   shouldRetry: (error) => error.code === 'ECONNREFUSED'
 * });
 * ```
 */
```

---

## Custom JSDoc Tags

### @performance

**When to use**: Any method with measurable performance characteristics

**Format**:
```typescript
/**
 * @performance
 * - {Configuration}: {Complexity} - {Timing} for {Scale}
 * - Speedup: {Factor}x with {Optimization}
 */
```

**Example**:
```typescript
/**
 * @performance
 * - HNSW enabled: O(log N) - <10ms for 1M vectors
 * - HNSW disabled: O(N) - ~1.5s for 1M vectors
 * - Speedup: 150x-12,500x with HNSW
 */
```

---

### @security

**When to use**: Security-critical functions (validators, sanitizers, authentication)

**Format**:
```typescript
/**
 * @security **{Severity}**: {Threat description}
 */
```

**Example**:
```typescript
/**
 * @security **Critical**: This function prevents CVE-1 (Path Traversal)
 */
```

---

### @internal

**When to use**: Private APIs not intended for public use

**Format**:
```typescript
/**
 * @internal
 */
```

**Example**:
```typescript
/**
 * Internal helper for path normalization
 *
 * @internal
 */
private static normalizePathInternal(path: string): string {
```

---

## Package-Specific Guidelines

### @claude-flow/security

**Required tags**:
- `@security` on all validators and sanitizers
- `@performance` on all validation methods (<50ms target)
- `@example` with both safe and unsafe patterns

**Example structure**:
```typescript
/**
 * {Validator} - Prevents {threat} ({CVE reference})
 *
 * @security **Critical**: Prevents {CVE-X}
 * @performance Target: <50ms
 *
 * @example
 * ```typescript
 * // Safe usage
 * {example}
 * ```
 */
```

---

### @claude-flow/memory

**Required tags**:
- `@performance` on all search/insert methods (include HNSW speedup)
- `@example` with configuration options

**Example structure**:
```typescript
/**
 * {Method} using HNSW indexing
 *
 * @performance
 * - HNSW enabled: O(log N) - {timing}
 * - HNSW disabled: O(N) - {timing}
 * - Speedup: {factor}x
 *
 * @example
 * ```typescript
 * {example}
 * ```
 */
```

---

### @claude-flow/learning

**Required tags**:
- Pipeline step indicator (1. RETRIEVE ← You are here)
- `@see` links to next/previous pipeline steps
- `@performance` with HNSW speedup

**Example structure**:
```typescript
/**
 * {Method} (Step {N} of 4-step pipeline)
 *
 * **4-Step Learning Pipeline:**
 * 1. RETRIEVE - {description}
 * 2. JUDGE - {description} ← You are here
 * 3. DISTILL - {description}
 * 4. CONSOLIDATE - {description}
 *
 * @see {@link {nextStep}} for Step {N+1}
 *
 * @example
 * ```typescript
 * {example}
 * ```
 */
```

---

### @claude-flow/errors

**Required tags**:
- Error code documentation
- Recovery strategy examples
- `@throws` for all error conditions

**Example structure**:
```typescript
/**
 * {ErrorClass} - {Description}
 *
 * Error codes:
 * - `{CODE}` - {Description}
 *
 * @throws {Error} {Condition}
 *
 * @example Recovery Strategy
 * ```typescript
 * try {
 *   {risky operation}
 * } catch (error) {
 *   if (error.code === '{CODE}') {
 *     {recovery}
 *   }
 * }
 * ```
 */
```

---

## ESLint Configuration

Add to `.eslintrc.json`:

```json
{
  "plugins": ["jsdoc"],
  "rules": {
    "jsdoc/require-jsdoc": ["error", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": true
      },
      "exemptEmptyFunctions": false,
      "publicOnly": true
    }],
    "jsdoc/require-param": "error",
    "jsdoc/require-returns": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-returns-description": "error",
    "jsdoc/require-example": ["warn", {
      "exemptedBy": ["internal", "private"],
      "contexts": ["ClassDeclaration", "FunctionDeclaration[async=true]"]
    }],
    "jsdoc/check-alignment": "error",
    "jsdoc/check-indentation": "error",
    "jsdoc/check-syntax": "error",
    "jsdoc/check-tag-names": "error",
    "jsdoc/check-types": "error",
    "jsdoc/valid-types": "error"
  }
}
```

---

## Git Hook (Pre-Commit)

Add to `.githooks/pre-commit`:

```bash
#!/bin/bash

echo "Validating JSDoc..."

# Run ESLint JSDoc validation
npm run lint:jsdoc

if [ $? -ne 0 ]; then
  echo "❌ JSDoc validation failed. Please add documentation."
  echo ""
  echo "See docs/adr/JSDOC-QUICK-REFERENCE.md for guidelines."
  exit 1
fi

echo "✅ JSDoc validation passed"
```

Add to `package.json`:

```json
{
  "scripts": {
    "lint:jsdoc": "eslint --ext .ts --rule 'jsdoc/require-jsdoc: error' packages/*/src/**/*.ts"
  }
}
```

---

## Implementation Checklist

### Phase 1: Critical Packages (Weeks 1-3)

- [ ] **Week 1: @claude-flow/security**
  - [ ] Package-level docs
  - [ ] InputValidator (all methods)
  - [ ] PathValidator (all methods)
  - [ ] SafeExecutor (all methods)
  - [ ] SecretsSanitizer (all methods)
  - [ ] Add @security tags
  - [ ] Add anti-pattern examples

- [ ] **Week 2: @claude-flow/memory**
  - [ ] Package-level docs
  - [ ] VectorDatabase (all methods)
  - [ ] HNSWIndex (all methods)
  - [ ] Quantizer (all methods)
  - [ ] FlashAttention (all methods)
  - [ ] Add @performance tags with speedup factors

- [ ] **Week 3: @claude-flow/learning**
  - [ ] Package-level docs
  - [ ] ReasoningBank (all methods)
  - [ ] TrajectoryTracker
  - [ ] VerdictJudge
  - [ ] MemoryDistiller
  - [ ] EWCConsolidator
  - [ ] Add pipeline step indicators

### Phase 2: Foundation Packages (Weeks 4-5)

- [ ] **Week 4: @claude-flow/types**
  - [ ] Package-level docs
  - [ ] Document all branded types
  - [ ] Document Result type patterns
  - [ ] Add type narrowing examples

- [ ] **Week 5: @claude-flow/errors**
  - [ ] Package-level docs
  - [ ] BaseError hierarchy
  - [ ] ErrorFactory
  - [ ] RetryStrategy
  - [ ] FallbackStrategy
  - [ ] Add error code documentation

### Phase 3: Utility Packages (Week 6)

- [ ] **@claude-flow/performance**
  - [ ] PerformanceMonitor
  - [ ] LRUCache
  - [ ] ParallelExecutor
  - [ ] MemoryProfiler

- [ ] **@claude-flow/cli-framework**
  - [ ] CommandRegistry
  - [ ] ArgumentParser
  - [ ] InteractivePrompt
  - [ ] OutputFormatter

### Phase 4: Testing Package (Week 7)

- [ ] **@claude-flow/testing**
  - [ ] FixtureLoader
  - [ ] Test assertions
  - [ ] Mocks
  - [ ] Integration test runners

### Phase 5: Validation & CI (Week 8)

- [ ] ESLint JSDoc rules configured
- [ ] Git hooks installed
- [ ] CI pipeline updated
- [ ] Documentation validation tests
- [ ] Developer survey deployed

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Missing @example

```typescript
/**
 * Validates email addresses
 * @param email - Email to validate
 * @returns true if valid
 */
static validateEmail(email: string): boolean {
```

**✅ Fix**: Always add @example for public APIs

```typescript
/**
 * Validates email addresses
 *
 * @param email - Email to validate
 * @returns true if valid
 *
 * @example
 * ```typescript
 * if (InputValidator.validateEmail('user@example.com')) {
 *   // proceed
 * }
 * ```
 */
static validateEmail(email: string): boolean {
```

---

### ❌ Mistake 2: Missing @security on security-critical functions

```typescript
/**
 * Validates file paths
 */
static validate(path: string): string {
```

**✅ Fix**: Always add @security tag for validators/sanitizers

```typescript
/**
 * Validates file paths
 *
 * @security **Critical**: Prevents CVE-1 (Path Traversal)
 */
static validate(path: string): string {
```

---

### ❌ Mistake 3: Vague parameter descriptions

```typescript
/**
 * @param options - Options object
 */
method(options: SearchOptions): void {
```

**✅ Fix**: Document each option field

```typescript
/**
 * @param options - Search options
 * @param options.namespace - Filter by namespace
 * @param options.tags - Filter by tags
 * @param options.limit - Max results (default: 10)
 */
method(options: SearchOptions): void {
```

---

### ❌ Mistake 4: Missing performance characteristics

```typescript
/**
 * Searches the database
 */
async search(query: Float32Array, k: number): Promise<SearchResult[]> {
```

**✅ Fix**: Always document performance for search/insert operations

```typescript
/**
 * Searches the database
 *
 * @performance
 * - HNSW enabled: O(log N) - <10ms for 1M vectors
 * - HNSW disabled: O(N) - ~1.5s for 1M vectors
 */
async search(query: Float32Array, k: number): Promise<SearchResult[]> {
```

---

## References

- [ADR-022 Full Document](./ADR-022-common-core-jsdoc-architecture.md)
- [JSDoc Documentation](https://jsdoc.app/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [TSDoc Specification](https://tsdoc.org/)

---

*Quick Reference Version: 1.0 | Created: 2026-01-26 | Based on ADR-022*
