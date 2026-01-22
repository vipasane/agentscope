# Security Implementation - DESIGN-001

This document describes the security sanitizers and validators implemented for AgentScope's Mermaid diagram generation.

## Overview

DESIGN-001 implements comprehensive input validation and output sanitization to prevent:
- **Mermaid directive injection** - Malicious `%%{init:...}%%` directives
- **XSS attacks** - HTML/JavaScript injection in diagrams
- **Path traversal** - Unauthorized file access
- **Invalid configurations** - Theme name validation

## Implementation

### Module Structure

```
/src/core/security/
├── validators.ts    # Input validation functions
├── sanitizers.ts    # Output sanitization functions
└── index.ts         # Module exports
```

### Validators (`validators.ts`)

#### `validateThemeName(theme: string): boolean`
Validates theme names against an allowlist:
- `light`, `dark`
- `high-contrast-light`, `high-contrast-dark`
- `colorblind-light`, `colorblind-dark`

**Example:**
```typescript
validateThemeName('light');        // true
validateThemeName('dark');         // true
validateThemeName('custom-theme'); // false
```

#### `validateColor(color: string): boolean`
Validates color strings (hex, rgb, rgba, hsl, hsla, named colors):
- Blocks JavaScript protocols (`javascript:`)
- Blocks event handlers (`onclick=`, `onerror=`)
- Blocks special characters that could enable injection

**Example:**
```typescript
validateColor('#FF0000');           // true
validateColor('rgb(255, 0, 0)');    // true
validateColor('javascript:alert');  // false
```

#### `validateAgentCount(count: number, max?: number): boolean`
Validates agent count is within bounds:
- Must be a finite integer
- Must be non-negative
- Must not exceed max (default: 1000)

**Example:**
```typescript
validateAgentCount(5);       // true
validateAgentCount(1500);    // false (exceeds default max)
validateAgentCount(-5);      // false (negative)
```

#### `detectInjectionPatterns(input: string): string[]`
Detects potential injection patterns in input:
- Mermaid directives (`%%{`, `}%%`, `init:`, `config:`)
- HTML tags and script tags
- JavaScript protocols
- Event handlers
- HTML entities
- Data URIs with HTML content

**Example:**
```typescript
detectInjectionPatterns('normal text');           // []
detectInjectionPatterns('%%{init: malicious}%%'); // ['Directive start', 'Init directive', 'Directive end']
```

### Sanitizers (`sanitizers.ts`)

#### `sanitizeId(str: string): string`
Sanitizes strings for use as Mermaid node IDs:
- Replaces non-alphanumeric characters (except underscore) with `_`
- Removes consecutive underscores
- Prefixes IDs starting with digits with `n_`
- Appends `_node` to Mermaid reserved words
- Limits length to 50 characters

**Example:**
```typescript
sanitizeId('my-agent-123');     // 'my_agent_123'
sanitizeId('123-agent');        // 'n_123_agent'
sanitizeId('end');              // 'end_node' (reserved word)
```

**Reserved words:** `end`, `graph`, `subgraph`, `direction`, `class`, `style`, `classDef`, `click`, `callback`, `link`, `linkStyle`, `interpolate`, `default`

#### `sanitizeNodeLabel(label: string): string`
Sanitizes strings for use as Mermaid node labels:
- Removes Mermaid directive patterns
- Removes HTML tags (but keeps content)
- Removes JavaScript protocols
- Removes event handlers
- Escapes special Mermaid characters: `[]{}()#|;>"`
- Limits length to 100 characters

**Example:**
```typescript
sanitizeNodeLabel('My Agent');              // 'My Agent'
sanitizeNodeLabel('Agent [1]');             // 'Agent \\[1\\]'
sanitizeNodeLabel('%%{init: bad}%%');       // 'bad' (directives removed)
sanitizeNodeLabel('<script>alert()</script>'); // 'alert\\(\\)' (tags removed, parens escaped)
```

#### `sanitizePath(inputPath: string, allowedDirs: string[]): string | null`
Sanitizes file paths to prevent path traversal:
- Resolves to absolute path
- Checks for `..` sequences (path traversal)
- Verifies path is within allowed directories
- Blocks suspicious characters: `<>"|?*\0`
- Returns `null` if path is invalid

**Example:**
```typescript
sanitizePath('./file.txt', ['/workspace']);     // '/workspace/file.txt'
sanitizePath('../../../etc/passwd', ['/workspace']); // null (traversal)
sanitizePath('/tmp/file', ['/workspace']);      // null (outside allowed)
```

#### `sanitizeConfig<T>(config: T, allowedKeys?: string[]): Partial<T>`
Sanitizes configuration objects:
- Filters keys against allowlist (if provided)
- Removes function values (security risk)
- Recursively sanitizes nested objects
- Sanitizes string values using `sanitizeNodeLabel`

#### `sanitizeMarkdown(markdown: string): string`
Sanitizes markdown content to prevent XSS:
- Removes JavaScript protocols in links
- Removes data URIs with HTML content
- Removes script tags
- Removes inline event handlers

## Integration

### Component Map Generator

The security module is integrated into `/src/core/generators/diagrams/component-map.ts`:

1. **Import security functions:**
```typescript
import { sanitizeId, sanitizeNodeLabel, validateThemeName } from '../../security/index.js';
```

2. **Validate theme before resolving:**
```typescript
if (theme && !validateThemeName(theme)) {
  throw new Error(`Invalid theme name: "${theme}"`);
}
```

3. **Sanitize all node IDs and labels:**
```typescript
const agentId = sanitizeId(agent.name);
const rawLabel = formatAgentLabel(agent);
const label = sanitizeNodeLabel(rawLabel);
lines.push(`${agentId}["${label}"]`);
```

## Testing

Comprehensive test suite in `/tests/security-sanitizers.test.ts`:
- 34 test cases covering all validators and sanitizers
- Tests for valid inputs
- Tests for malicious inputs
- Tests for edge cases (empty strings, long inputs, etc.)

**Run tests:**
```bash
npm test -- security-sanitizers.test.ts
```

## Security Guarantees

### Prevented Attacks

1. **Mermaid Directive Injection**
   - Blocks `%%{init:...}%%` and `%%{config:...}%%`
   - Prevents theme override attacks
   - Prevents configuration manipulation

2. **XSS via HTML/JavaScript**
   - Removes `<script>` tags
   - Removes JavaScript protocols (`javascript:`)
   - Removes event handlers (`onclick=`, `onerror=`)
   - Escapes special characters

3. **Path Traversal**
   - Blocks `../` sequences outside allowed directories
   - Validates all paths are within allowed base directories
   - Blocks suspicious characters

4. **Theme Injection**
   - Allowlist of valid theme names
   - Rejects custom/malicious theme names
   - Validates before theme resolution

### Defense in Depth

Multiple layers of protection:
1. **Input validation** - Reject invalid inputs early
2. **Output sanitization** - Clean all outputs before rendering
3. **Allowlists** - Only permit known-good values (themes, colors)
4. **Pattern detection** - Detect and block injection patterns

## Performance

All sanitizers are lightweight and suitable for real-time use:
- `sanitizeId`: O(n) with single pass
- `sanitizeNodeLabel`: O(n) with multiple regex passes
- `validateThemeName`: O(1) with Set lookup
- `detectInjectionPatterns`: O(n) with regex matching

## Future Enhancements

Potential improvements for future versions:
1. **CSP headers** - Content Security Policy for web rendering
2. **Sandbox mode** - Isolated Mermaid rendering environment
3. **Rate limiting** - Prevent DoS via excessive diagram generation
4. **Audit logging** - Log all sanitization events
5. **Custom patterns** - Allow users to define additional injection patterns

## References

- DESIGN-001: Security Architecture
- [Mermaid Syntax Reference](https://mermaid.js.org/intro/syntax-reference.html)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

**Implementation Date:** 2026-01-22
**Version:** 1.0.0
**Status:** ✅ Complete - All tests passing
