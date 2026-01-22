# ADR-006: Hook Configuration Parser

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

Claude Code's hook system allows users to execute custom commands at specific lifecycle events (PreToolUse, PostToolUse, Stop, Notification). These hooks are powerful but complex, with multiple configuration options for matching, timeout handling, and command execution. Current AgentScope parsing does not extract or validate hook configurations.

### Hook Configuration Format

Based on Claude Code's hook system (2026.01 schema):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Pre-Bash hook'",
            "timeout": 5000
          }
        ]
      },
      {
        "matcher": "Edit(**/src/**)",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/lint-check.sh $FILE",
            "timeout": 10000,
            "onError": "warn"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Tool completed: $TOOL'",
            "timeout": 1000
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/cleanup.sh"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude' '$MESSAGE'"
          }
        ]
      }
    ]
  }
}
```

### Hook Lifecycle Events

| Event | Trigger | Available Variables |
|-------|---------|---------------------|
| `PreToolUse` | Before tool execution | `$TOOL`, `$ARGS`, `$FILE` (if applicable) |
| `PostToolUse` | After tool execution | `$TOOL`, `$ARGS`, `$RESULT`, `$DURATION` |
| `Stop` | When Claude stops | `$REASON`, `$SESSION_ID` |
| `Notification` | On notifications | `$MESSAGE`, `$TYPE`, `$PRIORITY` |

### Matcher Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `ToolName` | Exact tool match | `Bash`, `Edit`, `Read` |
| `ToolName(glob)` | Tool with argument glob | `Edit(**/src/**)` |
| `*` | Wildcard - all tools | `*` |
| `mcp__server__*` | MCP server tools | `mcp__github__*` |

---

## Decision

### Overview

Implement a **Hook Configuration Parser** that:

1. Parses all hook lifecycle events (PreToolUse, PostToolUse, Stop, Notification)
2. Validates matcher patterns using the Permission DSL parser (ADR-004)
3. Validates hook commands for security issues
4. Enforces timeout constraints
5. Documents hook execution flow

### Architecture

```
src/core/parsers/settings/section-parsers/
  hooks.ts                    # Main hook parser
  hook-types.ts               # Type definitions
  hook-validator.ts           # Validation logic
  hook-command-analyzer.ts    # Command security analysis
```

### Parser Interface

```typescript
interface HookParser {
  /**
   * Parse all hooks from settings
   */
  parse(hooks: RawHooksConfig): ParsedHooks;

  /**
   * Validate hook configuration
   */
  validate(hooks: ParsedHooks): ValidationResult;

  /**
   * Analyze hooks for security issues
   */
  analyzeSecuity(hooks: ParsedHooks): SecurityAnalysis;
}

interface ParsedHooks {
  /** Pre-tool execution hooks */
  preToolUse: ParsedHookGroup[];

  /** Post-tool execution hooks */
  postToolUse: ParsedHookGroup[];

  /** Stop event hooks */
  stop: ParsedHookGroup[];

  /** Notification hooks */
  notification: ParsedHookGroup[];

  /** Total hook count */
  totalCount: number;

  /** Validation warnings */
  warnings: HookWarning[];
}

interface ParsedHookGroup {
  /** Matcher pattern (parsed) */
  matcher: ParsedMatcher;

  /** Individual hooks in this group */
  hooks: ParsedHook[];

  /** Source location for error reporting */
  source: SourceLocation;
}

interface ParsedMatcher {
  /** Raw matcher string */
  raw: string;

  /** Matcher type */
  type: 'exact' | 'glob' | 'wildcard';

  /** Extracted tool name (if applicable) */
  tool?: string;

  /** Argument pattern (if applicable) */
  argumentPattern?: string;

  /** Compiled matcher function */
  matches: (tool: string, args?: string) => boolean;
}

interface ParsedHook {
  /** Hook type */
  type: 'command';

  /** Command to execute */
  command: string;

  /** Parsed command information */
  commandInfo: CommandInfo;

  /** Timeout in milliseconds */
  timeout: number;

  /** Error handling strategy */
  onError: 'fail' | 'warn' | 'ignore';
}

interface CommandInfo {
  /** Executable being invoked */
  executable: string;

  /** Whether command uses shell */
  usesShell: boolean;

  /** Variables referenced in command */
  variables: string[];

  /** Potential security concerns */
  securityFlags: SecurityFlag[];
}
```

### Timeout Enforcement

```typescript
interface TimeoutConstraints {
  /** Minimum timeout allowed (ms) */
  min: 100;

  /** Maximum timeout allowed (ms) */
  max: 300000; // 5 minutes

  /** Default timeout if not specified (ms) */
  default: 10000; // 10 seconds

  /** Warning threshold - hooks above this get flagged (ms) */
  warningThreshold: 30000; // 30 seconds
}

function validateTimeout(timeout: number | undefined): {
  value: number;
  warning?: string;
} {
  const value = timeout ?? TimeoutConstraints.default;

  if (value < TimeoutConstraints.min) {
    return {
      value: TimeoutConstraints.min,
      warning: `Timeout ${value}ms below minimum, using ${TimeoutConstraints.min}ms`
    };
  }

  if (value > TimeoutConstraints.max) {
    return {
      value: TimeoutConstraints.max,
      warning: `Timeout ${value}ms exceeds maximum, using ${TimeoutConstraints.max}ms`
    };
  }

  if (value > TimeoutConstraints.warningThreshold) {
    return {
      value,
      warning: `Long timeout ${value}ms may impact responsiveness`
    };
  }

  return { value };
}
```

### Command Security Analysis

```typescript
interface SecurityFlag {
  type: 'info' | 'warning' | 'error';
  code: string;
  message: string;
}

const SECURITY_PATTERNS = [
  {
    pattern: /\$\([^)]+\)/,
    code: 'COMMAND_SUBSTITUTION',
    type: 'warning',
    message: 'Command contains command substitution which may be a security risk'
  },
  {
    pattern: /`[^`]+`/,
    code: 'BACKTICK_SUBSTITUTION',
    type: 'warning',
    message: 'Command contains backtick substitution which may be a security risk'
  },
  {
    pattern: /;\s*rm\s/,
    code: 'DESTRUCTIVE_COMMAND',
    type: 'error',
    message: 'Command contains potentially destructive rm operation'
  },
  {
    pattern: />\s*\/dev\/null\s*2>&1/,
    code: 'SILENT_ERRORS',
    type: 'info',
    message: 'Command suppresses all output including errors'
  },
  {
    pattern: /curl.*\|\s*(?:bash|sh)/,
    code: 'PIPE_TO_SHELL',
    type: 'error',
    message: 'Piping remote content to shell is a security risk'
  }
];

function analyzeCommand(command: string): SecurityFlag[] {
  return SECURITY_PATTERNS
    .filter(p => p.pattern.test(command))
    .map(p => ({
      type: p.type,
      code: p.code,
      message: p.message
    }));
}
```

---

## Consequences

### Positive

1. **Visibility**: All hooks documented with their execution conditions
2. **Validation**: Invalid configurations caught with clear error messages
3. **Security Analysis**: Potentially dangerous commands flagged
4. **Timeout Enforcement**: Runaway hooks prevented with enforced limits
5. **Lifecycle Documentation**: Clear understanding of when hooks execute

### Negative

1. **Complexity**: Hook system has many configuration options
2. **Command Analysis Limits**: Cannot fully analyze shell command safety
3. **Variable Expansion**: Cannot validate variable references statically

### Risks

1. **Shell Injection**: Commands with user-controlled variables may be vulnerable
   - Mitigation: Flag commands with variable interpolation, recommend escaping
2. **Timeout Gaming**: Hooks may spawn background processes to bypass timeout
   - Mitigation: Document limitation, recommend process group termination
3. **New Event Types**: Claude Code may add new lifecycle events
   - Mitigation: Forward-compatible parsing preserves unknown events

---

## Implementation Notes

### Variable Extraction

```typescript
function extractVariables(command: string): string[] {
  const variables: string[] = [];

  // Match $VAR and ${VAR} patterns
  const patterns = [
    /\$([A-Z_][A-Z0-9_]*)/g,
    /\$\{([A-Z_][A-Z0-9_]*)\}/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(command)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
  }

  return variables;
}

// Known hook variables by event type
const KNOWN_VARIABLES: Record<string, string[]> = {
  PreToolUse: ['TOOL', 'ARGS', 'FILE'],
  PostToolUse: ['TOOL', 'ARGS', 'RESULT', 'DURATION'],
  Stop: ['REASON', 'SESSION_ID'],
  Notification: ['MESSAGE', 'TYPE', 'PRIORITY']
};
```

### Matcher Compilation

```typescript
import { isMatch } from 'micromatch';

function compileMatcher(pattern: string): (tool: string, args?: string) => boolean {
  // Wildcard matches everything
  if (pattern === '*') {
    return () => true;
  }

  // Tool with argument pattern: Edit(**/src/**)
  const toolArgMatch = pattern.match(/^([^(]+)\((.+)\)$/);
  if (toolArgMatch) {
    const [, tool, argPattern] = toolArgMatch;
    return (t: string, args?: string) =>
      t === tool && (args ? isMatch(args, argPattern) : false);
  }

  // Exact tool match
  return (tool: string) => tool === pattern;
}
```

### Error Handling Strategies

```typescript
type ErrorStrategy = 'fail' | 'warn' | 'ignore';

interface ErrorStrategyBehavior {
  /** Should hook failure stop tool execution? */
  stopsExecution: boolean;

  /** Should failure be logged? */
  logged: boolean;

  /** Should user be notified? */
  notifyUser: boolean;
}

const ERROR_STRATEGIES: Record<ErrorStrategy, ErrorStrategyBehavior> = {
  fail: { stopsExecution: true, logged: true, notifyUser: true },
  warn: { stopsExecution: false, logged: true, notifyUser: true },
  ignore: { stopsExecution: false, logged: false, notifyUser: false }
};
```

---

## References

- Schema: 2026.01
- Related: ADR-003 (Settings Scanner), ADR-004 (Permission Parser)
- Claude Code Documentation: Hook system specification
- micromatch: https://github.com/micromatch/micromatch
