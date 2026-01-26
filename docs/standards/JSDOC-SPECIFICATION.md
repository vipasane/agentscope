# JSDoc Standards and Specification

**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-01-26

---

## Table of Contents

1. [Overview](#overview)
2. [JSDoc Style Guide](#jsdoc-style-guide)
3. [Required Tags](#required-tags)
4. [Optional Tags](#optional-tags)
5. [Package-Specific Guidelines](#package-specific-guidelines)
6. [Examples](#examples)
7. [Quality Metrics](#quality-metrics)
8. [Validation Checklist](#validation-checklist)
9. [ESLint Configuration](#eslint-configuration)

---

## Overview

This document defines comprehensive JSDoc standards for the AgentScope monorepo, covering 8 common core packages. These standards ensure consistent, high-quality documentation that balances completeness with maintainability while supporting security documentation, performance considerations, and self-learning patterns.

### Guiding Principles

1. **Clarity First**: Documentation should be clear and unambiguous
2. **Security Aware**: Document security implications and threat vectors
3. **Performance Conscious**: Note performance characteristics where relevant
4. **Example-Driven**: Provide practical examples for all public APIs
5. **Maintainable**: Keep documentation close to code, update with changes
6. **Learning-Enabled**: Support pattern recognition and self-learning systems

### Scope

This specification applies to all TypeScript files in the following packages:

- `@agentscope/types` - Type definitions and interfaces
- `@agentscope/errors` - Error classes and handling
- `@agentscope/cli-framework` - CLI utilities and commands
- `@agentscope/memory` - Memory and state management
- `@agentscope/performance` - Performance monitoring and optimization
- `@agentscope/learning` - Self-learning and pattern recognition
- `@agentscope/security` - Security validation and sanitization
- `@agentscope/testing` - Testing utilities and frameworks

---

## JSDoc Style Guide

### Formatting

```typescript
/**
 * Brief one-line description (imperative mood, no period)
 *
 * Detailed description paragraph explaining what the function/class does,
 * when to use it, and any important context. Use markdown formatting for
 * emphasis, lists, and code blocks.
 *
 * Additional paragraphs for complex functionality, architecture notes,
 * or important warnings.
 *
 * @param paramName - Description starting with capital letter
 * @param optionalParam - Description (optional behavior explained)
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```typescript
 * const result = functionName('input', options);
 * console.log(result); // Expected output
 * ```
 *
 * @example
 * ```typescript
 * // Error handling example
 * try {
 *   functionName(invalidInput);
 * } catch (error) {
 *   console.error('Expected error:', error.message);
 * }
 * ```
 *
 * @see {@link RelatedFunction} for related functionality
 * @since 1.2.0
 */
```

### Terminology

- **Use imperative mood** for descriptions: "Validates input" not "This validates input"
- **Use active voice**: "Throws error" not "Error is thrown"
- **Be specific**: "Prevents XSS attacks" not "Improves security"
- **Use technical terms consistently**: Maintain terminology across related docs

### Tone

- **Professional but approachable**: Avoid overly formal language
- **Direct and concise**: Get to the point quickly
- **Helpful**: Anticipate developer questions
- **Warning-focused**: Highlight security and performance concerns clearly

---

## Required Tags

These tags are **mandatory** for all public APIs (exported functions, classes, interfaces, types).

### @param

```typescript
/**
 * @param paramName - Description starting with capital, ending without period
 * @param optionalParam - Description including optional behavior explanation
 * @param config.nested - For nested object properties (use dot notation)
 */
```

**Requirements**:
- One `@param` per parameter
- Description starts with capital letter
- For objects, document nested properties individually
- Indicate optional parameters explicitly
- Include type information (TypeScript provides this, but clarify unions/complex types)

**Example**:
```typescript
/**
 * Validates user input against security rules
 *
 * @param input - User-provided string to validate
 * @param options - Validation configuration
 * @param options.maxLength - Maximum allowed string length (default: 1000)
 * @param options.allowHtml - Whether to permit HTML tags (default: false)
 * @returns True if input passes validation
 */
function validateInput(
  input: string,
  options?: { maxLength?: number; allowHtml?: boolean }
): boolean {
  // Implementation
}
```

### @returns

```typescript
/**
 * @returns Description of what is returned (type inferred from TypeScript)
 */
```

**Requirements**:
- Required for all functions that return values (except void)
- Describe the semantic meaning, not just the type
- For promises, describe the resolved value
- For complex objects, describe key properties

**Example**:
```typescript
/**
 * @returns Sanitized string safe for HTML rendering, or null if input invalid
 */
function sanitize(input: string): string | null

/**
 * @returns Promise resolving to user data with id, name, and email properties
 */
async function fetchUser(id: string): Promise<User>
```

### @throws

```typescript
/**
 * @throws {ErrorType} When specific condition occurs
 */
```

**Requirements**:
- Document all thrown errors (both custom and built-in)
- Explain the condition that triggers the error
- Include error type in braces
- Critical for security and debugging

**Example**:
```typescript
/**
 * @throws {ValidationError} When input contains malicious patterns
 * @throws {TypeError} When input is not a string
 */
function validateInput(input: string): boolean
```

### @example

```typescript
/**
 * @example
 * ```typescript
 * // Example title or context
 * const result = functionName(input);
 * console.log(result); // Expected output
 * ```
 */
```

**Requirements**:
- At least one example for every public API
- Use TypeScript code blocks with syntax highlighting
- Show realistic, working examples (not pseudocode)
- Include expected output or behavior in comments
- Provide both success and error examples for complex functions
- Keep examples under 15 lines (use multiple examples if needed)

**Example**:
```typescript
/**
 * @example
 * ```typescript
 * // Valid theme names
 * validateThemeName('light');  // true
 * validateThemeName('dark');   // true
 * ```
 *
 * @example
 * ```typescript
 * // Invalid theme names
 * validateThemeName('custom'); // false
 * validateThemeName('');       // false
 * ```
 */
function validateThemeName(theme: string): boolean
```

---

## Optional Tags

Use these tags when relevant to provide additional context.

### @security

```typescript
/**
 * @security Prevents XSS attacks by escaping HTML special characters
 * @security Uses allowlist validation to block injection attempts
 */
```

**When to Use**:
- Functions that validate, sanitize, or process user input
- Security-critical operations (auth, permissions, encryption)
- Functions that prevent specific attack vectors

**Package Priority**: **Required** in `@agentscope/security`, recommended elsewhere

**Example**:
```typescript
/**
 * Sanitizes user input for safe HTML rendering
 *
 * @param input - User-provided string
 * @returns Sanitized string
 *
 * @security Prevents XSS by removing script tags and event handlers
 * @security Prevents injection by escaping Mermaid directive patterns
 * @security Defense-in-depth: Use after validation layer
 *
 * @example
 * ```typescript
 * sanitize('<script>alert(1)</script>'); // Returns: 'alert(1)'
 * ```
 */
function sanitize(input: string): string
```

### @performance

```typescript
/**
 * @performance O(n log n) time complexity for sorting operation
 * @performance Caches results for repeated calls with same input
 * @performance Avoid in hot paths - prefer batch operations
 */
```

**When to Use**:
- Functions with notable performance characteristics
- Operations that may be called frequently (hot paths)
- Memory-intensive operations
- Async operations that may block

**Package Priority**: **Required** in `@agentscope/performance`, recommended for hot paths elsewhere

**Example**:
```typescript
/**
 * Searches memory for matching patterns using vector similarity
 *
 * @param query - Search query string
 * @param limit - Maximum results to return
 * @returns Array of matching memory entries
 *
 * @performance O(log n) search with HNSW index
 * @performance Returns in <10ms for databases up to 1M entries
 * @performance Memory usage: ~384 bytes per vector
 *
 * @example
 * ```typescript
 * const results = await searchMemory('auth patterns', 5);
 * ```
 */
async function searchMemory(query: string, limit: number): Promise<Entry[]>
```

### @since

```typescript
/**
 * @since 1.2.0
 */
```

**When to Use**:
- New APIs added after initial release
- Helps users understand version compatibility

**Example**:
```typescript
/**
 * Validates input using learned patterns
 *
 * @param input - Input to validate
 * @returns Validation result
 * @since 1.2.0
 */
function validateWithLearning(input: string): boolean
```

### @deprecated

```typescript
/**
 * @deprecated Use {@link newFunction} instead - will be removed in v2.0
 */
```

**When to Use**:
- APIs scheduled for removal
- Always provide alternative and removal version

**Example**:
```typescript
/**
 * Validates theme name (legacy)
 *
 * @param theme - Theme name
 * @returns True if valid
 * @deprecated Use {@link validateThemeName} instead - will be removed in v2.0
 */
function isValidTheme(theme: string): boolean
```

### @see

```typescript
/**
 * @see {@link RelatedFunction} for related functionality
 * @see DESIGN-001 security architecture document
 * @see https://example.com/docs for external reference
 */
```

**When to Use**:
- Link to related functions, types, or classes
- Reference architecture documents (ADRs, design docs)
- Link to external specifications or RFCs

**Example**:
```typescript
/**
 * @see {@link sanitizeNodeLabel} for output sanitization
 * @see DESIGN-001 security architecture document
 */
function validateInput(input: string): boolean
```

### @internal

```typescript
/**
 * @internal
 */
```

**When to Use**:
- Private/internal APIs not intended for external use
- Helper functions within a module
- Excludes from generated documentation

### @alpha / @beta / @experimental

```typescript
/**
 * @alpha - API may change without notice
 * @beta - API is stabilizing but may have breaking changes
 * @experimental - Experimental feature, may be removed
 */
```

**When to Use**:
- Unstable APIs in development
- Features being tested with early adopters

---

## Package-Specific Guidelines

### @agentscope/security

**Required Tags**: `@param`, `@returns`, `@throws`, `@example`, `@security`

**Special Requirements**:
- Document all threat vectors prevented
- Include "Usage Pattern" section showing defense-in-depth
- Provide both attack and prevention examples
- Document all validation rules and allowlists
- Note performance characteristics (prevent ReDoS)

**Module-Level Documentation**:
```typescript
/**
 * Security Validators
 *
 * Input validation functions implementing defense-in-depth protection
 * against injection attacks, XSS, and malicious input.
 *
 * ## Security Model
 *
 * This module implements the input validation layer of DESIGN-001:
 * 1. **Allowlist-based validation** - Only permit known-safe values
 * 2. **Pattern detection** - Identify injection attempts
 * 3. **Bounds checking** - Prevent resource exhaustion
 * 4. **Type safety** - Validate data types and structure
 *
 * ## Threat Vectors Protected
 *
 * - **XSS**: Cross-site scripting via HTML/JavaScript injection
 * - **Directive Injection**: Malicious Mermaid directives
 * - **Path Traversal**: Directory traversal attacks
 * - **ReDoS**: Regular expression denial of service
 * - **Resource Exhaustion**: Excessive input sizes
 *
 * ## Usage Pattern
 *
 * Always validate BEFORE sanitization:
 * ```typescript
 * // 1. Validate (detect attacks)
 * const threats = detectInjectionPatterns(userInput);
 * if (threats.length > 0) {
 *   logger.warn('Attack detected', { threats });
 * }
 *
 * // 2. Sanitize (clean input)
 * const safe = sanitizeInput(userInput);
 *
 * // 3. Use safely
 * processData(safe);
 * ```
 *
 * @module security/validators
 * @see {@link module:security/sanitizers} for output sanitization
 * @see DESIGN-001 security architecture document
 */
```

**Function Example**:
```typescript
/**
 * Detects potential injection patterns in input string
 *
 * @param input - User-provided input to check
 * @returns Array of detected pattern descriptions (empty if clean)
 *
 * @security Identifies XSS attempts before sanitization
 * @security Detects directive injection (%%{init:...}%%)
 * @security Catches JavaScript protocols and event handlers
 *
 * @performance O(n) time complexity - checks each pattern once
 * @performance Non-backtracking regex to prevent ReDoS
 *
 * @example
 * ```typescript
 * // Clean input
 * detectInjectionPatterns('normal text'); // []
 * ```
 *
 * @example
 * ```typescript
 * // Malicious input detection
 * detectInjectionPatterns('%%{init: bad}%%');
 * // Returns: ['Directive start', 'Init directive', 'Directive end']
 *
 * detectInjectionPatterns('<script>alert(1)</script>');
 * // Returns: ['HTML tags', 'Script tags']
 * ```
 *
 * @see {@link sanitizeNodeLabel} for sanitization after validation
 */
export function detectInjectionPatterns(input: string): string[]
```

### @agentscope/performance

**Required Tags**: `@param`, `@returns`, `@example`, `@performance`

**Special Requirements**:
- Document time and space complexity
- Note memory allocation patterns
- Identify hot path operations
- Provide benchmark data where available
- Document caching behavior

**Example**:
```typescript
/**
 * Measures execution time of a function with high precision
 *
 * @param fn - Function to measure
 * @param iterations - Number of iterations to run (default: 1)
 * @returns Object with min, max, mean, and median execution times in ms
 *
 * @performance Uses performance.now() for high-resolution timing
 * @performance Minimal overhead: ~0.001ms per measurement
 * @performance Memory: O(iterations) for storing measurements
 *
 * @example
 * ```typescript
 * const stats = measureExecution(() => {
 *   expensiveOperation();
 * }, 100);
 *
 * console.log(`Mean: ${stats.mean}ms`);
 * // Mean: 15.234ms
 * ```
 */
export function measureExecution(
  fn: () => void,
  iterations?: number
): ExecutionStats
```

### @agentscope/memory

**Required Tags**: `@param`, `@returns`, `@throws`, `@example`
**Recommended Tags**: `@performance`, `@see`

**Special Requirements**:
- Document memory persistence behavior
- Note vector embedding dimensions
- Explain search algorithms (HNSW, etc.)
- Document TTL and expiration
- Link to related memory operations

**Example**:
```typescript
/**
 * Stores data in memory with optional vector embedding
 *
 * @param key - Unique identifier for the stored data
 * @param value - Data to store (will be serialized)
 * @param options - Storage options
 * @param options.namespace - Namespace for organization (default: 'default')
 * @param options.ttl - Time-to-live in seconds (default: none)
 * @param options.tags - Tags for categorization
 * @returns Promise resolving to storage metadata
 *
 * @throws {ValidationError} When key is empty or invalid
 * @throws {StorageError} When database write fails
 *
 * @performance O(log n) insertion with HNSW index
 * @performance Vector embedding: 384 dimensions, ~1.5ms generation
 * @performance Supports 1M+ entries per namespace
 *
 * @example
 * ```typescript
 * await memoryStore('pattern-auth', {
 *   type: 'authentication',
 *   approach: 'JWT with refresh tokens',
 *   success: true
 * }, {
 *   namespace: 'patterns',
 *   tags: ['auth', 'security']
 * });
 * ```
 *
 * @see {@link memorySearch} for semantic search
 * @see {@link memoryRetrieve} for direct retrieval
 */
export async function memoryStore(
  key: string,
  value: any,
  options?: MemoryOptions
): Promise<MemoryMetadata>
```

### @agentscope/learning

**Required Tags**: `@param`, `@returns`, `@example`
**Recommended Tags**: `@performance`, `@see`, `@since`

**Special Requirements**:
- Document learning algorithms used
- Explain training data requirements
- Note model sizes and performance
- Document pattern recognition behavior

**Example**:
```typescript
/**
 * Trains neural pattern on successful task outcomes
 *
 * Uses MoE (Mixture of Experts) architecture with EWC++ to prevent
 * catastrophic forgetting while learning new patterns.
 *
 * @param pattern - Pattern data from completed task
 * @param pattern.input - Original task description
 * @param pattern.output - Successful result
 * @param pattern.metadata - Context metadata
 * @param epochs - Training iterations (default: 10)
 * @returns Promise resolving to training metrics
 *
 * @performance Training time: ~50ms per epoch for typical patterns
 * @performance Memory: ~2MB model size increase per 100 patterns
 * @performance Uses Flash Attention for 2.49x-7.47x speedup
 *
 * @example
 * ```typescript
 * const metrics = await trainPattern({
 *   input: 'Implement authentication',
 *   output: { approach: 'JWT', files: ['auth.ts'] },
 *   metadata: { complexity: 'medium', duration: 1800 }
 * }, 10);
 *
 * console.log(`Loss: ${metrics.finalLoss}`);
 * // Loss: 0.023
 * ```
 *
 * @see {@link predictPattern} for inference
 * @since 1.2.0
 */
export async function trainPattern(
  pattern: PatternData,
  epochs?: number
): Promise<TrainingMetrics>
```

### @agentscope/errors

**Required Tags**: `@param`, `@example`
**Recommended Tags**: `@see`

**Special Requirements**:
- Document error hierarchy
- Explain when each error type is thrown
- Provide recovery examples
- Document error properties

**Example**:
```typescript
/**
 * Validation error thrown when input fails security checks
 *
 * This error indicates user input contains patterns that could pose
 * security risks. The `patterns` property contains details of detected
 * threats for logging and monitoring.
 *
 * @param message - Human-readable error description
 * @param patterns - Array of detected malicious patterns
 *
 * @example
 * ```typescript
 * // Throwing the error
 * const threats = detectInjectionPatterns(input);
 * if (threats.length > 0) {
 *   throw new ValidationError(
 *     'Input contains malicious patterns',
 *     threats
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Catching and handling
 * try {
 *   validateInput(userInput);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     logger.security('Validation failed', {
 *       patterns: error.patterns
 *     });
 *     return { error: 'Invalid input' };
 *   }
 *   throw error;
 * }
 * ```
 *
 * @see {@link detectInjectionPatterns} for pattern detection
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly patterns: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### @agentscope/types

**Required Tags**: None for type definitions (description sufficient)
**Recommended Tags**: `@example`, `@see`

**Special Requirements**:
- Explain purpose and use cases
- Document each property with inline comments
- Provide complete usage examples
- Link to implementing functions

**Example**:
```typescript
/**
 * Configuration options for memory storage
 *
 * Controls how data is stored, indexed, and retrieved from the memory
 * system. All properties are optional with sensible defaults.
 *
 * @example
 * ```typescript
 * const options: MemoryOptions = {
 *   namespace: 'patterns',
 *   ttl: 3600,
 *   tags: ['auth', 'security'],
 *   embedding: true
 * };
 *
 * await memoryStore('key', data, options);
 * ```
 *
 * @see {@link memoryStore} for usage
 */
export interface MemoryOptions {
  /** Namespace for organizing related entries (default: 'default') */
  namespace?: string;

  /** Time-to-live in seconds (default: no expiration) */
  ttl?: number;

  /** Tags for categorization and filtering */
  tags?: string[];

  /** Generate vector embedding for semantic search (default: true) */
  embedding?: boolean;

  /** Priority level for memory consolidation (default: 'normal') */
  priority?: 'low' | 'normal' | 'high' | 'critical';
}
```

### @agentscope/cli-framework

**Required Tags**: `@param`, `@returns`, `@throws`, `@example`
**Recommended Tags**: `@see`

**Special Requirements**:
- Document CLI argument format
- Provide terminal usage examples
- Explain command behavior and side effects
- Document exit codes

**Example**:
```typescript
/**
 * Registers a CLI command with the framework
 *
 * @param name - Command name (lowercase, hyphens for spaces)
 * @param handler - Function to execute when command is called
 * @param options - Command configuration
 * @param options.description - Brief command description for --help
 * @param options.args - Expected arguments with types and descriptions
 * @param options.flags - Optional flags with defaults
 * @returns Command registration object
 *
 * @throws {CommandError} When command name conflicts with existing command
 *
 * @example
 * ```typescript
 * registerCommand('memory-search', async (args) => {
 *   const results = await searchMemory(args.query, args.limit);
 *   console.log(results);
 *   return 0; // Exit code
 * }, {
 *   description: 'Search memory using semantic similarity',
 *   args: [
 *     { name: 'query', type: 'string', required: true }
 *   ],
 *   flags: [
 *     { name: 'limit', type: 'number', default: 5 }
 *   ]
 * });
 * ```
 *
 * @example
 * ```bash
 * # Terminal usage
 * npx cli memory-search "authentication patterns" --limit 10
 * ```
 */
export function registerCommand(
  name: string,
  handler: CommandHandler,
  options: CommandOptions
): CommandRegistration
```

### @agentscope/testing

**Required Tags**: `@param`, `@returns`, `@example`
**Recommended Tags**: `@see`

**Special Requirements**:
- Explain test utilities purpose
- Provide complete test examples
- Document mock/stub behavior
- Note async test handling

**Example**:
```typescript
/**
 * Creates a mock memory store for testing
 *
 * Provides an in-memory implementation of the memory store interface
 * without requiring database setup. All data is lost when mock is disposed.
 *
 * @param initialData - Optional seed data for the mock store
 * @returns Mock memory store instance with full API
 *
 * @example
 * ```typescript
 * import { createMockMemory } from '@agentscope/testing';
 *
 * describe('Memory Search', () => {
 *   let memory: MemoryStore;
 *
 *   beforeEach(() => {
 *     memory = createMockMemory({
 *       'test-key': { value: 'test data', namespace: 'test' }
 *     });
 *   });
 *
 *   it('should find stored data', async () => {
 *     const result = await memory.retrieve('test-key');
 *     expect(result.value).toBe('test data');
 *   });
 * });
 * ```
 *
 * @see {@link MemoryStore} for interface definition
 */
export function createMockMemory(
  initialData?: Record<string, any>
): MemoryStore
```

---

## Examples

### Good Documentation

```typescript
/**
 * Sanitizes a string to be safe for use as a Mermaid node ID
 *
 * Converts user input into a valid Mermaid identifier by:
 * - Allowing only alphanumeric characters and underscores
 * - Ensuring ID starts with a letter (prefixes 'n_' if needed)
 * - Avoiding Mermaid reserved words (appends '_node' if reserved)
 * - Limiting length to 50 characters
 *
 * @param str - String to sanitize
 * @returns Sanitized ID safe for Mermaid diagrams
 *
 * @security Prevents Mermaid syntax injection via node IDs
 * @performance O(n) time complexity, single pass with regex
 *
 * @example
 * ```typescript
 * sanitizeId('my-agent-123');     // 'my_agent_123'
 * sanitizeId('123-agent');        // 'n_123_agent'
 * sanitizeId('end');              // 'end_node' (reserved)
 * sanitizeId('a'.repeat(60));     // 'aaa...' (truncated to 50)
 * ```
 *
 * @see {@link sanitizeNodeLabel} for sanitizing node labels
 * @see {@link MERMAID_RESERVED} for list of reserved words
 */
export function sanitizeId(str: string): string {
  // Implementation
}
```

**Why This Is Good**:
- ✅ Clear one-line summary
- ✅ Detailed explanation of behavior
- ✅ All parameters documented
- ✅ Security implications noted
- ✅ Performance characteristics included
- ✅ Multiple practical examples
- ✅ Cross-references to related functions
- ✅ Examples show edge cases

### Bad Documentation

```typescript
/**
 * Sanitizes string
 *
 * @param str string
 * @returns sanitized string
 */
export function sanitizeId(str: string): string {
  // Implementation
}
```

**Why This Is Bad**:
- ❌ Vague description ("sanitizes string" - how?)
- ❌ Parameter description just repeats parameter name
- ❌ Returns description just repeats type
- ❌ No examples
- ❌ No security or performance notes
- ❌ No explanation of sanitization rules
- ❌ No cross-references

---

## Quality Metrics

### Completeness Score

Each public API is scored based on documentation completeness:

| Metric | Weight | Criteria |
|--------|--------|----------|
| Has description | 20% | Non-empty, meaningful description |
| Parameters documented | 20% | All parameters with descriptions |
| Return value documented | 15% | @returns with semantic meaning |
| Has examples | 25% | At least one working example |
| Error handling | 10% | @throws for all thrown errors |
| Cross-references | 10% | @see linking to related APIs |

**Scoring**:
- **90-100%**: Excellent - comprehensive documentation
- **70-89%**: Good - all essential elements present
- **50-69%**: Acceptable - minimal documentation
- **<50%**: Poor - incomplete documentation

### Example Scoring

```typescript
/**
 * Validates theme name against allowlist
 *
 * @param theme - Theme name to validate
 * @returns True if theme is in allowlist, false otherwise
 *
 * @example
 * ```typescript
 * validateThemeName('light');  // true
 * validateThemeName('custom'); // false
 * ```
 */
export function validateThemeName(theme: string): boolean
```

**Score: 75%** (Good)
- ✅ Description (20%)
- ✅ Parameters (20%)
- ✅ Returns (15%)
- ✅ Examples (25%)
- ❌ No @throws (0%)
- ❌ No @see (0%)

### Measuring Quality

Use automated tools to measure documentation quality:

```bash
# Generate documentation coverage report
npx typedoc --entryPointStrategy packages --out docs-check

# Check for missing JSDoc
npx eslint --plugin jsdoc --rule 'jsdoc/require-jsdoc: error'

# Custom script to calculate completeness score
npm run docs:score
```

---

## Validation Checklist

Use this checklist when reviewing documentation:

### Module-Level Documentation

- [ ] Module has comprehensive file-level JSDoc comment
- [ ] Module purpose and scope clearly explained
- [ ] Usage patterns demonstrated with examples
- [ ] Related modules cross-referenced with @see
- [ ] Security model explained (if security-relevant)
- [ ] Performance characteristics noted (if performance-critical)

### Function Documentation

- [ ] One-line summary is clear and imperative
- [ ] Detailed description explains behavior thoroughly
- [ ] All parameters documented with @param
- [ ] Return value documented with @returns (unless void)
- [ ] All thrown errors documented with @throws
- [ ] At least one @example showing typical usage
- [ ] Additional examples for error cases (if applicable)
- [ ] Security implications noted with @security (if applicable)
- [ ] Performance characteristics noted with @performance (if applicable)
- [ ] Related functions cross-referenced with @see

### Class Documentation

- [ ] Class purpose and responsibility explained
- [ ] Constructor parameters documented
- [ ] Public methods all documented per function checklist
- [ ] Public properties documented with inline comments
- [ ] Usage examples showing instantiation and typical workflows
- [ ] Inheritance relationships explained

### Interface/Type Documentation

- [ ] Purpose and use cases explained
- [ ] Each property documented with inline comment
- [ ] Complete usage example provided
- [ ] Related types/interfaces cross-referenced
- [ ] Optional vs required properties clearly indicated

### Security Package Additions

- [ ] Threat vectors prevented are listed
- [ ] Defense-in-depth pattern demonstrated
- [ ] Attack examples provided
- [ ] Validation rules documented
- [ ] Performance implications noted (ReDoS prevention)

### Performance Package Additions

- [ ] Time complexity documented (Big O notation)
- [ ] Space complexity documented (memory usage)
- [ ] Caching behavior explained (if applicable)
- [ ] Hot path operations identified
- [ ] Benchmark data provided (if available)

---

## ESLint Configuration

Add JSDoc validation to your ESLint configuration:

### Install Plugin

```bash
npm install --save-dev eslint-plugin-jsdoc
```

### Configuration (.eslintrc.js)

```javascript
module.exports = {
  plugins: ['jsdoc'],
  extends: ['plugin:jsdoc/recommended'],
  rules: {
    // Require JSDoc for public exports
    'jsdoc/require-jsdoc': ['error', {
      publicOnly: true,
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: false,
        FunctionExpression: false
      },
      contexts: [
        'TSInterfaceDeclaration',
        'TSTypeAliasDeclaration',
        'TSEnumDeclaration'
      ]
    }],

    // Require parameter descriptions
    'jsdoc/require-param-description': 'error',
    'jsdoc/require-param-type': 'off', // TypeScript provides types

    // Require return documentation
    'jsdoc/require-returns-description': 'error',
    'jsdoc/require-returns-type': 'off', // TypeScript provides types

    // Require examples for public APIs
    'jsdoc/require-example': ['warn', {
      contexts: [
        'FunctionDeclaration',
        'MethodDefinition',
        'TSInterfaceDeclaration'
      ]
    }],

    // Validate tag names
    'jsdoc/check-tag-names': ['error', {
      definedTags: ['security', 'performance']
    }],

    // Enforce description style
    'jsdoc/require-description': ['warn', {
      contexts: ['any']
    }],

    // Match param names to function signature
    'jsdoc/check-param-names': 'error',

    // Consistent formatting
    'jsdoc/check-alignment': 'error',
    'jsdoc/check-indentation': 'warn',

    // No blank lines in JSDoc
    'jsdoc/no-blank-blocks': 'error',

    // Enforce hyphen before description
    'jsdoc/require-hyphen-before-param-description': ['error', 'always'],

    // Allow markdown
    'jsdoc/no-markdown': 'off',

    // Require file overview
    'jsdoc/require-file-overview': ['error', {
      tags: {
        module: {
          mustExist: true,
          preventDuplicates: true
        }
      }
    }]
  }
};
```

### Package-Specific Overrides

```javascript
module.exports = {
  // ... base config above
  overrides: [
    {
      files: ['packages/security/**/*.ts'],
      rules: {
        // Require security tag for all security package exports
        'jsdoc/require-jsdoc': ['error', {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true
          }
        }],
        // Custom rule: require @security tag
        'jsdoc/require-tag': ['error', {
          tags: {
            security: { presence: 'required' }
          }
        }]
      }
    },
    {
      files: ['packages/performance/**/*.ts'],
      rules: {
        // Require performance tag for performance package
        'jsdoc/require-tag': ['error', {
          tags: {
            performance: { presence: 'required' }
          }
        }]
      }
    }
  ]
};
```

### Custom Validation Script

Create a script to validate documentation completeness:

```typescript
// scripts/validate-docs.ts
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface DocMetrics {
  file: string;
  total: number;
  documented: number;
  score: number;
  missing: string[];
}

function calculateCompleteness(node: ts.Node): number {
  const jsDocTags = ts.getJSDocTags(node);
  let score = 0;
  let maxScore = 100;

  // Check description (20%)
  const description = ts.getJSDocCommentsAndTags(node);
  if (description.length > 0) score += 20;

  // Check @param tags (20%)
  const params = jsDocTags.filter(tag => tag.tagName.text === 'param');
  if (params.length > 0) score += 20;

  // Check @returns (15%)
  const returns = jsDocTags.filter(tag => tag.tagName.text === 'returns');
  if (returns.length > 0) score += 15;

  // Check @example (25%)
  const examples = jsDocTags.filter(tag => tag.tagName.text === 'example');
  if (examples.length > 0) score += 25;

  // Check @throws (10%)
  const throws = jsDocTags.filter(tag => tag.tagName.text === 'throws');
  if (throws.length > 0) score += 10;

  // Check @see (10%)
  const sees = jsDocTags.filter(tag => tag.tagName.text === 'see');
  if (sees.length > 0) score += 10;

  return score;
}

function analyzeFile(filePath: string): DocMetrics {
  const source = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true
  );

  const metrics: DocMetrics = {
    file: filePath,
    total: 0,
    documented: 0,
    score: 0,
    missing: []
  };

  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node)
    ) {
      metrics.total++;
      const completeness = calculateCompleteness(node);
      if (completeness >= 50) {
        metrics.documented++;
      } else {
        const name = node.name?.getText() || 'anonymous';
        metrics.missing.push(`${name} (${completeness}%)`);
      }
      metrics.score += completeness;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (metrics.total > 0) {
    metrics.score = metrics.score / metrics.total;
  }

  return metrics;
}

// Run validation
const packagesDir = path.join(__dirname, '../packages');
const packages = fs.readdirSync(packagesDir);

console.log('📊 Documentation Quality Report\n');

for (const pkg of packages) {
  const srcDir = path.join(packagesDir, pkg, 'src');
  if (!fs.existsSync(srcDir)) continue;

  console.log(`\n📦 ${pkg}`);
  console.log('─'.repeat(50));

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'));
  const packageMetrics: DocMetrics[] = [];

  for (const file of files) {
    const filePath = path.join(srcDir, file);
    const metrics = analyzeFile(filePath);
    packageMetrics.push(metrics);
  }

  const avgScore = packageMetrics.reduce((sum, m) => sum + m.score, 0) / packageMetrics.length;
  const totalApis = packageMetrics.reduce((sum, m) => sum + m.total, 0);
  const documentedApis = packageMetrics.reduce((sum, m) => sum + m.documented, 0);

  console.log(`Score: ${avgScore.toFixed(1)}%`);
  console.log(`APIs: ${documentedApis}/${totalApis} documented`);

  // Show files with poor documentation
  const poorlyDocumented = packageMetrics.filter(m => m.score < 70);
  if (poorlyDocumented.length > 0) {
    console.log('\n⚠️  Needs Improvement:');
    poorlyDocumented.forEach(m => {
      console.log(`  ${m.file}: ${m.score.toFixed(1)}%`);
      m.missing.forEach(missing => {
        console.log(`    - ${missing}`);
      });
    });
  }
}
```

Add to package.json:

```json
{
  "scripts": {
    "docs:validate": "ts-node scripts/validate-docs.ts",
    "docs:score": "ts-node scripts/validate-docs.ts",
    "docs:generate": "typedoc --entryPointStrategy packages",
    "docs:check": "npm run docs:validate && npm run docs:generate"
  }
}
```

---

## TypeScript 5.x Compatibility

### Overview

The JSDoc specification and validation scripts must remain compatible across TypeScript versions (4.9+, 5.0+, 5.5+). Instead of version checking, use **feature detection** to ensure forward compatibility.

### Key TypeScript 5.x API Changes

TypeScript 5.x introduced several API changes that affect JSDoc validation scripts:

| Feature | TS 4.x API | TS 5.x API | Status |
|---------|-----------|-----------|--------|
| **JSDoc parsing** | `ts.getJSDocTags()` | `ts.getJSDocTags()` | ✅ Compatible |
| **Node factories** | `ts.createXxx()` | `ts.factory.createXxx()` | ⚠️ Breaking |
| **Type checker** | `typeChecker.getXxx()` | `typeChecker.getXxx()` | ✅ Compatible |
| **Symbol flags** | `ts.SymbolFlags.xxx` | `ts.SymbolFlags.xxx` | ✅ Compatible |
| **AST visitor** | `ts.forEachChild()` | `ts.forEachChild()` | ✅ Compatible |

### Feature Detection Pattern

**❌ AVOID: Version checking**
```typescript
// BAD: Fragile, requires maintenance for every TS version
import * as ts from 'typescript';

const version = ts.version.split('.').map(Number);
if (version[0] >= 5) {
  // Use TS 5.x API
} else {
  // Use TS 4.x API
}
```

**✅ GOOD: Feature detection**
```typescript
// GOOD: Works across versions, self-documenting
import * as ts from 'typescript';

/**
 * Check if TypeScript factory API is available (TS 4.0+)
 * @returns True if factory API exists
 */
function hasFactoryAPI(): boolean {
  return typeof (ts as any).factory !== 'undefined';
}

/**
 * Create node with version-agnostic API
 * @param kind - Node kind
 * @returns Created node
 */
function createNode(kind: ts.SyntaxKind): ts.Node {
  if (hasFactoryAPI()) {
    // TS 5.x: Use factory API
    return (ts as any).factory.createToken(kind);
  } else {
    // TS 4.x: Use legacy API
    return (ts as any).createToken(kind);
  }
}
```

### Compatible JSDoc Validation Script

Update the validation script (validate-docs.ts) to use feature detection:

```typescript
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Compatibility layer for TypeScript AST operations
 * Uses feature detection instead of version checking
 */
const TSCompat = {
  /**
   * Get JSDoc tags from a node
   * Compatible with TS 4.9+ and 5.x
   */
  getJSDocTags(node: ts.Node): readonly ts.JSDocTag[] {
    // Try modern API first (TS 5.x)
    if (typeof (ts as any).getJSDocTags === 'function') {
      return (ts as any).getJSDocTags(node) || [];
    }

    // Fallback to node method (TS 4.x)
    if ('jsDoc' in node && Array.isArray((node as any).jsDoc)) {
      const jsDoc = (node as any).jsDoc as ts.JSDoc[];
      return jsDoc.flatMap(doc => doc.tags || []);
    }

    return [];
  },

  /**
   * Get JSDoc comment text from a node
   * Compatible with TS 4.9+ and 5.x
   */
  getJSDocCommentText(node: ts.Node): string {
    // Try modern API (TS 5.x)
    if (typeof (ts as any).getTextOfJSDocComment === 'function') {
      return (ts as any).getTextOfJSDocComment(node) || '';
    }

    // Fallback to manual parsing (TS 4.x)
    if ('jsDoc' in node && Array.isArray((node as any).jsDoc)) {
      const jsDoc = (node as any).jsDoc as ts.JSDoc[];
      if (jsDoc.length > 0 && jsDoc[0].comment) {
        return typeof jsDoc[0].comment === 'string'
          ? jsDoc[0].comment
          : jsDoc[0].comment.map((part: any) => part.text).join('');
      }
    }

    return '';
  },

  /**
   * Check if node has JSDoc
   * Works across all TS versions
   */
  hasJSDoc(node: ts.Node): boolean {
    return this.getJSDocTags(node).length > 0 ||
           this.getJSDocCommentText(node).length > 0;
  }
};

/**
 * Validate JSDoc for a source file
 * @param filePath - Path to TypeScript source file
 * @returns Validation metrics
 */
function validateFile(filePath: string): ValidationMetrics {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true // setParentNodes
  );

  const metrics: ValidationMetrics = {
    file: path.basename(filePath),
    total: 0,
    documented: 0,
    missing: [],
    score: 0
  };

  function visit(node: ts.Node) {
    // Check functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      metrics.total++;

      if (TSCompat.hasJSDoc(node)) {
        metrics.documented++;
      } else {
        metrics.missing.push(`Function: ${node.name.text}`);
      }
    }

    // Check classes
    if (ts.isClassDeclaration(node) && node.name) {
      metrics.total++;

      if (TSCompat.hasJSDoc(node)) {
        metrics.documented++;
      } else {
        metrics.missing.push(`Class: ${node.name.text}`);
      }
    }

    // Check interfaces
    if (ts.isInterfaceDeclaration(node)) {
      metrics.total++;

      if (TSCompat.hasJSDoc(node)) {
        metrics.documented++;
      } else {
        metrics.missing.push(`Interface: ${node.name.text}`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (metrics.total > 0) {
    metrics.score = (metrics.documented / metrics.total) * 100;
  }

  return metrics;
}

interface ValidationMetrics {
  file: string;
  total: number;
  documented: number;
  missing: string[];
  score: number;
}
```

### Testing Across TypeScript Versions

Add matrix testing to your CI/CD pipeline:

```yaml
# .github/workflows/typescript-compat.yml
name: TypeScript Compatibility

on: [push, pull_request]

jobs:
  test-ts-versions:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        typescript-version: ['4.9', '5.0', '5.1', '5.2', '5.3', '5.4', '5.5']

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install TypeScript ${{ matrix.typescript-version }}
        run: npm install --no-save typescript@${{ matrix.typescript-version }}

      - name: Run JSDoc validation
        run: npm run docs:validate

      - name: Generate TypeDoc
        run: npm run docs:generate
```

### Best Practices for TS Compatibility

**1. Use TypeScript's Public API**
```typescript
// ✅ GOOD: Public API (stable)
import * as ts from 'typescript';
const tags = ts.getJSDocTags(node);

// ❌ AVOID: Internal API (unstable)
import * as ts from 'typescript';
const tags = (ts as any).__internal__.getJSDocTags(node);
```

**2. Graceful Degradation**
```typescript
/**
 * Get JSDoc with fallback
 * @param node - AST node
 * @returns JSDoc text or default message
 */
function getJSDocOrDefault(node: ts.Node): string {
  try {
    return TSCompat.getJSDocCommentText(node);
  } catch (error) {
    console.warn(`JSDoc extraction failed for node: ${error.message}`);
    return '[Documentation unavailable]';
  }
}
```

**3. Feature Detection Utilities**
```typescript
/**
 * Check TypeScript capabilities
 * Use for conditional feature enablement
 */
const TSFeatures = {
  /** TS 4.5+: Support for JSDoc @satisfies */
  hasSatisfies: (() => {
    try {
      const node = ts.factory.createSatisfiesExpression(
        ts.factory.createIdentifier('x'),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      );
      return true;
    } catch {
      return false;
    }
  })(),

  /** TS 5.0+: Decorator metadata */
  hasDecoratorMetadata: typeof (ts as any).factory?.createDecorator === 'function',

  /** TS 5.4+: NoInfer utility type */
  hasNoInfer: ts.SyntaxKind.NoInferKeyword !== undefined
};

console.log('TypeScript features:', TSFeatures);
```

**4. Type Safety with Conditional Types**
```typescript
/**
 * Type-safe wrapper for version-specific APIs
 */
type TSVersion = '4.9' | '5.0' | '5.1' | '5.2' | '5.3' | '5.4' | '5.5';

interface TSAPICompat<V extends TSVersion = TSVersion> {
  getJSDocTags(node: ts.Node): readonly ts.JSDocTag[];
  getJSDocCommentText(node: ts.Node): string;
  // Add more methods as needed
}

function createTSCompat(): TSAPICompat {
  return TSCompat;
}
```

### Validation Script Checklist

When updating JSDoc validation scripts:

- [ ] Use feature detection, not version checking
- [ ] Provide fallbacks for all TS-version-specific APIs
- [ ] Test with TypeScript 4.9, 5.0, 5.3, and latest
- [ ] Document which TS versions are supported
- [ ] Use only public TypeScript APIs
- [ ] Handle API errors gracefully (try-catch)
- [ ] Log warnings for unsupported features
- [ ] Provide degraded functionality, don't fail hard

### Minimum Supported Versions

Based on compatibility testing:

| Tool | Minimum Version | Recommended | Notes |
|------|----------------|-------------|-------|
| **TypeScript** | 4.9.0 | 5.5+ | JSDoc support stable since 4.9 |
| **Node.js** | 18.0.0 | 20+ | ESM support, modern APIs |
| **npm** | 9.0.0 | 10+ | Workspace support |
| **TypeDoc** | 0.25.0 | 0.28+ | TS 5.x compatibility |
| **ESLint** | 8.0.0 | 9+ | Flat config support |

### Upgrade Strategy

**When to upgrade TypeScript:**
1. **Major version (4.x → 5.x)**: Test thoroughly, check breaking changes
2. **Minor version (5.0 → 5.1)**: Test validation scripts, usually safe
3. **Patch version (5.3.0 → 5.3.1)**: Safe to upgrade immediately

**Migration checklist:**
- [ ] Update TypeScript in package.json
- [ ] Run validation script: `npm run docs:validate`
- [ ] Generate TypeDoc: `npm run docs:generate`
- [ ] Check for deprecation warnings in console
- [ ] Update feature detection if new APIs available
- [ ] Test CI/CD pipeline with new version
- [ ] Document any workarounds needed

---

## Adoption Strategy

### Phase 1: Core Packages (Week 1-2)

1. Update `@agentscope/security` to match specification
2. Update `@agentscope/errors` to match specification
3. Generate baseline metrics

### Phase 2: High-Traffic Packages (Week 3-4)

1. Update `@agentscope/memory`
2. Update `@agentscope/performance`
3. Update `@agentscope/cli-framework`

### Phase 3: Remaining Packages (Week 5-6)

1. Update `@agentscope/learning`
2. Update `@agentscope/types`
3. Update `@agentscope/testing`

### Phase 4: Enforcement (Week 7+)

1. Enable ESLint rules in CI/CD
2. Require 70%+ completeness score for new PRs
3. Block merges with missing documentation

---

## Maintenance

### Regular Reviews

- **Monthly**: Review documentation quality metrics
- **Quarterly**: Update examples to match current best practices
- **Per Release**: Update @since tags and deprecation notices

### Continuous Improvement

1. Collect feedback from developers using the APIs
2. Identify common confusion points and improve docs
3. Add examples based on real-world usage patterns
4. Update performance benchmarks as implementations improve

### Documentation Debt

Track documentation debt alongside technical debt:

```typescript
/**
 * @todo Add performance characteristics once benchmarked
 * @todo Add more examples showing error handling
 */
```

---

## References

- [TypeDoc Documentation](https://typedoc.org/)
- [JSDoc Reference](https://jsdoc.app/)
- [ESLint JSDoc Plugin](https://github.com/gajus/eslint-plugin-jsdoc)
- [TypeScript Handbook - JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- DESIGN-001: AgentScope Security Architecture
- ADR-012: Agent Security Architecture

---

## Appendix: Template Library

### Function Template

```typescript
/**
 * [Brief one-line description]
 *
 * [Detailed explanation of what the function does, when to use it,
 * and any important context or warnings]
 *
 * @param paramName - [Description]
 * @param optionalParam - [Description with optional behavior]
 * @returns [Description of return value]
 * @throws {ErrorType} [When this error occurs]
 *
 * @example
 * ```typescript
 * // [Example title/context]
 * const result = functionName(input);
 * console.log(result); // [Expected output]
 * ```
 *
 * @see {@link RelatedFunction} [Relationship description]
 */
export function functionName(
  paramName: Type,
  optionalParam?: Type
): ReturnType {
  // Implementation
}
```

### Class Template

```typescript
/**
 * [Brief one-line description of class purpose]
 *
 * [Detailed explanation of class responsibility, when to use it,
 * and how it fits into the larger system]
 *
 * @example
 * ```typescript
 * const instance = new ClassName(options);
 * instance.method();
 * ```
 */
export class ClassName {
  /** [Property description] */
  public propertyName: Type;

  /**
   * Creates a new [ClassName] instance
   *
   * @param options - [Configuration options]
   * @param options.setting - [Specific setting description]
   */
  constructor(options: Options) {
    // Implementation
  }

  /**
   * [Method description]
   *
   * @param param - [Description]
   * @returns [Description]
   *
   * @example
   * ```typescript
   * instance.methodName(value);
   * ```
   */
  public methodName(param: Type): ReturnType {
    // Implementation
  }
}
```

### Interface Template

```typescript
/**
 * [Purpose and use cases]
 *
 * @example
 * ```typescript
 * const config: InterfaceName = {
 *   property: 'value',
 *   optional: true
 * };
 * ```
 *
 * @see {@link RelatedType} [Relationship]
 */
export interface InterfaceName {
  /** [Property description] */
  property: Type;

  /** [Optional property description with default behavior] */
  optional?: Type;

  /** [Complex property with nested description] */
  nested: {
    /** [Nested property] */
    subProperty: Type;
  };
}
```

### Module Template

```typescript
/**
 * [Module Name]
 *
 * [Brief overview of module purpose and scope]
 *
 * ## [Section Title]
 *
 * [Detailed information organized into sections]
 *
 * ## Usage Pattern
 *
 * [Typical usage workflow with code example]
 * ```typescript
 * // Example workflow
 * import { functionA, functionB } from './module';
 *
 * const result = functionA(input);
 * functionB(result);
 * ```
 *
 * @module [module-path]
 * @see {@link module:related-module} [Relationship]
 * @see [DESIGN-DOC] [Reference to architecture document]
 *
 * @example
 * ```typescript
 * // [Complete usage example]
 * ```
 */
```

---

**End of JSDoc Specification v1.0.0**
