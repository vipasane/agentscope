# Common Core JSDoc Security Documentation Standards

> **Version**: 1.0.0
> **Status**: Active
> **Last Updated**: 2026-01-26
> **Scope**: Security documentation standards for packages/security, packages/errors, packages/types, and all consuming packages

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Security Documentation Principles](#security-documentation-principles)
3. [Threat Models by Package](#threat-models-by-package)
4. [Security-First JSDoc Templates](#security-first-jsdoc-templates)
5. [Input Validation Documentation Patterns](#input-validation-documentation-patterns)
6. [Sanitization Documentation Patterns](#sanitization-documentation-patterns)
7. [Error Handling Security Documentation](#error-handling-security-documentation)
8. [Security Tag Taxonomy](#security-tag-taxonomy)
9. [Examples by Package](#examples-by-package)
10. [Security Review Checklist](#security-review-checklist)

---

## Executive Summary

This document defines security-first documentation standards for AgentScope's common core packages. Every public API that handles untrusted input, performs validation, or affects security posture MUST include security-aware JSDoc documentation.

**Core Principle**: Documentation is a security control. Clear documentation prevents misuse, documents threat models, and establishes secure usage patterns.

**Key Requirements**:
- All input validation functions MUST document accepted ranges and rejection behavior
- All sanitization functions MUST document what they remove/modify and why
- All security-sensitive APIs MUST include `@security` tags with threat mitigation notes
- All error types MUST document information disclosure risks

---

## Security Documentation Principles

### 1. Security by Documentation

Documentation serves as a contract between API provider and consumer:
- **Explicit boundaries**: Document what is/isn't safe
- **Threat awareness**: State what attacks are prevented
- **Misuse prevention**: Document dangerous patterns
- **Fail-safe defaults**: Document secure defaults

### 2. Defense in Depth in Documentation

Each layer documents its security guarantees:
- **Layer 1 (Input Validation)**: Documents rejection criteria
- **Layer 2 (Sanitization)**: Documents transformation rules
- **Layer 3 (Execution)**: Documents isolation/sandboxing
- **Layer 4 (Output)**: Documents encoding/escaping

### 3. Zero Trust Documentation

Never assume the caller knows security implications:
- **Explicit over implicit**: State security properties explicitly
- **Warning over silence**: Warn about dangerous usage
- **Examples show secure patterns**: Examples must be production-safe

### 4. Compliance and Audit

Documentation supports security audits:
- **Traceability**: Link docs to threat models and ADRs
- **Versioning**: Track security-relevant changes
- **Evidence**: Document security decisions

---

## Threat Models by Package

### packages/security

**Purpose**: Zero-trust input validation and sanitization primitives

**Threat Model**:
| Threat | Attack Vector | Mitigation |
|--------|---------------|------------|
| **Command Injection** | Shell metacharacters in commands | `SafeExecutor` blocks dangerous patterns |
| **Path Traversal** | `../` sequences in file paths | `PathValidator` normalizes and validates paths |
| **Secret Exposure** | API keys in logs/configs | `SecretsSanitizer` detects and redacts secrets |
| **Injection Attacks** | SQL/NoSQL/prompt injection | `InputValidator` sanitizes control characters |
| **DoS via Input** | Extremely large inputs | `InputValidator` enforces size limits |

**DREAD Assessment**:
- **Damage Potential**: 9/10 (RCE, data exfiltration)
- **Reproducibility**: 10/10 (deterministic)
- **Exploitability**: 7/10 (requires API access)
- **Affected Users**: 10/10 (all agent operations)
- **Discoverability**: 8/10 (public API surface)

**Security Guarantees**:
- ✅ All validators reject malicious input by default
- ✅ Sanitizers are safe to use on untrusted input
- ✅ No bypass via encoding/obfuscation
- ✅ Performance: <50ms validation, <100ms secret detection

### packages/errors

**Purpose**: Structured error handling with controlled information disclosure

**Threat Model**:
| Threat | Attack Vector | Mitigation |
|--------|---------------|------------|
| **Information Disclosure** | Stack traces reveal paths | Sanitize error messages before serialization |
| **Sensitive Data Leakage** | Secrets in error context | Redact error context before logging |
| **Error Oracle Attacks** | Timing differences in errors | Normalize error responses |
| **Log Injection** | CRLF in error messages | Sanitize error messages |

**DREAD Assessment**:
- **Damage Potential**: 5/10 (info disclosure)
- **Reproducibility**: 10/10 (always logs errors)
- **Exploitability**: 6/10 (requires error triggering)
- **Affected Users**: 10/10 (all error handling)
- **Discoverability**: 7/10 (error paths are discoverable)

**Security Guarantees**:
- ✅ Stack traces sanitized before serialization
- ✅ Sensitive data never logged
- ✅ Error messages don't leak internal state
- ✅ Retry strategies prevent DoS amplification

### packages/types

**Purpose**: Type-safe contracts with security annotations

**Threat Model**:
| Threat | Attack Vector | Mitigation |
|--------|---------------|------------|
| **Type Confusion** | Invalid type coercion | Branded types prevent misuse |
| **Missing Validation** | Assumed-safe types | Document validation requirements |
| **Privilege Escalation** | Security context bypass | `AgentSecurityContext` enforces boundaries |

**DREAD Assessment**:
- **Damage Potential**: 6/10 (type safety violations)
- **Reproducibility**: 8/10 (consistent type system)
- **Exploitability**: 5/10 (requires type system bypass)
- **Affected Users**: 10/10 (all typed APIs)
- **Discoverability**: 4/10 (requires code analysis)

**Security Guarantees**:
- ✅ Branded types prevent ID confusion
- ✅ Result types force error handling
- ✅ Security contexts are immutable
- ✅ Type definitions include security annotations

---

## Security-First JSDoc Templates

### Template 1: Input Validation Function

```typescript
/**
 * Validates user input against security constraints
 *
 * @security INPUT_VALIDATION
 * This function provides the first line of defense against injection attacks.
 * It MUST be called on all untrusted input before processing.
 *
 * **Threat Mitigation**:
 * - Prevents command injection via shell metacharacters
 * - Blocks path traversal attempts
 * - Rejects oversized inputs (DoS prevention)
 * - Sanitizes control characters
 *
 * **Security Guarantees**:
 * - Returns `ValidationResult.success: false` for any malicious input
 * - Never throws exceptions (prevents error oracle attacks)
 * - Performance: <50ms for inputs up to 100KB
 * - Side-effect free (no logging of sensitive data)
 *
 * @param input - Untrusted input to validate (accepts any type)
 * @param options - Validation constraints (see {@link ValidationOptions})
 * @returns Validation result with sanitized data or error details
 *
 * @example Secure Usage Pattern
 * ```typescript
 * // CORRECT: Validate before use
 * const result = InputValidator.string({ max: 1000 }).safeParse(userInput);
 * if (!result.success) {
 *   logger.warn('Invalid input rejected', { error: result.error });
 *   return createError('VALIDATION_ERROR', result.error);
 * }
 * const safeValue = result.data; // Guaranteed safe
 * ```
 *
 * @example Insecure Pattern (DO NOT USE)
 * ```typescript
 * // WRONG: Using input without validation
 * const value = userInput; // ❌ Vulnerable to injection
 * executeCommand(value);
 * ```
 *
 * @throws Never throws - all errors returned via ValidationResult
 *
 * @see {@link ValidationResult} for result type details
 * @see {@link https://owasp.org/www-community/Input_Validation_Cheat_Sheet | OWASP Input Validation}
 *
 * @since 1.0.0
 * @public
 */
```

### Template 2: Sanitization Function

```typescript
/**
 * Sanitizes content by removing/escaping dangerous patterns
 *
 * @security SANITIZATION
 * This function performs deterministic sanitization of untrusted input.
 * Use this when you need to preserve partial input but remove dangerous elements.
 *
 * **What This Removes**:
 * - Null bytes (`\0`)
 * - Control characters (except `\n`, `\t`, `\r`)
 * - Shell metacharacters: `;`, `&`, `|`, `$`, `` ` ``, `(`, `)`, `{`, `}`, `[`, `]`
 * - Path traversal sequences: `../`, `~/`
 *
 * **What This Preserves**:
 * - Alphanumeric characters
 * - Common punctuation
 * - Whitespace (newline, tab, space)
 * - Unicode characters (if valid UTF-8)
 *
 * **Security Considerations**:
 * - ⚠️ Sanitization is NOT validation - always validate first
 * - ⚠️ May produce unexpected results with heavily malicious input
 * - ✅ Safe to call on already-sanitized input (idempotent)
 * - ✅ Does not throw exceptions
 *
 * @param input - Untrusted string to sanitize
 * @returns Sanitized string safe for further processing
 *
 * @example Correct Usage (Validate First, Sanitize Second)
 * ```typescript
 * // Step 1: Validate
 * const validationResult = InputValidator.string({ max: 1000 }).safeParse(userInput);
 * if (!validationResult.success) {
 *   return createError('INVALID_INPUT', validationResult.error);
 * }
 *
 * // Step 2: Sanitize for defense in depth
 * const sanitized = InputValidator.sanitizeInput(validationResult.data);
 *
 * // Step 3: Safe to use
 * processInput(sanitized);
 * ```
 *
 * @example Insecure Pattern (DO NOT USE)
 * ```typescript
 * // WRONG: Sanitizing without validation
 * const sanitized = InputValidator.sanitizeInput(userInput); // ❌ Still unsafe
 * executeCommand(sanitized); // ❌ Command injection still possible
 * ```
 *
 * @performance O(n) where n = input length, <10ms for typical inputs
 *
 * @see {@link InputValidator.string} for full validation
 * @see {@link https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html | OWASP Sanitization}
 *
 * @since 1.0.0
 * @public
 */
```

### Template 3: Security-Sensitive API

```typescript
/**
 * Executes shell command with injection protection
 *
 * @security COMMAND_EXECUTION - HIGH RISK API
 * This function executes shell commands and is inherently dangerous.
 * It implements multiple layers of protection but MUST be used carefully.
 *
 * **Security Layers**:
 * 1. **Allowlist**: Only commands in `allowedCommands` can execute
 * 2. **Blocklist**: Dangerous commands (`rm`, `sudo`, etc.) are blocked
 * 3. **Pattern Detection**: Shell metacharacters trigger rejection
 * 4. **Argument Escaping**: All arguments are shell-escaped
 *
 * **Threat Model**:
 * - ✅ Prevents: Command injection via metacharacters
 * - ✅ Prevents: Arbitrary command execution
 * - ✅ Prevents: Privilege escalation via sudo/su
 * - ⚠️ Does NOT prevent: Logic bugs in allowed commands
 * - ⚠️ Does NOT prevent: Resource exhaustion
 *
 * **DREAD Score**: 9.2/10
 * - Damage: 10/10 (RCE)
 * - Reproducibility: 10/10 (deterministic)
 * - Exploitability: 8/10 (requires API access)
 * - Affected Users: 10/10 (all command execution)
 * - Discoverability: 8/10 (public API)
 *
 * **Required Preconditions**:
 * - ✅ Command MUST be validated via `SafeExecutor.validate()` first
 * - ✅ Arguments MUST be from trusted source OR validated
 * - ✅ Caller MUST have appropriate permissions
 * - ✅ Execution MUST be logged for audit
 *
 * @param command - Command to execute (validated)
 * @param options - Execution options including allowlist
 * @returns Command execution result
 * @throws SecurityError if command violates security policy
 *
 * @example Secure Pattern
 * ```typescript
 * // Define strict allowlist
 * const options = {
 *   allowedCommands: ['npm', 'git'],
 *   blockedCommands: SafeExecutor.DANGEROUS_COMMANDS
 * };
 *
 * // Validate before execution
 * const validated = SafeExecutor.validate(userCommand, options);
 *
 * // Execute safely
 * const result = await executeCommand(validated, options);
 * ```
 *
 * @example Insecure Pattern (DO NOT USE)
 * ```typescript
 * // WRONG: No allowlist
 * const result = await executeCommand(userInput, {}); // ❌ Any command allowed
 *
 * // WRONG: Constructing command from user input
 * const cmd = `rm -rf ${userInput}`; // ❌ Command injection
 * await executeCommand(cmd);
 * ```
 *
 * @see {@link SafeExecutor.validate} for command validation
 * @see {@link SafeExecutor.escapeShellArg} for argument escaping
 * @see ADR-012 for threat model details
 * @see CVE-2024-002 for command injection vulnerability details
 *
 * @since 1.0.0
 * @public
 */
```

### Template 4: Error Type with Information Disclosure Risks

```typescript
/**
 * Error type for validation failures
 *
 * @security INFORMATION_DISCLOSURE - Medium Risk
 * This error type may contain sensitive information in certain contexts.
 * Follow these guidelines when handling this error:
 *
 * **Information Disclosure Risks**:
 * - ⚠️ Error message may reveal validation rules
 * - ⚠️ Stack trace may reveal internal file paths
 * - ⚠️ Error context may contain partial sensitive data
 *
 * **Safe Handling Practices**:
 * 1. Sanitize before logging: Use `ErrorSerializer.sanitize(error)`
 * 2. Redact in user responses: Show generic message to users
 * 3. Log full details only to secure audit logs
 * 4. Never serialize to client without sanitization
 *
 * **Secure Serialization**:
 * ```typescript
 * // CORRECT: Sanitize before sending to client
 * const sanitized = ErrorSerializer.sanitize(error);
 * res.status(400).json({ error: sanitized.message });
 *
 * // WRONG: Exposing full error to client
 * res.status(400).json({ error: error }); // ❌ Leaks internal details
 * ```
 *
 * @example Secure Error Handling
 * ```typescript
 * try {
 *   const validated = InputValidator.string().parse(userInput);
 * } catch (error) {
 *   // Log full error internally
 *   logger.error('Validation failed', { error, userId });
 *
 *   // Return generic error to client
 *   return createError('VALIDATION_ERROR', 'Invalid input provided');
 * }
 * ```
 *
 * @see {@link ErrorSerializer} for sanitization methods
 * @see {@link https://owasp.org/www-community/Improper_Error_Handling | OWASP Error Handling}
 *
 * @since 1.0.0
 * @public
 */
```

---

## Input Validation Documentation Patterns

### Pattern 1: Boundary Documentation

Always document the boundaries between safe and unsafe:

```typescript
/**
 * Validates string length
 *
 * @security INPUT_VALIDATION
 *
 * **Acceptance Criteria**:
 * - ✅ Length >= min (default: 0)
 * - ✅ Length <= max (default: 100,000)
 * - ✅ No null bytes
 * - ✅ Valid UTF-8 encoding
 *
 * **Rejection Criteria**:
 * - ❌ Length < min → "String too short"
 * - ❌ Length > max → "String too long"
 * - ❌ Contains null byte → "Invalid characters"
 * - ❌ Invalid UTF-8 → "Encoding error"
 *
 * @param input - String to validate
 * @param options - Min/max length constraints
 * @returns ValidationResult indicating success/failure
 */
```

### Pattern 2: Default Behavior Documentation

Document secure defaults explicitly:

```typescript
/**
 * Validates file path for safe access
 *
 * @security PATH_VALIDATION
 *
 * **Secure Defaults**:
 * - `allowAbsolute: true` - Absolute paths are allowed
 * - `allowTraversal: false` - Path traversal (`../`) is BLOCKED
 * - `allowedDirectories: []` - All directories allowed (configure to restrict)
 * - `maxDepth: 10` - Prevents deeply nested paths
 *
 * **Why These Defaults**:
 * - Absolute paths are safe when combined with allowedDirectories
 * - Traversal blocked by default prevents directory escape
 * - Empty allowlist allows all paths (developer must configure)
 * - Depth limit prevents path-based DoS
 *
 * @param path - File path to validate
 * @param options - Path validation options (override defaults)
 */
```

### Pattern 3: Attack Surface Documentation

Document what attacks are prevented:

```typescript
/**
 * Validates email address format
 *
 * @security INPUT_VALIDATION
 *
 * **Prevented Attacks**:
 * - ✅ Email injection: Blocks CRLF sequences
 * - ✅ Command injection: Blocks shell metacharacters
 * - ✅ Header injection: Validates RFC 5322 format
 * - ✅ DoS: Limits email length to 254 characters
 *
 * **Attack Patterns Detected**:
 * - Multiple `@` symbols
 * - Missing domain extension
 * - Control characters (`\r`, `\n`, `\0`)
 * - Shell metacharacters (`;`, `|`, `&`, etc.)
 * - Extremely long local/domain parts
 *
 * @param email - Email address to validate
 * @returns ValidationResult
 */
```

### Pattern 4: ReDoS (Regular Expression Denial of Service) Prevention

Document regex patterns that can cause exponential backtracking and CPU exhaustion:

```typescript
/**
 * Validates username format (alphanumeric, 3-20 characters)
 *
 * @security INPUT_VALIDATION, DOS_PREVENTION
 *
 * **ReDoS Prevention**:
 * This validator uses a safe regex pattern that CANNOT cause catastrophic backtracking.
 * See "Dangerous Patterns to Avoid" below for anti-patterns.
 *
 * **Safe Pattern Used**: `/^[a-zA-Z0-9_]{3,20}$/`
 * - No nested quantifiers (✅ Safe)
 * - No overlapping groups (✅ Safe)
 * - Bounded length (✅ DoS-resistant)
 * - Linear time complexity: O(n) where n = input length
 *
 * **Dangerous Patterns to Avoid**:
 *
 * ❌ **AVOID: Nested Quantifiers**
 * ```javascript
 * // BAD: Nested quantifiers cause exponential backtracking
 * const bad = /^(a+)+$/;
 * // Input: "aaaaaaaaaaaaaaaaaaaaaaaX" (20 'a's + 'X')
 * // Time: ~2^20 operations = 1,048,576 steps (CATASTROPHIC)
 * ```
 *
 * ❌ **AVOID: Overlapping Alternation Groups**
 * ```javascript
 * // BAD: Overlapping alternatives cause exponential complexity
 * const bad = /^(a|a)*$/;
 * // Input: "aaaaaaaaaaaaaaaaaaa" (20 'a's)
 * // Time: ~2^20 operations = 1,048,576 steps (CATASTROPHIC)
 *
 * // ALSO BAD: Similar pattern with different alternatives
 * const bad2 = /^(a|ab)*$/;
 * // Input: "ababababababababababX" (repeating "ab" + 'X')
 * // Time: Exponential backtracking on failure
 * ```
 *
 * ❌ **AVOID: Unanchored Greedy Quantifiers**
 * ```javascript
 * // BAD: Greedy match with complex suffix causes backtracking
 * const bad = /^.*.*.*.*$/;
 * // Input: Long string without match
 * // Time: Tries every possible split point (SLOW)
 *
 * // ALSO BAD: Email regex with multiple .* patterns
 * const bad2 = /^.*@.*\..*$/;
 * // Better: Use specific character classes: /^[^@]+@[^.]+\..+$/
 * ```
 *
 * **Safe Alternatives**:
 *
 * ✅ **GOOD: Specific Character Classes**
 * ```javascript
 * // Use specific character classes instead of nested quantifiers
 * const good = /^[a-zA-Z0-9_]{3,20}$/;
 * // Time: O(n) - linear complexity
 * ```
 *
 * ✅ **GOOD: Possessive Quantifiers (where supported)**
 * ```javascript
 * // Possessive quantifiers don't backtrack
 * const good = /^(?>a+)b$/; // Note: Not supported in JavaScript
 * // JavaScript alternative: Use character classes or atomic groups
 * ```
 *
 * ✅ **GOOD: Bounded Repetition**
 * ```javascript
 * // Always bound your quantifiers
 * const good = /^a{0,100}$/; // Maximum 100 repetitions
 * // Avoid: /^a*$/ (unbounded)
 * ```
 *
 * **Testing for ReDoS Vulnerabilities**:
 * ```typescript
 * // Use timeout-based testing to detect ReDoS
 * function testRegexSafety(pattern: RegExp, input: string, maxMs = 100): boolean {
 *   const start = Date.now();
 *   try {
 *     pattern.test(input);
 *     return (Date.now() - start) < maxMs;
 *   } catch {
 *     return false;
 *   }
 * }
 *
 * // Example: Test with pathological input
 * const isSafe = testRegexSafety(
 *   /^[a-zA-Z0-9_]{3,20}$/,
 *   'a'.repeat(10000) + 'X'
 * ); // Should return true (fast)
 * ```
 *
 * **Real-World ReDoS Examples**:
 * - CVE-2019-11358 (jQuery): `/<(\w+)\s*\/?>/` with nested tags
 * - CVE-2020-7660 (validator.js): Email regex with nested groups
 * - CVE-2022-25869 (nodejs): URL parsing regex with `.*` patterns
 *
 * **Best Practices**:
 * 1. Use character classes `[a-z]` instead of `.` where possible
 * 2. Bound all quantifiers: `{0,100}` instead of `*`
 * 3. Avoid nested quantifiers: `(a+)+` or `(a*)*`
 * 4. Avoid overlapping alternations: `(a|a)*` or `(a|ab)*`
 * 5. Test regex with pathological inputs before deployment
 * 6. Consider using dedicated parsers for complex formats (URLs, emails)
 * 7. Set regex timeouts where supported (Node.js 16+: `RegExp.timeout`)
 *
 * @param username - Username to validate
 * @returns ValidationResult with safe regex pattern
 *
 * @see {@link https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS | OWASP ReDoS}
 * @see {@link https://www.regular-expressions.info/catastrophic.html | Catastrophic Backtracking}
 */
```

**Summary: ReDoS Prevention Checklist**:
- [ ] No nested quantifiers (e.g., `(a+)+`, `(a*)*`)
- [ ] No overlapping alternations (e.g., `(a|ab)*`)
- [ ] All quantifiers are bounded (e.g., `{0,100}` not `*`)
- [ ] Character classes used instead of `.` where possible
- [ ] Tested with pathological inputs (long strings, repetition + mismatch)
- [ ] Regex timeout configured (if supported)
- [ ] Complex formats use dedicated parsers, not regex

---

## Sanitization Documentation Patterns

### Pattern 1: Transformation Documentation

Document exactly what changes are made:

```typescript
/**
 * Sanitizes command string for safe execution
 *
 * @security SANITIZATION
 *
 * **Transformations Applied**:
 * | Input | Output | Reason |
 * |-------|--------|--------|
 * | `cmd; rm -rf /` | `cmd rm -rf ` | Removes `;` (command separator) |
 * | `cmd \| grep` | `cmd  grep` | Removes `\|` (pipe operator) |
 * | `cmd $(evil)` | `cmd evil` | Removes `$()` (command substitution) |
 * | `cmd\0arg` | `cmdarg` | Removes null byte |
 *
 * **Preservation Rules**:
 * - Alphanumeric: Always preserved
 * - Whitespace: Preserved (spaces, tabs, newlines)
 * - Hyphens/underscores: Preserved for arguments
 * - Quotes: Removed (use escapeShellArg instead)
 *
 * @param command - Command string to sanitize
 * @returns Sanitized command string
 */
```

### Pattern 2: Idempotency Documentation

Document that sanitization is safe to repeat:

```typescript
/**
 * Redacts secrets from content
 *
 * @security SANITIZATION
 *
 * **Idempotency Guarantee**:
 * This function is idempotent - calling it multiple times produces
 * the same result:
 * ```typescript
 * redact(redact(content)) === redact(content)
 * ```
 *
 * **Why This Matters**:
 * - Safe to call on already-sanitized content
 * - No risk of double-encoding/escaping
 * - Can be used in pipelines without tracking state
 *
 * **Redaction Format**:
 * - Short secrets (<8 chars): `[REDACTED]`
 * - Long secrets: `sk-a****xyz` (first 4 + last 4 chars)
 *
 * @param content - Content containing potential secrets
 * @returns Content with secrets redacted
 */
```

### Pattern 3: Performance Characteristics

Document performance for security-critical operations:

```typescript
/**
 * Detects secrets in large codebases
 *
 * @security SECRET_DETECTION
 *
 * **Performance Characteristics**:
 * - **Small files** (<10KB): <10ms
 * - **Medium files** (10-100KB): <100ms
 * - **Large files** (100KB-1MB): <500ms
 * - **Huge files** (>1MB): Not recommended (use streaming)
 *
 * **Optimization Strategy**:
 * 1. Regex patterns run first (fast)
 * 2. Entropy analysis only on suspicious strings
 * 3. False positive filtering reduces results
 * 4. Results limited to 1000 findings per file
 *
 * **Memory Usage**:
 * - Regex: O(n) where n = file size
 * - Entropy: O(m) where m = suspicious strings
 * - Peak memory: ~2x file size
 *
 * @param content - File content to scan
 * @param filePath - File path for reporting
 * @returns Array of secret findings (max 1000)
 */
```

---

## Error Handling Security Documentation

### Pattern 1: Error Message Safety

```typescript
/**
 * Creates user-facing error message
 *
 * @security INFORMATION_DISCLOSURE
 *
 * **Information Disclosure Prevention**:
 * This function creates error messages safe for client consumption.
 *
 * **What's Included**:
 * - ✅ Error code (e.g., "VALIDATION_ERROR")
 * - ✅ Generic error message (e.g., "Invalid input")
 * - ✅ Field name (if applicable)
 *
 * **What's Excluded**:
 * - ❌ Stack traces (internal only)
 * - ❌ File paths (reveals structure)
 * - ❌ Database errors (reveals schema)
 * - ❌ Sensitive values (even partial)
 *
 * **Usage Pattern**:
 * ```typescript
 * // Internal error (full details)
 * const internalError = new ValidationError({
 *   code: 'INVALID_EMAIL',
 *   message: 'Email failed regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/',
 *   field: 'email',
 *   value: userInput
 * });
 *
 * // Client error (sanitized)
 * const clientError = internalError.toClientMessage();
 * // Result: { code: 'INVALID_EMAIL', message: 'Invalid email format', field: 'email' }
 * ```
 *
 * @returns Sanitized error for client consumption
 */
```

### Pattern 2: Retry Strategy Documentation

```typescript
/**
 * Implements exponential backoff retry strategy
 *
 * @security DOS_PREVENTION
 *
 * **DoS Prevention**:
 * This retry strategy prevents retry amplification attacks.
 *
 * **Safety Limits**:
 * - Max retries: 3 (prevents infinite loops)
 * - Initial delay: 100ms
 * - Max delay: 5000ms (prevents long waits)
 * - Backoff multiplier: 2x (exponential)
 * - Total max time: ~10 seconds
 *
 * **Attack Mitigation**:
 * - Retry amplification: Limited to 3 attempts
 * - Resource exhaustion: Exponential backoff reduces load
 * - Cascading failures: Max delay prevents pile-up
 *
 * **Jitter**:
 * Adds ±25% random jitter to prevent thundering herd.
 *
 * @param operation - Operation to retry
 * @param config - Retry configuration (override defaults)
 */
```

---

## Security Tag Taxonomy

Use these standardized `@security` tags in JSDoc:

| Tag | When to Use | Example |
|-----|-------------|---------|
| `@security INPUT_VALIDATION` | Functions validating untrusted input | `InputValidator.string()` |
| `@security SANITIZATION` | Functions cleaning/escaping input | `sanitizeInput()` |
| `@security COMMAND_EXECUTION` | Shell command execution | `SafeExecutor.validate()` |
| `@security PATH_VALIDATION` | File path handling | `PathValidator.validate()` |
| `@security SECRET_DETECTION` | Secret scanning/redaction | `SecretsSanitizer.detect()` |
| `@security INFORMATION_DISCLOSURE` | Error messages, logging | `ErrorSerializer.sanitize()` |
| `@security DOS_PREVENTION` | Rate limiting, resource controls | `RetryStrategy` |
| `@security AUTHENTICATION` | Identity verification | Agent authentication |
| `@security AUTHORIZATION` | Permission checks | `AgentSecurityContext` |
| `@security CRYPTOGRAPHY` | Encryption, hashing | Key management |

**Tag Format**:
```typescript
/**
 * @security <TAG> - <Risk Level>
 * <Threat description>
 *
 * **Threat Mitigation**:
 * - <List of prevented attacks>
 *
 * **Security Guarantees**:
 * - <List of guarantees>
 */
```

---

## Examples by Package

### packages/security Examples

#### InputValidator with Security Documentation

```typescript
/**
 * String validator with comprehensive security controls
 *
 * @security INPUT_VALIDATION - First Line of Defense
 *
 * This validator is the primary defense against injection attacks.
 * All untrusted string input MUST pass through this validator.
 *
 * **Threat Model**:
 * - SQL Injection: Sanitizes control characters
 * - Command Injection: Removes shell metacharacters
 * - NoSQL Injection: Validates structure
 * - Prompt Injection: Limits length and content
 * - DoS: Enforces max length (100,000 chars)
 *
 * **Security Features**:
 * 1. Length validation (min/max)
 * 2. Pattern matching (regex)
 * 3. Format validation (email, URL)
 * 4. Control character removal
 * 5. Null byte detection
 * 6. UTF-8 validation
 *
 * **DREAD Score**: 8.2/10
 * - Damage: 9/10 (injection → RCE)
 * - Reproducibility: 10/10
 * - Exploitability: 7/10
 * - Affected Users: 10/10
 * - Discoverability: 5/10
 *
 * @example Secure API Endpoint
 * ```typescript
 * // Define strict validation schema
 * const UserInputSchema = InputValidator.object({
 *   email: InputValidator.string({ email: true, max: 254 }),
 *   name: InputValidator.string({ min: 1, max: 100 }),
 *   bio: InputValidator.string({ max: 500 }).optional()
 * });
 *
 * // Validate in request handler
 * async function handleUserUpdate(req: Request) {
 *   const result = UserInputSchema.safeParse(req.body);
 *
 *   if (!result.success) {
 *     return res.status(400).json({
 *       error: 'VALIDATION_ERROR',
 *       message: 'Invalid input format'
 *     });
 *   }
 *
 *   // Safe to use validated data
 *   const user = await updateUser(result.data);
 *   return res.json({ user });
 * }
 * ```
 *
 * @example Insecure Pattern (DO NOT COPY)
 * ```typescript
 * // WRONG: No validation
 * async function handleUserUpdate(req: Request) {
 *   const user = await updateUser(req.body); // ❌ Injection risk
 *   return res.json({ user });
 * }
 * ```
 *
 * @param options - Validation options
 * @param options.min - Minimum string length (default: 0)
 * @param options.max - Maximum string length (default: 100,000)
 * @param options.regex - Pattern to match
 * @param options.email - Validate email format (RFC 5322)
 * @param options.url - Validate URL format
 * @returns Validator with parse/safeParse methods
 *
 * @throws Never - All errors returned via ValidationResult
 *
 * @see {@link ValidationResult} for result structure
 * @see {@link sanitizeInput} for additional sanitization
 * @see {@link https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html | OWASP Input Validation}
 *
 * @performance <50ms for inputs up to 100KB
 * @since 1.0.0
 * @public
 */
static string(options?: {
  min?: number;
  max?: number;
  regex?: RegExp;
  email?: boolean;
  url?: boolean;
}): ZodType<string>
```

#### PathValidator with Security Documentation

```typescript
/**
 * Validates file paths to prevent traversal attacks
 *
 * @security PATH_VALIDATION - Critical Path Security
 *
 * This validator prevents path traversal and directory escape attacks.
 * Use this for ALL file operations with user-provided paths.
 *
 * **Prevented Attacks**:
 * - Path traversal: `../../../etc/passwd` → BLOCKED
 * - Null byte injection: `file.txt\0.png` → BLOCKED
 * - Symbolic link abuse: Validates resolved paths
 * - Directory escape: Enforces allowedDirectories
 *
 * **Validation Layers**:
 * 1. Syntactic: Check for traversal patterns (`..`, `~`)
 * 2. Normalization: Resolve to absolute path
 * 3. Boundary: Verify within allowedDirectories
 * 4. Depth: Limit directory nesting
 *
 * **DREAD Score**: 8.6/10
 * - Damage: 10/10 (arbitrary file access)
 * - Reproducibility: 10/10
 * - Exploitability: 8/10
 * - Affected Users: 10/10
 * - Discoverability: 5/10
 *
 * @example Secure File Access
 * ```typescript
 * // Configure allowed directory
 * const UPLOAD_DIR = '/var/app/uploads';
 *
 * // Validate user-provided filename
 * async function readUserFile(filename: string) {
 *   try {
 *     const safePath = PathValidator.validate(filename, {
 *       allowTraversal: false,
 *       allowedDirectories: [UPLOAD_DIR],
 *       maxDepth: 5
 *     });
 *
 *     return await fs.readFile(safePath, 'utf8');
 *   } catch (error) {
 *     logger.warn('Path validation failed', { filename });
 *     throw new SecurityError('Invalid file path');
 *   }
 * }
 * ```
 *
 * @example Insecure Pattern (DO NOT COPY)
 * ```typescript
 * // WRONG: No path validation
 * async function readUserFile(filename: string) {
 *   return await fs.readFile(`/uploads/${filename}`); // ❌ Traversal risk
 * }
 * ```
 *
 * @param path - File path to validate
 * @param options - Validation options
 * @param options.allowAbsolute - Allow absolute paths (default: true)
 * @param options.allowTraversal - Allow `../` sequences (default: false)
 * @param options.allowedDirectories - Restrict to these directories
 * @param options.maxDepth - Maximum directory depth (default: 10)
 * @returns Validated absolute path
 * @throws Error if path violates security policy
 *
 * @see {@link isSafe} for boolean check
 * @see {@link sanitize} for path sanitization
 * @see {@link https://owasp.org/www-community/attacks/Path_Traversal | OWASP Path Traversal}
 *
 * @performance <50ms for typical paths
 * @since 1.0.0
 * @public
 */
static validate(path: string, options?: PathValidationOptions): string
```

### packages/errors Examples

#### ErrorSerializer with Security Documentation

```typescript
/**
 * Serializes errors with information disclosure prevention
 *
 * @security INFORMATION_DISCLOSURE - Error Safety
 *
 * This serializer ensures errors can be safely logged and transmitted
 * without leaking sensitive information.
 *
 * **Information Disclosure Risks**:
 * - Stack traces reveal internal file paths
 * - Error messages may contain sensitive data
 * - Database errors reveal schema details
 * - System errors reveal infrastructure
 *
 * **Sanitization Process**:
 * 1. Remove stack traces (keep only top-level message)
 * 2. Redact file paths (keep only filename)
 * 3. Remove error context with sensitive data
 * 4. Normalize error messages (remove specifics)
 *
 * **DREAD Score**: 6.2/10
 * - Damage: 5/10 (information disclosure)
 * - Reproducibility: 10/10
 * - Exploitability: 6/10
 * - Affected Users: 10/10
 * - Discoverability: 4/10
 *
 * @example Safe Error Logging
 * ```typescript
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   // Log full error internally (secure logs)
 *   logger.error('Operation failed', {
 *     error,
 *     userId,
 *     timestamp: Date.now()
 *   });
 *
 *   // Serialize for client (sanitized)
 *   const sanitized = ErrorSerializer.serialize(error);
 *   res.status(500).json({
 *     error: sanitized.code,
 *     message: sanitized.message
 *     // Stack trace NOT included
 *   });
 * }
 * ```
 *
 * @example Insecure Pattern (DO NOT COPY)
 * ```typescript
 * // WRONG: Exposing full error to client
 * catch (error) {
 *   res.status(500).json({ error }); // ❌ Leaks stack trace
 * }
 * ```
 *
 * @param error - Error to serialize
 * @param options - Serialization options
 * @param options.includeStack - Include stack trace (default: false)
 * @param options.redactPaths - Redact file paths (default: true)
 * @param options.maxDepth - Max error chain depth (default: 3)
 * @returns Sanitized error object safe for transmission
 *
 * @see {@link sanitizeStackTrace} for stack trace sanitization
 * @see {@link https://owasp.org/www-community/Improper_Error_Handling | OWASP Error Handling}
 *
 * @since 1.0.0
 * @public
 */
static serialize(error: Error, options?: SerializationOptions): SerializedError
```

### packages/types Examples

#### AgentSecurityContext with Security Documentation

```typescript
/**
 * Security context defining agent permissions and constraints
 *
 * @security AUTHORIZATION - Agent Permission Boundary
 *
 * This type defines the security boundary for agent operations.
 * It implements the principle of least privilege.
 *
 * **Security Model**:
 * - Capability-based: Agents can only perform granted capabilities
 * - Resource-limited: File size, memory, execution time limits
 * - Sandboxed: Three levels (unrestricted, moderate, strict)
 * - Auditable: All operations logged with security context
 *
 * **Privilege Levels**:
 * | Level | Network | Shell | File Read | File Write | Use Case |
 * |-------|---------|-------|-----------|------------|----------|
 * | **Unrestricted** | ✅ | ✅ | ✅ | ✅ | Development only |
 * | **Moderate** | ✅ | ❌ | ✅ | ✅ | Typical agents |
 * | **Strict** | ❌ | ❌ | ✅ | ❌ | Untrusted input |
 *
 * **Threat Mitigation**:
 * - Privilege escalation: Capabilities enforced at runtime
 * - Resource exhaustion: Limits prevent DoS
 * - Data exfiltration: Network access controlled
 * - System compromise: Shell access controlled
 *
 * @example Secure Agent Configuration
 * ```typescript
 * // Create agent with minimal privileges
 * const securityContext: AgentSecurityContext = {
 *   agentId: 'code-reviewer-001',
 *   capabilities: ['read_files', 'analyze_code'],
 *   resourceLimits: {
 *     maxFileSize: 1024 * 1024, // 1MB
 *     maxMemory: 512 * 1024 * 1024, // 512MB
 *     maxExecutionTime: 30000, // 30s
 *     allowedDomains: [] // No network access
 *   },
 *   sandboxLevel: 'strict',
 *   networkAccess: false,
 *   shellAccess: false,
 *   fileReadAccess: true,
 *   fileWriteAccess: false // Read-only
 * };
 * ```
 *
 * @example Insecure Configuration (DO NOT USE)
 * ```typescript
 * // WRONG: Overly permissive
 * const context: AgentSecurityContext = {
 *   agentId: 'agent',
 *   capabilities: ['*'], // ❌ Wildcard capabilities
 *   sandboxLevel: 'unrestricted', // ❌ No sandbox
 *   networkAccess: true,
 *   shellAccess: true, // ❌ Shell access
 *   fileWriteAccess: true
 * };
 * ```
 *
 * @see {@link SecurityPolicy} for authorization policies
 * @see {@link AuditLogEntry} for audit logging
 * @see ADR-012 for agent security architecture
 *
 * @since 1.0.0
 * @public
 */
export interface AgentSecurityContext {
  readonly agentId: string;
  readonly capabilities: string[];
  readonly resourceLimits?: ResourceLimits;
  readonly sandboxLevel: 'unrestricted' | 'moderate' | 'strict';
  readonly networkAccess: boolean;
  readonly shellAccess: boolean;
  readonly fileReadAccess: boolean;
  readonly fileWriteAccess: boolean;
}
```

---

## Security Review Checklist

Use this checklist when reviewing security-related JSDoc:

### Input Validation Documentation

- [ ] Function purpose clearly stated
- [ ] `@security INPUT_VALIDATION` tag present
- [ ] Acceptance criteria documented (what's valid)
- [ ] Rejection criteria documented (what's invalid)
- [ ] Attack vectors prevented listed
- [ ] Performance characteristics documented
- [ ] Secure usage example provided
- [ ] Insecure pattern example with warning
- [ ] References to OWASP or relevant standards
- [ ] DREAD score included (if high risk)

### Sanitization Documentation

- [ ] `@security SANITIZATION` tag present
- [ ] Transformation rules explicitly documented
- [ ] What's removed and why documented
- [ ] What's preserved documented
- [ ] Idempotency guarantee stated
- [ ] Performance characteristics documented
- [ ] Validation-first pattern emphasized
- [ ] Limitations clearly stated

### Error Handling Documentation

- [ ] `@security INFORMATION_DISCLOSURE` tag present
- [ ] Information disclosure risks listed
- [ ] Safe handling practices documented
- [ ] Client vs. internal error distinction clear
- [ ] Serialization safety documented
- [ ] Example of safe error response

### Security-Sensitive APIs

- [ ] Risk level stated (Low/Medium/High/Critical)
- [ ] DREAD score provided
- [ ] Threat model documented
- [ ] Required preconditions listed
- [ ] Security layers described
- [ ] Secure example provided
- [ ] Insecure pattern with explicit warning
- [ ] References to ADRs/CVEs

### Type Definitions

- [ ] Security implications documented
- [ ] Validation requirements stated
- [ ] Immutability noted (if applicable)
- [ ] Usage constraints documented
- [ ] Security context implications explained

---

## Conclusion

Security documentation is not optional - it's a critical control. Every function that touches untrusted input, performs validation, or affects security posture MUST have comprehensive security-aware documentation.

**Key Takeaways**:
1. **Documentation = Security Control**: Clear docs prevent misuse
2. **Explicit over Implicit**: State security properties explicitly
3. **Examples Matter**: Show secure patterns, warn about insecure ones
4. **Threat Models**: Document what attacks are prevented
5. **DREAD Scores**: Quantify risk for high-risk APIs

**For Questions or Updates**:
- Security questions: See ADR-012 Agent Security Architecture
- Documentation standards: See this document
- Threat models: See individual package docs

---

**Document Control**:
- **Version**: 1.0.0
- **Approved By**: Security Architecture Team
- **Next Review**: 2026-04-26 (Quarterly)
- **Related Documents**: ADR-012, ADR-010, CVE-2024-001, CVE-2024-002, CVE-2024-003
