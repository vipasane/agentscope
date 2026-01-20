# ADR-009: Security Model - Read-Only, No Execution

## Status

Accepted

## Context

AgentScope scans agent configuration files and generates documentation. As a CLI tool that reads user files, security is paramount:

1. **User trust** - Users must trust that AgentScope won't harm their system
2. **Supply chain** - Dependencies could introduce vulnerabilities
3. **Input handling** - Config files could contain malicious content
4. **Output safety** - Generated files shouldn't enable attacks
5. **Path traversal** - Users might provide malicious paths

The PRD specifies security principles:
- No code execution
- No network access
- No secrets handling
- Path validation
- Input sanitization

We must implement security measures that protect users while maintaining functionality.

## Decision

We will implement a **read-only, no-execution security model** with explicit boundaries.

### Security Principles

| Principle | Implementation |
|-----------|----------------|
| **Read-only** | Only read operations, never write outside output directory |
| **No execution** | Never execute code from config files |
| **No network** | No HTTP requests, API calls, or telemetry |
| **No secrets** | Never parse, log, or output API keys/tokens |
| **Path validation** | Prevent directory traversal attacks |
| **Input sanitization** | Sanitize all content before output |

### Implementation Details

#### 1. Path Validation

```typescript
// infrastructure/filesystem/path-validator.ts
import path from 'path';

export function validatePath(userPath: string, basePath: string): string {
  const resolved = path.resolve(basePath, userPath);

  // Ensure resolved path is within base path
  if (!resolved.startsWith(path.resolve(basePath))) {
    throw new SecurityError(
      'Path traversal detected',
      `Path '${userPath}' resolves outside allowed directory`
    );
  }

  return resolved;
}

// Prevent absolute paths from escaping
export function sanitizePath(inputPath: string): string {
  // Remove leading slashes, backslashes, and drive letters
  return inputPath
    .replace(/^[a-zA-Z]:/, '')
    .replace(/^[/\\]+/, '')
    .replace(/\.\./g, '');
}
```

#### 2. Secret Detection

```typescript
// infrastructure/parsers/secret-detector.ts
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{32,}/,           // OpenAI-style API keys
  /ghp_[a-zA-Z0-9]{36}/,           // GitHub personal tokens
  /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i,
  /password["\s]*[:=]["\s]*[^\s"]{8,}/i,
];

export function containsSecrets(content: string): boolean {
  return SECRET_PATTERNS.some(pattern => pattern.test(content));
}

export function redactSecrets(content: string): string {
  let redacted = content;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}
```

#### 3. Input Sanitization

```typescript
// infrastructure/generators/sanitizer.ts
export function sanitizeForMarkdown(content: string): string {
  // Prevent Markdown injection
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

export function sanitizeForMermaid(content: string): string {
  // Prevent Mermaid injection
  return content
    .replace(/[<>{}|]/g, '_')
    .replace(/[\r\n]/g, ' ')
    .substring(0, 50); // Limit label length
}
```

#### 4. Output Directory Validation

```typescript
// application/generate/output-validator.ts
export function validateOutputDirectory(outputPath: string): void {
  const resolvedOutput = path.resolve(outputPath);
  const cwd = process.cwd();

  // Output must be within current working directory or temp
  const allowedBases = [
    cwd,
    path.join(os.homedir(), '.agentscope'),
    os.tmpdir(),
  ];

  const isAllowed = allowedBases.some(base =>
    resolvedOutput.startsWith(base)
  );

  if (!isAllowed) {
    throw new SecurityError(
      'Invalid output directory',
      `Output path must be within project directory`
    );
  }
}
```

#### 5. No Code Execution

```typescript
// Forbidden patterns - never implemented
// - eval()
// - new Function()
// - child_process.exec() with user input
// - require() with dynamic paths
// - vm.runInContext()

// Safe alternative: Parse as data, never execute
export function parseConfig(content: string): object {
  // Use JSON.parse or yaml.load, never eval
  return yaml.load(content, { schema: yaml.CORE_SCHEMA });
}
```

### Threat Model

| Threat | Mitigation | Status |
|--------|------------|--------|
| **Path Traversal** | Validate all paths against base directory | Implemented |
| **Secret Exposure** | Detect and redact secrets from output | Implemented |
| **Code Injection** | Never execute parsed content | By design |
| **Markdown Injection** | Sanitize all user content in output | Implemented |
| **Mermaid Injection** | Sanitize diagram labels | Implemented |
| **Dependency Attack** | Minimal dependencies, lockfile | Policy |
| **Telemetry Leak** | No network access | By design |

### What AgentScope Does NOT Do

| Action | Status | Reason |
|--------|--------|--------|
| Execute scripts | Never | Could run malicious code |
| Make HTTP requests | Never | No network dependency |
| Read outside project | Never | Path validation |
| Write outside output | Never | Output validation |
| Log file contents | Never | Could expose secrets |
| Send telemetry | Never | Privacy by design |

### Dependency Policy

- **Minimal dependencies**: Only well-known, audited packages
- **Lockfile committed**: Reproducible builds
- **Regular audits**: `npm audit` in CI/CD
- **No native modules**: Pure JavaScript for portability

## Consequences

### Positive

- **User trust**: Clear security boundaries build confidence
- **Auditability**: Security model is documented and testable
- **Simplicity**: No network or execution means smaller attack surface
- **Privacy**: No data leaves the user's machine
- **Portability**: Works in air-gapped environments

### Negative

- **Limited features**: Can't fetch remote configs or check for updates
- **Manual updates**: Users must update manually (no auto-update)
- **No analytics**: Can't measure usage to prioritize features

### Neutral

- Security constraints may prevent some future features
- Additional validation code adds maintenance burden

## Options Considered

### Option 1: Minimal Security

Trust user input, minimal validation.

- **Pros**: Simpler implementation
- **Cons**: Vulnerable to injection, path traversal
- **Why rejected**: Unacceptable risk

### Option 2: Strict Sandbox

Run in isolated sandbox (VM, container).

- **Pros**: Strong isolation
- **Cons**: Complex deployment, slow startup, poor UX
- **Why rejected**: Overkill for a documentation tool

### Option 3: Read-Only Model (Chosen)

Explicit security boundaries with no execution.

- **Pros**: Strong security, simple to understand and verify
- **Cons**: Limits some features
- **Why chosen**: Best balance of security and usability

### Option 4: Permission System

Ask user permission for each operation.

- **Pros**: Flexible, user-controlled
- **Cons**: Annoying UX, complex implementation
- **Why rejected**: Unnecessary for read-only tool

## Related Decisions

- [ADR-004](./ADR-004-parser-plugin-architecture.md) - Parser Architecture (parsers follow security model)
- [ADR-007](./ADR-007-error-handling.md) - Error Handling (security errors are fatal)

## References

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [AgentScope PRD v2.0](../../AgentScope-PRD-v2.md) - Section 13: Security Considerations
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
