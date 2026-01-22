# Suggested Improvements

> AgentScope - Agent Architecture Documentation & Visualization Tool
> Date: January 2026 | Source: Code Review & Security Audit

---

## Overview

This document consolidates improvement recommendations from the code review and security audit. Improvements are organized by priority and effort level to help with planning.

---

## Quick Reference Matrix

| Priority | Category | Count | Effort |
|----------|----------|-------|--------|
| Critical | Security | 2 | Medium |
| High | Code Quality | 5 | Medium-High |
| Medium | Architecture | 4 | High |
| Low | Enhancement | 6 | Low-Medium |

---

## Critical Priority Improvements

### IMP-CRIT-01: Fix Command Injection Vulnerabilities

**Category**: Security
**Effort**: Medium (2-4 hours)
**Impact**: Prevents remote code execution

**Current State**:
```javascript
// github-safe.js - VULNERABLE
execSync(`gh ${command} ${subcommand} ${newArgs.join(' ')}`, options);
```

**Improved State**:
```javascript
// Use execFileSync with argument array
const { execFileSync } = require('child_process');

function safeExec(command, args, options = {}) {
  // Validate command is in allowed list
  const allowedCommands = ['gh', 'git', 'npm'];
  if (!allowedCommands.includes(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }

  // Sanitize arguments
  const sanitizedArgs = args.map(arg => {
    if (typeof arg !== 'string') {
      throw new Error('Arguments must be strings');
    }
    return arg;
  });

  return execFileSync(command, sanitizedArgs, {
    encoding: 'utf-8',
    timeout: options.timeout || 30000,
    ...options
  });
}

// Usage
safeExec('gh', ['issue', 'comment', issueNumber, '--body-file', tempFile]);
```

**Files to Update**:
- `.claude/helpers/github-safe.js`
- `.claude/helpers/statusline.js`

---

### IMP-CRIT-02: Add Path Traversal Protection

**Category**: Security
**Effort**: Medium (2-3 hours)
**Impact**: Prevents unauthorized file access

**Implementation**:
```javascript
// Create a shared path validator utility
// src/utils/path-validator.ts

import path from 'path';
import fs from 'fs';

export class PathValidator {
  private readonly projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Validates that a path is within the project directory
   * @throws Error if path escapes project root
   */
  validatePath(targetPath: string): string {
    const absolutePath = path.resolve(this.projectRoot, targetPath);
    const normalizedPath = path.normalize(absolutePath);

    if (!normalizedPath.startsWith(this.projectRoot)) {
      throw new Error(`Path traversal detected: ${targetPath}`);
    }

    return normalizedPath;
  }

  /**
   * Safely joins paths, preventing traversal
   */
  safePath(...segments: string[]): string {
    const joined = path.join(this.projectRoot, ...segments);
    return this.validatePath(joined);
  }

  /**
   * Resolves symlinks and validates real path
   */
  safeRealPath(targetPath: string): string {
    const validated = this.validatePath(targetPath);

    if (fs.existsSync(validated)) {
      const realPath = fs.realpathSync(validated);
      if (!realPath.startsWith(this.projectRoot)) {
        throw new Error(`Symlink escapes project: ${targetPath}`);
      }
      return realPath;
    }

    return validated;
  }
}
```

---

## High Priority Improvements

### IMP-HIGH-01: Set Up TypeScript Configuration

**Category**: Code Quality
**Effort**: High (4-8 hours)
**Impact**: Type safety, better IDE support, catches bugs early

**Step 1: Install Dependencies**
```bash
npm install -D typescript @types/node ts-node
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

**Step 2: Create tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Update package.json**
```json
{
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

---

### IMP-HIGH-02: Implement Test Framework

**Category**: Code Quality
**Effort**: High (4-6 hours)
**Impact**: TDD compliance, regression prevention

**Step 1: Install Vitest**
```bash
npm install -D vitest @vitest/coverage-v8
```

**Step 2: Create vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

**Step 3: Create Test Directory Structure**
```
tests/
  unit/
    parsers/
      claude-code.test.ts
      mcp.test.ts
    generators/
      mermaid.test.ts
  integration/
    cli.test.ts
  fixtures/
    minimal/
    complete/
    edge-cases/
```

**Step 4: Example Test**
```typescript
// tests/unit/parsers/mcp.test.ts
import { describe, it, expect } from 'vitest';
import { parseMcpConfig } from '../../../src/parsers/mcp';

describe('MCP Parser', () => {
  it('should parse valid .mcp.json', () => {
    const input = {
      mcpServers: {
        'claude-flow': {
          command: 'npx',
          args: ['@claude-flow/cli@latest']
        }
      }
    };

    const result = parseMcpConfig(input);

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].name).toBe('claude-flow');
  });

  it('should handle empty config', () => {
    const result = parseMcpConfig({});

    expect(result.servers).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should report errors for invalid config', () => {
    const result = parseMcpConfig({ mcpServers: 'invalid' });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].level).toBe('fatal');
  });
});
```

---

### IMP-HIGH-03: Add Input Validation with Zod

**Category**: Security / Code Quality
**Effort**: Medium (3-4 hours)
**Impact**: Type-safe runtime validation

**Install Zod**
```bash
npm install zod
```

**Create Validation Schemas**
```typescript
// src/validation/schemas.ts
import { z } from 'zod';

// CLI Argument Schemas
export const ScanOptionsSchema = z.object({
  output: z.string().optional().default('./docs/agent-architecture/'),
  diagram: z.enum(['component', 'sequence', 'hierarchy', 'dataflow', 'permissions', 'hooks']).optional(),
  allDiagrams: z.boolean().optional().default(false),
  format: z.enum(['markdown', 'json']).optional().default('markdown'),
  strict: z.boolean().optional().default(false)
});

// Memory Key Schema
export const MemoryKeySchema = z.string()
  .min(1, 'Key cannot be empty')
  .max(256, 'Key too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Key contains invalid characters');

// Session Context Schema
export const SessionContextSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

// Agent Configuration Schema
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  source: z.enum(['project', 'user']),
  sourcePath: z.string(),
  allowedTools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  configSnippet: z.string().optional()
});

// MCP Server Schema
export const McpServerSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  tools: z.array(z.string()).optional()
});
```

**Usage Example**
```typescript
// src/cli/commands/scan.ts
import { ScanOptionsSchema } from '../validation/schemas';

export function scanCommand(rawOptions: unknown) {
  // Validate and parse options
  const parseResult = ScanOptionsSchema.safeParse(rawOptions);

  if (!parseResult.success) {
    console.error('Invalid options:', parseResult.error.format());
    process.exit(1);
  }

  const options = parseResult.data;
  // Now options is fully typed and validated
}
```

---

### IMP-HIGH-04: Add ESLint Configuration

**Category**: Code Quality
**Effort**: Medium (2-3 hours)
**Impact**: Consistent code style, catches common errors

**Install Dependencies**
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier
```

**Create .eslintrc.json**
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/strict-boolean-expressions": "error",
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "eqeqeq": ["error", "always"],
    "no-eval": "error",
    "no-implied-eval": "error",
    "prefer-const": "error"
  },
  "ignorePatterns": ["dist/", "node_modules/", "*.js"]
}
```

---

### IMP-HIGH-05: Implement Proper Error Handling

**Category**: Code Quality
**Effort**: Medium (3-4 hours)
**Impact**: Better debugging, consistent error messages

**Create Custom Error Classes**
```typescript
// src/errors/index.ts

export class AgentScopeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentScopeError';
  }
}

export class ParseError extends AgentScopeError {
  constructor(message: string, public readonly file: string, context?: Record<string, unknown>) {
    super(message, 'PARSE_ERROR', { file, ...context });
    this.name = 'ParseError';
  }
}

export class ValidationError extends AgentScopeError {
  constructor(message: string, public readonly field: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', { field, ...context });
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends AgentScopeError {
  constructor(message: string, public readonly path: string, context?: Record<string, unknown>) {
    super(message, 'FS_ERROR', { path, ...context });
    this.name = 'FileSystemError';
  }
}

export class SecurityError extends AgentScopeError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SECURITY_ERROR', context);
    this.name = 'SecurityError';
  }
}
```

**Error Handler**
```typescript
// src/errors/handler.ts

import { AgentScopeError } from './index';

export function handleError(error: unknown): never {
  if (error instanceof AgentScopeError) {
    console.error(`[${error.code}] ${error.message}`);
    if (error.context && process.env.DEBUG) {
      console.error('Context:', JSON.stringify(error.context, null, 2));
    }
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  console.error('Unknown error occurred');
  process.exit(1);
}
```

---

## Medium Priority Improvements

### IMP-MED-01: Create Shared Constants File

**Category**: Architecture
**Effort**: Low (1-2 hours)
**Impact**: Eliminates magic numbers, improves maintainability

```typescript
// src/constants.ts

export const FILE_PATTERNS = {
  CLAUDE_CONFIG: '.claude/',
  CLAUDE_MD: 'CLAUDE.md',
  MCP_CONFIG: '.mcp.json',
  USER_CLAUDE: '~/.claude/',
} as const;

export const TIMEOUTS = {
  EXEC_DEFAULT: 30000,
  EXEC_SHORT: 5000,
  EXEC_LONG: 60000,
  REGEX_SCAN: 1000,
} as const;

export const LIMITS = {
  MAX_FILE_LINES: 300,
  MAX_FUNCTION_LINES: 50,
  MAX_KEY_LENGTH: 256,
  MAX_DIFF_SIZE: 1000000, // 1MB
  MAX_COMPONENTS: 50,
} as const;

export const PATHS = {
  OUTPUT_DEFAULT: './docs/agent-architecture/',
  MEMORY_DIR: '.claude-flow/data/',
  SESSION_DIR: '.claude-flow/sessions/',
} as const;

export const SECURITY = {
  SAFE_FILE_MODE: 0o600,
  SAFE_DIR_MODE: 0o700,
} as const;
```

---

### IMP-MED-02: Add Logging Framework

**Category**: Architecture
**Effort**: Medium (2-3 hours)
**Impact**: Better debugging, audit trail

```typescript
// src/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private format(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `${prefix} ${entry.message}${ctx}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    const formatted = this.format(entry);

    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);
```

---

### IMP-MED-03: Implement Result Type Pattern

**Category**: Architecture
**Effort**: Medium (2-3 hours)
**Impact**: Explicit error handling, no exceptions for expected failures

```typescript
// src/types/result.ts

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Usage example
import { Result, ok, err } from '../types/result';
import { ParseError } from '../errors';

function parseConfig(content: string): Result<Config, ParseError> {
  try {
    const parsed = JSON.parse(content);
    return ok(parsed as Config);
  } catch (e) {
    return err(new ParseError('Invalid JSON', 'config.json'));
  }
}

// Consuming code
const result = parseConfig(fileContent);
if (result.success) {
  // TypeScript knows result.data is Config
  console.log(result.data);
} else {
  // TypeScript knows result.error is ParseError
  console.error(result.error.message);
}
```

---

### IMP-MED-04: Add Pre-commit Hooks with Husky

**Category**: Architecture
**Effort**: Low (1 hour)
**Impact**: Automated quality checks

**Install**
```bash
npm install -D husky lint-staged
npx husky install
```

**Create .husky/pre-commit**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

**Update package.json**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## Low Priority Improvements

### IMP-LOW-01: Add JSDoc Documentation

**Effort**: Low (ongoing)

```typescript
/**
 * Parses a Claude Code configuration file
 *
 * @param filePath - Absolute path to the configuration file
 * @param options - Parsing options
 * @returns Parsed agent configuration or validation errors
 *
 * @example
 * ```typescript
 * const result = await parseClaudeConfig('/project/.claude/settings.json');
 * if (result.success) {
 *   console.log(result.data.agents);
 * }
 * ```
 *
 * @throws {FileSystemError} If file cannot be read
 * @see {@link AgentConfig} for the returned data structure
 */
export async function parseClaudeConfig(
  filePath: string,
  options?: ParseOptions
): Promise<Result<AgentConfig, ParseError>> {
  // implementation
}
```

---

### IMP-LOW-02: Add npm Scripts for Common Tasks

**Effort**: Low (30 minutes)

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src tests",
    "lint:fix": "eslint src tests --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "npm run typecheck && npm run lint && npm run test",
    "prepare": "husky install"
  }
}
```

---

### IMP-LOW-03: Create Contributing Guidelines for Code Quality

**Effort**: Low (1 hour)

Add to CONTRIBUTING.md:

```markdown
## Code Quality Requirements

### Before Submitting a PR

1. **Run all checks**:
   ```bash
   npm run check
   ```

2. **Ensure tests pass with coverage**:
   ```bash
   npm run test:coverage
   ```
   Coverage must be >= 80%

3. **No TypeScript errors**:
   ```bash
   npm run typecheck
   ```

4. **No lint warnings**:
   ```bash
   npm run lint
   ```

### Code Style

- Use explicit types (no implicit `any`)
- Prefer `const` over `let`
- Use async/await over raw Promises
- Handle all errors explicitly
- Add JSDoc to public functions
- Keep functions < 50 lines
- Keep files < 300 lines
```

---

### IMP-LOW-04: Add Debug Mode

**Effort**: Low (1 hour)

```typescript
// src/debug.ts

export const DEBUG = process.env.DEBUG === 'true' || process.env.DEBUG === '1';

export function debugLog(message: string, data?: unknown): void {
  if (!DEBUG) return;

  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] ${message}`);

  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function debugTime(label: string): () => void {
  if (!DEBUG) return () => {};

  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    console.log(`[DEBUG] ${label}: ${duration.toFixed(2)}ms`);
  };
}

// Usage
const endTimer = debugTime('parseConfig');
const config = parseConfig(content);
endTimer(); // Logs: [DEBUG] parseConfig: 12.34ms
```

---

### IMP-LOW-05: Add Version Information to Output

**Effort**: Low (30 minutes)

```typescript
// src/version.ts
import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name: string;
  version: string;
}

function getPackageInfo(): PackageJson {
  const pkgPath = join(__dirname, '..', 'package.json');
  const content = readFileSync(pkgPath, 'utf-8');
  return JSON.parse(content) as PackageJson;
}

export function getVersionString(): string {
  const pkg = getPackageInfo();
  return `${pkg.name} v${pkg.version}`;
}

export function printVersion(): void {
  console.log(getVersionString());
}
```

---

### IMP-LOW-06: Add Performance Timing

**Effort**: Low (1 hour)

```typescript
// src/performance.ts

interface TimingResult {
  phase: string;
  durationMs: number;
}

class PerformanceTracker {
  private timings: TimingResult[] = [];

  time<T>(phase: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.timings.push({ phase, durationMs: duration });
    return result;
  }

  async timeAsync<T>(phase: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.timings.push({ phase, durationMs: duration });
    return result;
  }

  report(): void {
    const total = this.timings.reduce((sum, t) => sum + t.durationMs, 0);

    console.log('\nPerformance Report:');
    for (const timing of this.timings) {
      const pct = ((timing.durationMs / total) * 100).toFixed(1);
      console.log(`  ${timing.phase}: ${timing.durationMs.toFixed(2)}ms (${pct}%)`);
    }
    console.log(`  Total: ${total.toFixed(2)}ms`);
  }
}

export const perf = new PerformanceTracker();
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Set up TypeScript | 4-8h | None |
| Add ESLint | 2-3h | TypeScript |
| Add Vitest | 4-6h | TypeScript |
| Fix command injection | 2-4h | None |
| Fix path traversal | 2-3h | None |

### Phase 2: Quality (Week 2)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add Zod validation | 3-4h | TypeScript |
| Implement error handling | 3-4h | TypeScript |
| Create constants file | 1-2h | TypeScript |
| Add logging framework | 2-3h | TypeScript |
| Migrate helpers to TS | 4-8h | All above |

### Phase 3: Polish (Week 3)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add pre-commit hooks | 1h | ESLint, Vitest |
| Add JSDoc documentation | 2-4h | TypeScript |
| Add debug mode | 1h | Logging |
| Add performance timing | 1h | None |
| Update CONTRIBUTING.md | 1h | None |

---

## Conclusion

These improvements establish a solid foundation for the AgentScope CLI implementation. The critical and high priority items should be completed before starting core feature development. Medium and low priority items can be addressed incrementally as the project evolves.

**Key Metrics After Implementation**:
- 100% TypeScript coverage
- 80%+ test coverage
- 0 ESLint errors
- 0 TypeScript errors
- All security vulnerabilities resolved

---

*This document should be updated as improvements are implemented.*
