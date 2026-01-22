# ADR-004: Permission DSL Parser

## Status

**Accepted**

| Field | Value |
|-------|-------|
| Date | 2026-01-22 |
| Author | Architecture Team |
| Schema Version | 2026.01 |
| Related | ADR-003 |

---

## Context

### Problem Statement

Claude Code uses a Domain-Specific Language (DSL) for expressing tool permissions in the format `Tool(argument)`. This pattern appears in the `permissions.allow` and `permissions.deny` arrays within `.claude/settings.json`. The current implementation:

1. **No Pattern Parsing**: Treats permission strings as opaque values
2. **No Validation**: Invalid patterns (e.g., `Tool(` unclosed) pass through silently
3. **No Semantic Understanding**: Cannot distinguish tool names from argument patterns
4. **No Security Analysis**: Cannot identify overly permissive patterns like `Bash(*)`

### Permission DSL Specification

Based on Claude Code's permission system:

```
Pattern       := ToolName "(" ArgumentPattern ")"
ToolName      := Identifier
ArgumentPattern := "*"                    # Wildcard - all arguments
              | GlobPattern              # Glob-style pattern
              | ExactValue               # Exact string match
              | EmptyPattern             # No arguments allowed

Examples:
  Edit(*)                    # Allow Edit tool with any arguments
  Bash(npm *)                # Allow Bash only for npm commands
  Read(/src/**)              # Allow Read only in /src directory tree
  Write(/tmp/*)              # Allow Write only in /tmp directory
  mcp__server__tool(*)       # Allow MCP tool from specific server
```

### Current State

```typescript
// Current naive implementation
interface Permissions {
  allow: string[];  // Raw strings, no parsing
  deny: string[];   // Raw strings, no parsing
}
```

### Requirements

| Requirement | Priority | Rationale |
|-------------|----------|-----------|
| Parse Tool(argument) patterns | High | Core functionality |
| Validate pattern syntax | High | Prevent silent failures |
| Support glob patterns | High | Match Claude Code behavior |
| Identify MCP tool patterns | Medium | `mcp__server__tool` format |
| Security analysis (overly permissive) | Medium | Help users audit permissions |
| Pattern matching for runtime checks | Low | Future: validate tool calls |

---

## Decision

### Overview

Implement a **Permission DSL Parser** that:

1. Parses the `Tool(argument)` syntax into structured objects
2. Validates pattern syntax with clear error messages
3. Supports glob pattern matching for arguments
4. Identifies tool types (builtin, MCP, custom)
5. Provides security analysis for permission sets

### Architecture

```
src/core/parsers/settings/section-parsers/
  permissions.ts              # Main permission parser
  permission-types.ts         # Type definitions
  permission-validator.ts     # Syntax validation
  permission-matcher.ts       # Runtime pattern matching
  permission-analyzer.ts      # Security analysis
```

### Parser Interface

```typescript
interface PermissionParser {
  /**
   * Parse a single permission pattern
   * @throws PermissionParseError if pattern is invalid
   */
  parse(pattern: string): ParsedPermission;

  /**
   * Parse and validate an array of permission patterns
   */
  parseAll(patterns: string[]): ParsedPermission[];

  /**
   * Check if a tool invocation matches a permission pattern
   */
  matches(permission: ParsedPermission, tool: string, argument: string): boolean;
}

interface ParsedPermission {
  /** Original pattern string */
  raw: string;

  /** Extracted tool name */
  tool: string;

  /** Tool type classification */
  toolType: 'builtin' | 'mcp' | 'custom';

  /** Argument pattern */
  argument: ArgumentPattern;

  /** For MCP tools: server and tool name */
  mcpInfo?: {
    server: string;
    tool: string;
  };
}

interface ArgumentPattern {
  type: 'wildcard' | 'glob' | 'exact' | 'empty';
  value: string;
  /** Compiled glob matcher for efficient matching */
  matcher?: (input: string) => boolean;
}
```

### Parsing Grammar

```
permission     = tool_name "(" argument_pattern ")"
tool_name      = builtin_tool | mcp_tool | identifier
builtin_tool   = "Bash" | "Edit" | "Read" | "Write" | "Glob" | "Grep" | ...
mcp_tool       = "mcp__" server_name "__" tool_name
server_name    = identifier
argument_pattern = "*" | glob_chars+ | exact_string | ""
glob_chars     = any character including * and **
```

### Tool Type Detection

```typescript
function classifyTool(toolName: string): ToolClassification {
  // MCP tools: mcp__servername__toolname
  if (toolName.startsWith('mcp__')) {
    const parts = toolName.split('__');
    if (parts.length >= 3) {
      return {
        type: 'mcp',
        server: parts[1],
        tool: parts.slice(2).join('__')
      };
    }
  }

  // Builtin tools
  const BUILTIN_TOOLS = [
    'Bash', 'Edit', 'Read', 'Write', 'Glob', 'Grep',
    'WebFetch', 'WebSearch', 'TodoWrite', 'Task', 'Skill',
    'NotebookEdit'
  ];
  if (BUILTIN_TOOLS.includes(toolName)) {
    return { type: 'builtin' };
  }

  return { type: 'custom' };
}
```

### Security Analysis

```typescript
interface SecurityAnalysis {
  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Specific findings */
  findings: SecurityFinding[];

  /** Recommended changes */
  recommendations: string[];
}

interface SecurityFinding {
  pattern: string;
  issue: string;
  severity: 'info' | 'warning' | 'error';
}

// Example findings
const SECURITY_RULES = [
  {
    pattern: /^Bash\(\*\)$/,
    issue: 'Unrestricted Bash access allows arbitrary command execution',
    severity: 'critical'
  },
  {
    pattern: /^Write\(\*\)$/,
    issue: 'Unrestricted Write access allows modification of any file',
    severity: 'high'
  },
  {
    pattern: /^Read\(\/\*\*\)$/,
    issue: 'Read access to entire filesystem may expose secrets',
    severity: 'medium'
  }
];
```

---

## Consequences

### Positive

1. **Structured Data**: Permissions become queryable objects, not opaque strings
2. **Validation**: Invalid patterns caught with clear error messages
3. **Security Visibility**: Overly permissive patterns identified automatically
4. **MCP Awareness**: MCP tool permissions properly categorized and displayed
5. **Runtime Matching**: Foundation for future permission enforcement

### Negative

1. **Parsing Overhead**: Small performance cost for pattern parsing
2. **Maintenance**: Must stay synchronized with Claude Code permission syntax
3. **Complexity**: Glob pattern matching adds implementation complexity

### Risks

1. **Syntax Changes**: Claude Code may extend permission DSL
   - Mitigation: Forward-compatible parsing, unknown patterns preserved as 'custom'
2. **Glob Edge Cases**: Complex glob patterns may have subtle matching differences
   - Mitigation: Use well-tested glob library (micromatch)

---

## Implementation Notes

### Error Messages

```typescript
class PermissionParseError extends Error {
  constructor(
    public readonly pattern: string,
    public readonly position: number,
    public readonly expected: string
  ) {
    super(`Invalid permission pattern "${pattern}" at position ${position}: expected ${expected}`);
  }
}

// Examples:
// "Edit(" -> "Invalid permission pattern "Edit(" at position 5: expected argument pattern or ')'"
// "Bash" -> "Invalid permission pattern "Bash" at position 4: expected '('"
// "Tool(arg" -> "Invalid permission pattern "Tool(arg" at position 8: expected ')'"
```

### Pattern Matching Implementation

```typescript
import { isMatch } from 'micromatch';

function matchesArgument(pattern: ArgumentPattern, argument: string): boolean {
  switch (pattern.type) {
    case 'wildcard':
      return true;
    case 'empty':
      return argument === '';
    case 'exact':
      return argument === pattern.value;
    case 'glob':
      return isMatch(argument, pattern.value);
  }
}
```

### Caching Compiled Matchers

For frequently checked permissions, compile glob patterns once:

```typescript
const matcherCache = new Map<string, (input: string) => boolean>();

function getCompiledMatcher(pattern: string): (input: string) => boolean {
  if (!matcherCache.has(pattern)) {
    matcherCache.set(pattern, picomatch(pattern));
  }
  return matcherCache.get(pattern)!;
}
```

---

## References

- Schema: 2026.01
- Related: ADR-003 (Settings Scanner)
- Claude Code Documentation: Permission patterns specification
- micromatch: https://github.com/micromatch/micromatch
