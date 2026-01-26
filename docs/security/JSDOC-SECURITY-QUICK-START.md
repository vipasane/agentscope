# JSDoc Security Documentation Quick Start

> **TL;DR**: Use security tags, document threats, show secure examples, warn about insecure patterns.

---

## Quick Reference Card

### When to Use Security Tags

```typescript
// ✅ USE @security tags for:
- Input validation functions
- Sanitization/escaping functions
- Command execution
- File path handling
- Secret detection
- Error serialization
- Authentication/authorization
- Resource limits

// ❌ DON'T USE @security tags for:
- Pure utility functions (no security impact)
- Internal helpers (not public API)
- Simple getters/setters
- Type definitions (unless security-critical)
```

---

## 5-Minute Template

Copy-paste this template and customize:

```typescript
/**
 * [Brief function description]
 *
 * @security [TAG] - [Risk Level: Low/Medium/High/Critical]
 * [One sentence describing security purpose]
 *
 * **Threat Mitigation**:
 * - Prevents [attack type 1]
 * - Blocks [attack type 2]
 * - Validates [constraint]
 *
 * **Security Guarantees**:
 * - ✅ [Guarantee 1]
 * - ✅ [Guarantee 2]
 * - ⚠️ [Limitation or risk]
 *
 * @example Secure Usage
 * ```typescript
 * // CORRECT: [Describe secure pattern]
 * const result = yourFunction(input);
 * if (!result.success) {
 *   return handleError();
 * }
 * ```
 *
 * @example Insecure Pattern (DO NOT USE)
 * ```typescript
 * // WRONG: [Describe insecure pattern]
 * const value = userInput; // ❌ [Why this is wrong]
 * ```
 *
 * @param input - [Description with security note]
 * @returns [Description with security note]
 *
 * @see {@link RelatedFunction}
 * @see [OWASP Reference](https://owasp.org/...)
 *
 * @since 1.0.0
 * @public
 */
```

---

## Security Tags Cheat Sheet

| Tag | Use Case | Risk |
|-----|----------|------|
| `INPUT_VALIDATION` | Validating untrusted input | High |
| `SANITIZATION` | Cleaning/escaping data | High |
| `COMMAND_EXECUTION` | Shell commands | Critical |
| `PATH_VALIDATION` | File paths | High |
| `SECRET_DETECTION` | Secrets scanning | Critical |
| `INFORMATION_DISCLOSURE` | Error messages | Medium |
| `DOS_PREVENTION` | Rate limits, resources | Medium |
| `AUTHORIZATION` | Permission checks | High |

---

## Common Patterns

### Pattern 1: Input Validator

```typescript
/**
 * Validates user email address
 *
 * @security INPUT_VALIDATION - High Risk
 * Prevents email injection and validates RFC 5322 format.
 *
 * **Threat Mitigation**:
 * - Email injection: Blocks CRLF sequences
 * - Command injection: Validates safe characters
 * - DoS: Limits to 254 characters
 *
 * @example
 * ```typescript
 * const result = validateEmail(userInput);
 * if (!result.success) {
 *   return { error: 'Invalid email' };
 * }
 * ```
 */
```

### Pattern 2: Sanitizer

```typescript
/**
 * Removes shell metacharacters from string
 *
 * @security SANITIZATION - High Risk
 * Sanitizes input for safe shell usage.
 *
 * **Removes**: `;`, `|`, `&`, `$`, `` ` ``, `(`, `)`, `{`, `}`, `[`, `]`
 * **Preserves**: Alphanumeric, whitespace, `-`, `_`
 *
 * ⚠️ Always validate BEFORE sanitizing.
 *
 * @example
 * ```typescript
 * const validated = validate(input);
 * const sanitized = sanitize(validated); // Defense in depth
 * ```
 */
```

### Pattern 3: Error Handler

```typescript
/**
 * Serializes error for client response
 *
 * @security INFORMATION_DISCLOSURE - Medium Risk
 * Removes sensitive data from errors before sending to client.
 *
 * **Excluded from output**:
 * - Stack traces
 * - File paths
 * - Sensitive values
 *
 * @example
 * ```typescript
 * catch (error) {
 *   logger.error(error); // Full error internally
 *   return { error: sanitizeError(error) }; // Safe for client
 * }
 * ```
 */
```

---

## Review Checklist (30 seconds)

Before committing security-related JSDoc:

- [ ] `@security` tag present with risk level
- [ ] Threat mitigation listed (what attacks prevented)
- [ ] Security guarantees stated
- [ ] Secure example provided
- [ ] Insecure pattern with ❌ warning
- [ ] Performance noted (if relevant)
- [ ] OWASP or standard referenced

---

## Common Mistakes to Avoid

### ❌ Mistake 1: No Security Tag

```typescript
// WRONG: Missing @security tag
/**
 * Validates user input
 */
function validate(input: string) { }
```

```typescript
// CORRECT: Security tag with context
/**
 * Validates user input
 *
 * @security INPUT_VALIDATION - High Risk
 * First line of defense against injection attacks.
 */
function validate(input: string) { }
```

### ❌ Mistake 2: No Examples

```typescript
// WRONG: No usage example
/**
 * @security PATH_VALIDATION
 * Validates file paths
 */
```

```typescript
// CORRECT: Shows secure pattern
/**
 * @security PATH_VALIDATION
 * Validates file paths
 *
 * @example
 * ```typescript
 * const safe = validatePath(userInput, { allowedDirs: ['/uploads'] });
 * ```
 */
```

### ❌ Mistake 3: Missing Threat Context

```typescript
// WRONG: No explanation of threats
/**
 * @security SANITIZATION
 * Cleans input
 */
```

```typescript
// CORRECT: Explains what it prevents
/**
 * @security SANITIZATION
 * Removes shell metacharacters to prevent command injection.
 *
 * **Threat Mitigation**:
 * - Command injection via `;`, `|`, `&`
 * - Code execution via `$()`, backticks
 */
```

---

## When to Write Detailed Docs

### ✅ Write Detailed Docs When:
- Function accepts untrusted input
- Function performs validation/sanitization
- Function executes system commands
- Function accesses filesystem
- Function logs/serializes errors
- Function affects security permissions
- Risk level is High or Critical

### ✅ Brief Docs OK When:
- Internal helper function
- Type definition (unless security-critical)
- Pure computation (no I/O)
- Risk level is Low

---

## Resources

- **Full Guide**: [COMMON-CORE-JSDOC-SECURITY.md](./COMMON-CORE-JSDOC-SECURITY.md)
- **Architecture**: [ADR-012 Agent Security Architecture](../adr/ADR-012-agent-security-architecture.md)
- **Package Docs**:
  - [packages/security](../../packages/security/README.md)
  - [packages/errors](../../packages/errors/README.md)
  - [packages/types](../../packages/types/README.md)

---

## Examples in Codebase

See these files for reference implementations:

```bash
# Input validation examples
packages/security/src/validators/InputValidator.ts

# Path validation examples
packages/security/src/validators/PathValidator.ts

# Command safety examples
packages/security/src/validators/SafeExecutor.ts

# Secret detection examples
packages/security/src/sanitizers/SecretsSanitizer.ts

# Error handling examples
packages/errors/src/serializer/error-serializer.ts
```

---

## Quick Wins

**5 minutes**: Add `@security` tags to your public validation functions
**15 minutes**: Add threat mitigation lists
**30 minutes**: Add secure/insecure examples
**1 hour**: Document full threat model with DREAD scores

Start with the highest-risk functions first (command execution, path validation, secret handling).

---

**Need Help?**
- Review [COMMON-CORE-JSDOC-SECURITY.md](./COMMON-CORE-JSDOC-SECURITY.md) for detailed templates
- Check existing implementations in `packages/security/src/`
- Reference OWASP cheat sheets for security patterns
