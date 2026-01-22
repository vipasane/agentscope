# ADR-007: Error Handling - Fatal/Warning/Info Categorization

## Status

Accepted

## Context

AgentScope scans configuration files that may contain:
- Invalid syntax (malformed JSON/YAML)
- Missing references (agent references non-existent skill)
- Deprecated formats (old config structure)
- Partial data (optional fields not provided)
- Conflicting definitions (same ID defined twice)

We need an error handling strategy that:

1. **Provides actionable feedback** - Users understand what went wrong and how to fix it
2. **Allows graceful degradation** - Partial scans still produce useful output
3. **Distinguishes severity** - Critical errors stop processing, minor issues warn
4. **Supports strict mode** - CI/CD can enforce zero warnings
5. **Is consistent** - Same error type always produces same category

The PRD specifies three error categories: Fatal, Warning, and Info.

## Decision

We will implement a **three-tier error categorization system** (Fatal, Warning, Info) with structured error objects.

### Error Categories

| Category | Behavior | Exit Code | Example |
|----------|----------|-----------|---------|
| **Fatal** | Stop scanning, exit immediately | 1 | Invalid JSON in `.mcp.json` |
| **Warning** | Continue scanning, include in report | 0 | Agent references missing skill |
| **Info** | Continue scanning, optional display | 0 | Deprecated config format detected |

### Error Structure

```typescript
// domain/errors/types.ts
interface ScanError {
  /** Error severity level */
  level: 'fatal' | 'warning' | 'info';

  /** Error code for programmatic handling */
  code: ErrorCode;

  /** Human-readable message */
  message: string;

  /** File where error occurred */
  file: string;

  /** Line number if applicable */
  line?: number;

  /** Suggested fix */
  suggestion?: string;

  /** Link to documentation */
  docsUrl?: string;
}

type ErrorCode =
  // Fatal errors (1xx)
  | 'E101' // Invalid JSON
  | 'E102' // Invalid YAML
  | 'E103' // File not readable
  | 'E104' // Required field missing
  // Warning errors (2xx)
  | 'W201' // Reference not found
  | 'W202' // Duplicate definition
  | 'W203' // Unused component
  | 'W204' // Circular reference
  // Info errors (3xx)
  | 'I301' // Deprecated format
  | 'I302' // Optional field missing
  | 'I303' // Best practice suggestion
```

### Error Classification Rules

#### Fatal Errors (Processing cannot continue)

| Code | Condition | Example |
|------|-----------|---------|
| E101 | JSON parse failure | `{ "invalid": }` |
| E102 | YAML parse failure | `key: value: bad` |
| E103 | File not readable | Permission denied |
| E104 | Required field missing | Agent without name |

#### Warnings (Issue exists but processing can continue)

| Code | Condition | Example |
|------|-----------|---------|
| W201 | Reference not found | Agent uses skill `code-review` not in skills/ |
| W202 | Duplicate definition | Two agents with same ID |
| W203 | Unused component | Skill defined but never referenced |
| W204 | Circular reference | Agent A delegates to B, B delegates to A |

#### Info (Suggestions and notices)

| Code | Condition | Example |
|------|-----------|---------|
| I301 | Deprecated format | Using `allowed_tools` instead of `tools` |
| I302 | Optional field missing | No description for agent |
| I303 | Best practice suggestion | Consider adding tests |

### Error Collection

```typescript
// application/scan/error-collector.ts
class ErrorCollector {
  private errors: ScanError[] = [];
  private hasFatal = false;

  add(error: ScanError): void {
    this.errors.push(error);
    if (error.level === 'fatal') {
      this.hasFatal = true;
    }
  }

  shouldHalt(): boolean {
    return this.hasFatal;
  }

  getAll(): ScanError[] {
    return [...this.errors];
  }

  getByLevel(level: ScanError['level']): ScanError[] {
    return this.errors.filter(e => e.level === level);
  }
}
```

### CLI Output Format

```bash
$ agentscope scan

AgentScope v1.0.0
Scanning: /Users/dev/my-project

Found:
  - 3 agents
  - 5 skills
  - 2 hooks
  - 4 MCP servers

Generated:
  + docs/agent-architecture/README.md
  + docs/agent-architecture/AGENTS.md
  + docs/agent-architecture/raw/agentscope.json

Warnings (2):
  W201 agents/dev-agent.md:12 - References skill 'code-review' not found
        Suggestion: Create .claude/skills/code-review.md or remove reference
  W202 .mcp.json:8 - Server 'github-mcp' has no tools defined
        Suggestion: Add tools array to server definition

Info (1):
  I301 CLAUDE.md:45 - Using deprecated 'allowed_tools' format
        Suggestion: Rename to 'tools' for compatibility with Claude Code v2

Scan completed in 1.2s
```

### Strict Mode

When `--strict` flag is passed:
- Warnings are treated as fatal (exit code 1)
- Useful for CI/CD enforcement

```bash
$ agentscope scan --strict

Error: Scan failed with 2 warnings (strict mode enabled)
```

### JSON Error Output

For programmatic consumption:

```json
{
  "errors": [
    {
      "level": "warning",
      "code": "W201",
      "message": "References skill 'code-review' not found",
      "file": "agents/dev-agent.md",
      "line": 12,
      "suggestion": "Create .claude/skills/code-review.md or remove reference"
    }
  ]
}
```

## Consequences

### Positive

- **Graceful degradation**: Warnings don't block documentation generation
- **Actionable feedback**: Suggestions help users fix issues
- **CI/CD integration**: Strict mode enables quality gates
- **Consistent categorization**: Same issue always has same severity
- **Machine-readable**: JSON output enables tooling integration

### Negative

- **Categorization judgment**: Some edge cases are ambiguous (warning vs info)
- **Message maintenance**: Good error messages require ongoing attention
- **Verbosity**: Info messages may clutter output for experienced users

### Neutral

- Users must learn error codes to understand issues quickly
- Documentation needed to explain each error code

## Options Considered

### Option 1: Binary (Error/Success)

Simple pass/fail with no gradation.

- **Pros**: Simple to implement, clear outcome
- **Cons**: No partial success, overly strict or permissive
- **Why rejected**: Can't handle "issues exist but output is usable"

### Option 2: Two-Tier (Error/Warning)

Error stops, warning continues.

- **Pros**: Simpler than three-tier
- **Cons**: No place for deprecation notices, best practices
- **Why rejected**: Info category adds value for user education

### Option 3: Three-Tier (Chosen)

Fatal, Warning, Info with distinct behaviors.

- **Pros**: Nuanced feedback, graceful degradation, strict mode support
- **Cons**: More complex error handling logic
- **Why chosen**: Best balance of usability and completeness

### Option 4: Numeric Severity

0-10 severity scale.

- **Pros**: Fine-grained control
- **Cons**: Hard to communicate, inconsistent interpretation
- **Why rejected**: Three categories are sufficient and clearer

## Related Decisions

- [ADR-004](./ADR-004-parser-plugin-architecture.md) - Parser Plugin Architecture (parser errors follow this scheme)
- [ADR-006](./ADR-006-test-strategy.md) - Test Strategy (tests verify error categorization)

## References

- [GNU Error Message Guidelines](https://www.gnu.org/prep/standards/html_node/Errors.html)
- [AgentScope PRD v2.0](../../AgentScope-PRD-v2.md) - Section 12: Error Handling
