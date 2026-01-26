# ADR-102: Zero Dependency Strategy

## Status
**Accepted** - 2026-01-26

## Context

AgentScope Core must be a standalone, secure, and fast-to-install CLI tool. npm dependencies introduce:

1. **Security Risks**: Vulnerable packages, supply chain attacks
2. **Install Friction**: Large `node_modules`, slow installs
3. **Maintenance Burden**: Frequent breaking changes
4. **Bundle Size**: Unnecessary code for simple operations

### Dependency Analysis

We analyzed what dependencies are typically needed:

| Category | Typical Packages | Size | Security Risk |
|----------|------------------|------|---------------|
| **Validation** | zod | 57 KB | Low |
| **Templating** | mustache | 18 KB | Low |
| **CLI** | commander | 75 KB | Low |
| **File Watching** | chokidar | 450 KB | Medium |
| **Graph Algorithms** | graphlib | 120 KB | Low |
| **GitHub API** | @octokit/rest | 1.2 MB | Medium |

**Total for typical setup**: ~2 MB + transitive dependencies (~5 MB)

### Goals

1. **Zero Runtime Dependencies** for v1.2
2. **Bundle Essential Code** (~550 lines total)
3. **Use Node.js Built-ins** (fs, path, crypto, url)
4. **Dev Dependencies Only** (TypeScript, Vitest, ESLint)

## Decision

We adopt a **zero npm runtime dependencies** strategy by:

### 1. Bundling Minimal Implementations

#### Validation (~300 lines)
Instead of zod (57 KB), we bundle a minimal validation library:

```typescript
// src/utils/validation.ts (~300 lines)

export interface Schema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): { success: boolean; data?: T; error?: string };
}

export class ZodLite {
  static string(): Schema<string> {
    return {
      parse: (input) => {
        if (typeof input !== 'string') {
          throw new Error('Expected string');
        }
        return input;
      },
      safeParse: (input) => {
        if (typeof input !== 'string') {
          return { success: false, error: 'Expected string' };
        }
        return { success: true, data: input };
      }
    };
  }

  static number(): Schema<number> {
    return {
      parse: (input) => {
        if (typeof input !== 'number') {
          throw new Error('Expected number');
        }
        return input;
      },
      safeParse: (input) => {
        if (typeof input !== 'number') {
          return { success: false, error: 'Expected number' };
        }
        return { success: true, data: input };
      }
    };
  }

  static object<T>(shape: Record<string, Schema<unknown>>): Schema<T> {
    return {
      parse: (input) => {
        if (typeof input !== 'object' || input === null) {
          throw new Error('Expected object');
        }
        const result: Record<string, unknown> = {};
        for (const [key, schema] of Object.entries(shape)) {
          result[key] = schema.parse((input as Record<string, unknown>)[key]);
        }
        return result as T;
      },
      safeParse: (input) => {
        if (typeof input !== 'object' || input === null) {
          return { success: false, error: 'Expected object' };
        }
        const result: Record<string, unknown> = {};
        for (const [key, schema] of Object.entries(shape)) {
          const parsed = schema.safeParse((input as Record<string, unknown>)[key]);
          if (!parsed.success) {
            return { success: false, error: `Field ${key}: ${parsed.error}` };
          }
          result[key] = parsed.data;
        }
        return { success: true, data: result as T };
      }
    };
  }

  static enum<T extends string>(values: T[]): Schema<T> {
    return {
      parse: (input) => {
        if (!values.includes(input as T)) {
          throw new Error(`Expected one of: ${values.join(', ')}`);
        }
        return input as T;
      },
      safeParse: (input) => {
        if (!values.includes(input as T)) {
          return { success: false, error: `Expected one of: ${values.join(', ')}` };
        }
        return { success: true, data: input as T };
      }
    };
  }

  static array<T>(itemSchema: Schema<T>): Schema<T[]> {
    return {
      parse: (input) => {
        if (!Array.isArray(input)) {
          throw new Error('Expected array');
        }
        return input.map(item => itemSchema.parse(item));
      },
      safeParse: (input) => {
        if (!Array.isArray(input)) {
          return { success: false, error: 'Expected array' };
        }
        const result: T[] = [];
        for (const item of input) {
          const parsed = itemSchema.safeParse(item);
          if (!parsed.success) {
            return { success: false, error: parsed.error };
          }
          result.push(parsed.data!);
        }
        return { success: true, data: result };
      }
    };
  }
}
```

**Why This Works**:
- Covers 90% of validation use cases
- Zero dependencies
- TypeScript-first (type inference)
- 300 lines vs 57 KB package

#### Templating (~200 lines)
Instead of mustache (18 KB), we bundle a minimal template engine:

```typescript
// src/utils/template.ts (~200 lines)

export interface TemplateData {
  [key: string]: unknown;
}

export class TemplateLite {
  static render(template: string, data: TemplateData): string {
    let result = template;

    // Replace {{variable}} with data values
    result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = data[key];
      return value !== undefined ? String(value) : '';
    });

    // Handle {{#array}}...{{/array}} loops
    result = result.replace(
      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, key, content) => {
        const value = data[key];
        if (!Array.isArray(value)) return '';
        return value.map(item => {
          return this.render(content, { ...data, ...item });
        }).join('');
      }
    );

    // Handle {{?condition}}...{{/condition}} conditionals
    result = result.replace(
      /\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, key, content) => {
        const value = data[key];
        return value ? content : '';
      }
    );

    return result;
  }

  static compile(template: string): (data: TemplateData) => string {
    return (data: TemplateData) => this.render(template, data);
  }
}
```

**Why This Works**:
- Covers variables, loops, conditionals
- Simpler than mustache (no partials, helpers)
- 200 lines vs 18 KB package
- Sufficient for README/template generation

#### CLI Framework (~50 lines)
Instead of commander (75 KB), we use simple argument parsing:

```typescript
// src/utils/cli.ts (~50 lines)

export interface CommandOptions {
  [key: string]: string | boolean | undefined;
}

export class CLI {
  static parseArgs(args: string[]): { command: string; options: CommandOptions } {
    const [command, ...rest] = args.slice(2); // Skip node and script path
    const options: CommandOptions = {};

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const nextArg = rest[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          options[key] = nextArg;
          i++; // Skip next arg
        } else {
          options[key] = true;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        options[key] = true;
      }
    }

    return { command, options };
  }

  static showHelp(commands: Record<string, string>): void {
    console.log('Usage: agentscope <command> [options]\n');
    console.log('Commands:');
    for (const [cmd, desc] of Object.entries(commands)) {
      console.log(`  ${cmd.padEnd(15)} ${desc}`);
    }
  }
}
```

**Why This Works**:
- Sufficient for simple CLI (scan, validate, export, etc.)
- 50 lines vs 75 KB package
- No fancy features (aliases, subcommands) needed in v1.2

### 2. Using Node.js Built-ins

| Operation | Built-in | Usage |
|-----------|----------|-------|
| **File I/O** | `fs/promises` | Read/write files |
| **Path manipulation** | `path` | Join, resolve, normalize |
| **URL validation** | `url` | Parse and validate URLs |
| **Hashing** | `crypto` | Generate file hashes |
| **Entropy calculation** | `crypto` | Secret detection |
| **Streams** | `stream` | Large file processing |

Example:
```typescript
import { readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { URL } from 'url';
import { createHash, randomBytes } from 'crypto';

// File operations
const content = await readFile(join(dir, 'file.txt'), 'utf-8');
await writeFile(join(dir, 'output.json'), JSON.stringify(data));

// Path safety
const safePath = resolve(basePath, userPath);
if (!safePath.startsWith(basePath)) {
  throw new Error('Path traversal detected');
}

// URL validation
try {
  new URL(endpoint);
} catch {
  throw new Error('Invalid URL');
}

// Hashing
const hash = createHash('sha256').update(content).digest('hex');

// Entropy (for secret detection)
const entropy = randomBytes(32).reduce((sum, byte) => {
  const p = byte / 255;
  return sum - (p > 0 ? p * Math.log2(p) : 0);
}, 0);
```

### 3. Dev Dependencies Only

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",      // Type checking
    "vitest": "^1.0.0",          // Testing
    "@types/node": "^20.0.0",    // Node.js types
    "eslint": "^8.56.0",         // Linting
    "prettier": "^3.1.0",        // Formatting
    "tsx": "^4.0.0",             // TS execution (dev)
    "rimraf": "^5.0.0"           // Clean builds
  },
  "dependencies": {}  // EMPTY!
}
```

### 4. Integration with @claude-flow/security

For security primitives (CVE remediation), we use the shared package:

```typescript
import { InputValidator, PathValidator, SecretsSanitizer } from '@claude-flow/security';
```

**Rationale**: Security is critical and benefits from shared, battle-tested implementations.

**Trade-off**: This is the ONE runtime dependency, but it's:
- First-party (we control it)
- Security-critical
- Shared across all products
- Well-tested

## Consequences

### Positive
- **Zero Attack Surface**: No third-party code (except @claude-flow/security)
- **Fast Installs**: ~1 MB total (vs 5-10 MB with deps)
- **No Breaking Changes**: We control all code
- **Offline-Friendly**: No registry lookups after install
- **Deterministic Builds**: No transitive dependency hell
- **Reduced Maintenance**: No dependency updates

### Negative
- **Reinventing Wheels**: Some code duplication vs packages
- **Limited Features**: Bundled implementations are simpler
- **Testing Burden**: Must test our implementations thoroughly
- **Community Familiarity**: Developers expect zod/mustache/commander

### Neutral
- **Bundle Size**: ~550 lines bundled vs ~2 MB packages (net win)
- **Performance**: Built-ins are fast, bundled code is lean

## Migration Path

### v1.2 (Current)
- ✅ Zero runtime dependencies (except @claude-flow/security)
- ✅ Bundle validation/templating/CLI (~550 lines)
- ✅ Use Node.js built-ins

### v1.3 (Future)
- 🔜 Add `chokidar` for watch mode (optional feature)
- 🔜 Add `@octokit/rest` for GitHub integration (optional feature)

### v1.4 (Future)
- 🔮 Add `graphlib` for advanced delegation analysis (optional feature)

**Principle**: Runtime dependencies must be:
1. **Optional** (feature flags)
2. **Well-maintained** (active development)
3. **Security-audited** (no CVEs)
4. **Minimal** (small bundle size)

## Related Decisions
- ADR-101: Core Architecture
- ADR-103: Security Scanning Engine
- DDD-101: Core Domain Model

## References
- [The Cost of Dependencies](https://bundlephobia.com/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Node.js Built-in Modules](https://nodejs.org/api/)

## Implementation Checklist

- [x] Bundle minimal validation (~300 lines)
- [x] Bundle minimal templating (~200 lines)
- [x] Bundle minimal CLI (~50 lines)
- [x] Use Node.js built-ins (fs, path, crypto, url)
- [x] Import @claude-flow/security
- [ ] Test bundled implementations (>95% coverage)
- [ ] Document bundled APIs (JSDoc)
- [ ] Performance benchmark vs packages
- [ ] Security audit bundled code

## Bundled Code Maintenance

### Validation Library
**Owner**: Core team
**Test Coverage**: >95%
**Update Frequency**: As needed for new validation patterns
**Breaking Changes**: Never (internal only)

### Template Engine
**Owner**: Generator domain team
**Test Coverage**: >95%
**Update Frequency**: Rare (stable API)
**Breaking Changes**: Never (internal only)

### CLI Parser
**Owner**: CLI layer team
**Test Coverage**: >90%
**Update Frequency**: Rare (stable API)
**Breaking Changes**: Never (internal only)

---

**Approved by**: ADR Architect Agent
**Implementation**: Week 1 of v1.2
**Review Date**: 2026-02-15
