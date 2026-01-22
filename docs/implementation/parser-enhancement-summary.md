# Enhanced CLAUDE.md Parser Implementation

## Overview

Implemented the enhanced CLAUDE.md parser as specified in SPEC-001, adding comprehensive support for extracting agent definitions from markdown files with heading contexts, bullet lists, delegation relationships, and tool associations.

## Implementation Location

**File**: `/workspaces/agentscope/src/core/parsers/claude-code.ts`

## New Features

### 1. Added Interfaces

```typescript
interface HeadingContext {
  type: Agent['type'];
  level: number;
  startLine: number;
  endLine?: number;
}

interface BulletAgent {
  name: string;
  description: string;
  lineNumber: number;
  indentLevel: number;
}
```

### 2. New Parsing Methods

#### `parseHeadingContexts(content: string): HeadingContext[]`
- Extracts agent type context from markdown headings
- Regex: `/^(#{2,4})\s+(Coordinators?|Orchestrators?|Workers?|Specialists?|Experts?|Reviewers?|Custom)\s*$/i`
- Maps heading text to agent types (coordinator, worker, reviewer, specialist, custom)
- Calculates line ranges for each heading context
- Supports level 2-4 headings

#### `extractDelegatesTo(content: string): Record<string, string[]>`
- Extracts delegation relationships from content
- Pattern: `/Delegates?\s*(?:to)?:\s*([`\w,\s-]+)/i`
- Handles both inline and nested bullet point formats
- Returns map of agent name to array of delegates
- Example: `planner -> [coder, tester, reviewer]`

#### `extractTools(content: string): Record<string, string[]>`
- Extracts tool associations from content
- Pattern: `/Tools?:\s*(.+)/i`
- Handles both inline and nested bullet point formats
- Returns map of agent name to array of tools
- Example: `coder: [github MCP server]`

#### `parseBulletAgents(content: string): BulletAgent[]`
- Extracts agents from bullet lists
- Regex: `/^([\s]*)[-*]\s+(?:`([a-z][\w-]*)`|\*\*([a-z][\w-]*)\*\*)\s*[:\-]\s*(.+)$/i`
- Calculates indent level (2 spaces = 1 level)
- Captures agent name, description, and line number
- Supports both backtick and bold formatting

#### `parseAgentTable(content: string): Partial<Agent>[]`
- Parses multi-column agent tables
- Auto-detects columns: agent/name, type, description, tools, delegates
- Handles both `subagent_type` and `type` column names
- Supports markdown table format with proper header detection
- Falls back gracefully if columns are missing

### 3. Enhanced Main Parser

Updated `parseAgentsFromClaudeMd()` to use all new methods in a multi-step pipeline:

1. **Parse heading contexts** - Understand agent type sections
2. **Extract delegation relationships** - Build delegate map
3. **Extract tool associations** - Build tools map
4. **Parse bullet agents** - Extract from lists with context
5. **Parse tables** - Fallback for table-based definitions
6. **Merge results** - Combine all sources, avoiding duplicates

### 4. Context-Aware Type Inference

Agents are now typed based on their heading context:

```markdown
### Coordinators
- `planner`: Task orchestration agent     # Type: coordinator

### Workers
- `coder`: Implementation specialist      # Type: worker

### Reviewers
- `reviewer`: Code review specialist      # Type: reviewer

### Specialists
- `security-auditor`: Security expert     # Type: specialist
```

## Test Results

All tests pass successfully:

```
✅ planner: ✓ type, ✓ delegates
✅ pr-manager: ✓ type, ✓ delegates
✅ coder: ✓ type, ✓ tools
✅ tester: ✓ type
✅ reviewer: ✓ type
✅ security-auditor: ✓ type
```

### Correctly Parsed

- 6 agents from bullet lists
- 4 heading contexts
- 2 delegation relationships (planner, pr-manager)
- 1 tool association (coder)
- All agent types correctly inferred from context

## Sample Input Format

The parser correctly handles this format:

```markdown
### Coordinators

- `planner`: Task orchestration agent for workflow planning
  - Delegates to: coder, tester, reviewer
  - Use for: Feature implementation, refactoring tasks

### Workers

- `coder`: Implementation specialist for writing code
  - Tools: github MCP server
  - Use for: Code changes, bug fixes
```

## Edge Cases Handled

1. **Nested bullet points** - Delegates and tools on indented lines
2. **Multiple formats** - Both backticks and bold for agent names
3. **Missing data** - Graceful fallback when delegates/tools absent
4. **Duplicate prevention** - Table entries don't duplicate bullet entries
5. **Regex safety** - Null checks prevent crashes on partial matches
6. **Line range calculation** - Heading contexts properly scoped

## Files Created

1. `/workspaces/agentscope/src/core/parsers/claude-code.ts` - Enhanced parser
2. `/workspaces/agentscope/src/tests/test-parser.ts` - Comprehensive test
3. `/workspaces/agentscope/src/tests/test-parser-debug.ts` - Debug test with method-level verification

## Build Status

✅ TypeScript compilation passes without errors
✅ All tests pass
✅ No breaking changes to existing API

## Usage

```typescript
import { ClaudeCodeParser } from './core/parsers/claude-code.js';

const parser = new ClaudeCodeParser('/path/to/project');
const result = await parser.parse();

// result.agents now includes:
// - name, type, description
// - delegatesTo (array of agent names)
// - tools (array of tool names)
// - path (relative to project root)
```

## Next Steps

The enhanced parser is ready for integration with the AgentScope CLI and can be used to:

1. Generate agent relationship diagrams
2. Validate agent configurations
3. Provide IDE autocomplete suggestions
4. Build agent routing recommendations
5. Generate documentation from CLAUDE.md files
