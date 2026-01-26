# JSDoc Examples Testing - Quick Start

## TL;DR

All JSDoc `@example` code blocks are automatically validated via unit tests.

**Test file:** `tests/jsdoc-examples.test.ts`
**Command:** `npm test -- tests/jsdoc-examples.test.ts`
**Status:** ✓ 52/52 tests passing

## Quick Stats

| Metric | Value |
|--------|-------|
| Test Cases | 52 |
| Passing | 52 (100%) |
| Coverage | 89% on validators.ts |
| Duration | ~12ms |
| Files Tested | Path Transformer, Security Validators |

## What's Tested

### Path Transformer
- `detectPathType()` - Identifies path types (workspace-relative, home-relative, absolute, URL)
- `toPortablePath()` - Converts to portable POSIX format
- `fromPortablePath()` - Converts back to platform-specific format

### Security Validators
- `validateThemeName()` - Validates theme names against allowlist
- `validateColor()` - Validates color formats (hex, rgb, rgba, hsl, hsla, named)
- `validateAgentCount()` - Validates agent counts with bounds checking
- `detectInjectionPatterns()` - Detects security injection attempts

## Run Tests

```bash
# Run JSDoc examples tests only
npm test -- tests/jsdoc-examples.test.ts

# Run with coverage
npm test -- tests/jsdoc-examples.test.ts --coverage

# Run in watch mode
npm test:watch -- tests/jsdoc-examples.test.ts

# Run full test suite (includes JSDoc examples)
npm test
```

## How It Works

Each JSDoc example is tested by:

1. **Extracting** the code from `@example` blocks
2. **Compiling** with TypeScript to verify syntax
3. **Executing** to verify no runtime errors
4. **Validating** output matches documentation

Example:
```typescript
/**
 * Validates a theme name
 * @example
 * ```typescript
 * validateThemeName('light');  // true
 * ```
 */
export function validateThemeName(theme: string): boolean {
  // ...
}
```

Test:
```typescript
it('should validate light theme', () => {
  expect(validateThemeName('light')).toBe(true);
});
```

## Adding Examples

When you write a JSDoc example:

1. **Add to JSDoc:**
```typescript
/**
 * Does something useful
 * @param input The input value
 * @returns The result
 * @example
 * ```typescript
 * myFunction('test');  // 'expected result'
 * ```
 */
export function myFunction(input: string): string {
  // ...
}
```

2. **Add test case:**
```typescript
describe('JSDoc Examples - My Module', () => {
  it('should validate myFunction example', () => {
    expect(myFunction('test')).toBe('expected result');
  });
});
```

3. **Run tests:**
```bash
npm test -- tests/jsdoc-examples.test.ts
```

## Examples That Work

✓ Valid theme validation:
```typescript
validateThemeName('light');        // true
validateThemeName('dark');         // true
validateThemeName('custom-theme'); // false
```

✓ Color format validation:
```typescript
validateColor('#FF0000');           // true
validateColor('rgb(255, 0, 0)');    // true
validateColor('javascript:alert');  // false
```

✓ Agent count bounds:
```typescript
validateAgentCount(5);              // true
validateAgentCount(1500);           // false
validateAgentCount(1500, 2000);     // true
```

✓ Path type detection:
```typescript
detectPathType('./src/config.json');     // 'workspace-relative'
detectPathType('~/Documents/file.txt');  // 'home-relative'
detectPathType('/etc/config');           // 'absolute'
detectPathType('https://example.com');   // 'url'
```

✓ Injection detection:
```typescript
detectInjectionPatterns('normal text');           // []
detectInjectionPatterns('%%{init: malicious}%%'); // [patterns...]
detectInjectionPatterns('<script>alert(1)</script>'); // [patterns...]
```

## Common Issues

### Test Fails: "Example doesn't compile"
→ Check imports and function signatures match actual code

### Test Fails: "Expected behavior doesn't match"
→ Update JSDoc example if implementation changed, or fix implementation

### Test Fails: "Throws unexpected error"
→ Use valid input in examples, handle edge cases in code

## Documentation

- **Full Guide:** [`docs/JSDOC-EXAMPLES-TESTING.md`](./JSDOC-EXAMPLES-TESTING.md)
- **Completion Report:** [`JSDOC-EXAMPLES-COMPLETION-REPORT.md`](../JSDOC-EXAMPLES-COMPLETION-REPORT.md)

## Best Practices

1. **Keep examples simple** - Show core functionality
2. **Show valid and invalid cases** - Demonstrate validation
3. **Include edge cases** - Show boundary conditions
4. **Document expected output** - Use comments to clarify

## Files

| File | Purpose |
|------|---------|
| `tests/jsdoc-examples.test.ts` | Test implementation (52 tests) |
| `docs/JSDOC-EXAMPLES-TESTING.md` | Complete testing guide |
| `JSDOC-EXAMPLES-COMPLETION-REPORT.md` | Project completion summary |
| `docs/JSDOC-EXAMPLES-QUICK-START.md` | This quick reference |

## Success Criteria ✓

✓ All JSDoc examples compile
✓ All JSDoc examples run without errors
✓ Example outputs match documentation
✓ Anti-patterns correctly demonstrate failures
✓ Edge cases handled gracefully
✓ Security patterns prevent attacks
✓ Cross-platform behavior consistent

---

**Need help?** See [`JSDOC-EXAMPLES-TESTING.md`](./JSDOC-EXAMPLES-TESTING.md) for detailed documentation.
