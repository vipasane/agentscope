# SPEC-001: CLAUDE.md Parser Enhancement for Rich Metadata Extraction

**Status:** Draft
**Author:** AgentScope Team
**Created:** 2026-01-22
**Related:** [ADR-001-mermaid-theme-system.md](./ADR-001-mermaid-theme-system.md)

## 1. Summary

This specification defines enhancements to the AgentScope CLAUDE.md parser to extract additional metadata including agent types from markdown structure, `delegatesTo` relationships from prose, and tool associations from inline documentation. The goal is to enable richer example-style output generation.

## 2. Current Parsing Capabilities

### 2.1 Existing Parser Location

- **File:** [../src/core/parsers/claude-code.ts](../src/core/parsers/claude-code.ts)
- **Class:** `ClaudeCodeParser`

### 2.2 Current Extraction Capabilities

| Feature | Status | Method |
|---------|--------|--------|
| Agent names from `.claude/agents/*.md` | Supported | `parseAgentFile()` |
| Agent descriptions from frontmatter | Supported | `parseFrontmatter()` |
| Agent type from frontmatter `type:` | Supported | Explicit frontmatter field |
| Agent type inference from name | Supported | `inferAgentType()` |
| Agents from CLAUDE.md tables | Partial | `parseAgentsFromClaudeMd()` |
| Tools from frontmatter | Supported | `frontmatter.tools` array |
| delegatesTo from frontmatter | Supported | `frontmatter.delegatesTo` array |
| Skills from `.claude/skills/*.md` | Supported | `parseSkillFile()` |
| Hooks from `settings.json` | Supported | `parseHooks()` |
| Commands from `.claude/commands/*.md` | Supported | `parseCommandFile()` |

### 2.3 Current Agent Table Parsing

The current regex for extracting agents from CLAUDE.md tables:

```typescript
const agentTableRegex = /\|\s*`?(\w+)`?\s*\|\s*([^|]+)\s*\|/g;
```

**Limitations:**
- Only captures agent name and description from 2-column tables
- Does not handle multi-column tables with type, tools, or delegates info
- Misses agents defined in markdown headings or bullet lists
- Cannot extract relationships from prose text

### 2.4 Current Type Inference

The `inferAgentType()` method uses simple keyword matching:

```typescript
private inferAgentType(name: string): Agent['type'] {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('coordinator') || nameLower.includes('orchestrator')) {
    return 'coordinator';
  }
  if (nameLower.includes('reviewer') || nameLower.includes('review')) {
    return 'reviewer';
  }
  if (nameLower.includes('specialist') || nameLower.includes('expert')) {
    return 'specialist';
  }
  return 'worker';
}
```

**Limitations:**
- Only matches specific keywords in agent name
- Does not consider markdown context (heading level, section)
- Misses semantic type indicators in descriptions

## 3. Gap Analysis

### 3.1 Missing Extraction Capabilities

| Feature | Gap | Impact |
|---------|-----|--------|
| Agent type from markdown headings | Not extracted | Cannot infer `coordinator` from `### Coordinators` section |
| delegatesTo from "Delegates to:" lines | Not extracted | Misses `- Delegates to: coder, tester` patterns |
| Tool associations from "Tools:" lines | Not extracted | Misses `- Tools: github MCP server` patterns |
| Agent type from section context | Not extracted | Cannot determine type from parent heading |
| Multi-column table parsing | Not implemented | Cannot parse tables with type/tools/delegates columns |
| Bullet list agent definitions | Not extracted | Misses `- \`agent-name\`: description` patterns |

### 3.2 Example of Missing Data

From [../../examples/sample-project/CLAUDE.md](../../examples/sample-project/CLAUDE.md):

```markdown
### Coordinators

- `planner`: Task orchestration agent for workflow planning
  - Delegates to: coder, tester, reviewer
  - Use for: Feature implementation, refactoring tasks

### Workers

- `coder`: Implementation specialist for writing code
  - Tools: github MCP server
```

**Currently Extracted:**
- Name: `planner` (from table regex if in table)
- Description: May be partial or missing

**Missing:**
- Type: `coordinator` (from `### Coordinators` heading)
- delegatesTo: `['coder', 'tester', 'reviewer']` (from "Delegates to:" line)
- Type: `worker` (from `### Workers` heading)
- Tools: `['github MCP server']` (from "Tools:" line)

### 3.3 Impact on Output Generation

Without this metadata, generated diagrams and documentation cannot show:
- Proper agent role categorization
- Delegation relationships between agents
- Tool/capability associations
- Hierarchical organization matching source documentation

## 4. Proposed Extraction Patterns

### 4.1 Agent Type from Markdown Headings

**Pattern Strategy:** Track the current heading context when parsing agent definitions.

**Heading-to-Type Mapping:**

| Heading Pattern | Agent Type |
|-----------------|------------|
| `### Coordinators` | `coordinator` |
| `### Orchestrators` | `coordinator` |
| `### Workers` | `worker` |
| `### Specialists` | `specialist` |
| `### Experts` | `specialist` |
| `### Reviewers` | `reviewer` |
| `### Custom` | `custom` |

**Regex for Heading Detection:**

```typescript
// Match markdown headings (h2-h4) with type keywords
const typeHeadingRegex = /^(#{2,4})\s+(Coordinators?|Orchestrators?|Workers?|Specialists?|Experts?|Reviewers?|Custom)\s*$/gim;
```

**Implementation Approach:**

```typescript
interface HeadingContext {
  type: AgentType;
  level: number;
  startLine: number;
  endLine?: number;
}

function parseHeadingContexts(content: string): HeadingContext[] {
  const contexts: HeadingContext[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const match = line.match(/^(#{2,4})\s+(Coordinators?|Orchestrators?|Workers?|Specialists?|Experts?|Reviewers?|Custom)\s*$/i);
    if (match) {
      // Close previous context at same or higher level
      const level = match[1].length;
      const type = mapHeadingToType(match[2]);
      contexts.push({ type, level, startLine: index });
    }
  });

  // Calculate endLine for each context
  return calculateContextRanges(contexts, lines.length);
}
```

### 4.2 delegatesTo from "Delegates to:" Lines

**Pattern Formats to Support:**

```markdown
- Delegates to: coder, tester, reviewer
- Delegates to: `coder`, `tester`
- **Delegates to:** coder, tester
- Delegates: coder, tester
- Can delegate to: coder, tester
```

**Regex:**

```typescript
// Match "Delegates to:" followed by comma-separated agent names
const delegatesToRegex = /(?:(?:\*\*)?Delegates?\s*(?:to)?(?:\*\*)?:\s*)([`\w,\s-]+)/gi;

// Extract individual agent names from the captured group
const agentListRegex = /`?([a-z][\w-]*)`?/gi;
```

**Implementation:**

```typescript
function extractDelegatesTo(content: string): string[] {
  const delegates: string[] = [];
  const match = content.match(delegatesToRegex);

  if (match) {
    const agentList = match[1];
    let agentMatch;
    while ((agentMatch = agentListRegex.exec(agentList)) !== null) {
      delegates.push(agentMatch[1].toLowerCase());
    }
  }

  return delegates;
}
```

### 4.3 Tool Associations from "Tools:" Lines

**Pattern Formats to Support:**

```markdown
- Tools: github MCP server
- Tools: `Read`, `Write`, `Bash`
- **Tools:** file operations, git
- Available tools: search, edit
- Uses: MCP filesystem, MCP github
```

**Regex:**

```typescript
// Match "Tools:" followed by comma-separated tool names
const toolsRegex = /(?:(?:\*\*)?(Tools?|Uses|Available\s+tools?)(?:\*\*)?:\s*)([^-\n]+)/gi;

// Extract individual tool names
const toolListRegex = /`?([A-Za-z][\w\s-]*[A-Za-z])`?/g;
```

**Implementation:**

```typescript
function extractTools(content: string): string[] {
  const tools: string[] = [];
  const match = content.match(toolsRegex);

  if (match) {
    const toolList = match[2].trim();
    // Split by comma and clean up
    const rawTools = toolList.split(/,\s*/);
    for (const tool of rawTools) {
      const cleaned = tool.replace(/`/g, '').trim();
      if (cleaned && cleaned.length > 0) {
        tools.push(cleaned);
      }
    }
  }

  return tools;
}
```

### 4.4 Bullet List Agent Definitions

**Pattern Formats to Support:**

```markdown
- `planner`: Task orchestration agent
- **planner** - Task orchestration agent
- `planner` - Task orchestration agent for workflow planning
```

**Regex:**

```typescript
// Match bullet point with agent name (backticks or bold) and description
const bulletAgentRegex = /^[-*]\s+(?:`([a-z][\w-]*)`|\*\*([a-z][\w-]*)\*\*)\s*[:\-]\s*(.+)$/gim;
```

**Implementation:**

```typescript
interface BulletAgent {
  name: string;
  description: string;
  lineNumber: number;
  indentLevel: number;
}

function parseBulletAgents(content: string): BulletAgent[] {
  const agents: BulletAgent[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const match = line.match(bulletAgentRegex);
    if (match) {
      const name = match[1] || match[2];
      const description = match[3].trim();
      const indentLevel = line.search(/\S/);

      agents.push({ name, description, lineNumber: index, indentLevel });
    }
  });

  return agents;
}
```

### 4.5 Multi-Column Table Parsing

**Pattern to Support:**

```markdown
| Agent | Type | Description | Tools |
|-------|------|-------------|-------|
| coder | worker | Writes code | github |
| reviewer | reviewer | Reviews PRs | - |
```

**Regex Strategy:**

```typescript
// Detect table header row with common column names
const tableHeaderRegex = /\|\s*(agent|name)\s*\|\s*(type)?\s*\|?\s*(description)?\s*\|?\s*(tools|delegates)?\s*\|/gi;

// Parse table rows after header
const tableRowRegex = /^\|\s*`?([^|`]+)`?\s*\|(.+)\|$/gm;
```

**Implementation:**

```typescript
interface TableColumn {
  name: string;
  index: number;
}

interface ParsedTable {
  columns: TableColumn[];
  rows: string[][];
}

function parseAgentTable(content: string): ParsedTable | null {
  // Find table header
  const headerMatch = content.match(tableHeaderRegex);
  if (!headerMatch) return null;

  // Parse column names and positions
  const columns = parseTableHeader(headerMatch[0]);

  // Parse data rows
  const rows = parseTableRows(content, headerMatch.index);

  return { columns, rows };
}
```

### 4.6 Combined Parsing Strategy

**Algorithm:**

1. Parse all heading contexts to determine type regions
2. Parse all bullet-point agent definitions
3. Parse all table-based agent definitions
4. For each agent found:
   a. Determine type from heading context or explicit column
   b. Extract delegatesTo from nested bullets or table column
   c. Extract tools from nested bullets or table column
5. Merge with frontmatter data (frontmatter takes precedence)

```typescript
interface EnhancedAgentParseResult {
  agent: Agent;
  source: 'frontmatter' | 'heading' | 'table' | 'bullet';
  confidence: number; // 0-1, higher for explicit frontmatter
}

async function parseAgentsFromClaudeMdEnhanced(filePath: string): Promise<EnhancedAgentParseResult[]> {
  const content = await readFile(filePath, 'utf-8');
  const results: EnhancedAgentParseResult[] = [];

  // 1. Parse heading contexts
  const headingContexts = parseHeadingContexts(content);

  // 2. Parse bullet agents
  const bulletAgents = parseBulletAgents(content);
  for (const bullet of bulletAgents) {
    const context = findContextForLine(headingContexts, bullet.lineNumber);
    const nestedContent = extractNestedContent(content, bullet.lineNumber);

    results.push({
      agent: {
        name: bullet.name,
        path: relative(rootPath, filePath),
        description: bullet.description,
        type: context?.type || inferAgentType(bullet.name),
        delegatesTo: extractDelegatesTo(nestedContent),
        tools: extractTools(nestedContent),
      },
      source: 'bullet',
      confidence: context ? 0.8 : 0.5,
    });
  }

  // 3. Parse table agents
  const table = parseAgentTable(content);
  if (table) {
    for (const row of table.rows) {
      results.push({
        agent: extractAgentFromTableRow(row, table.columns),
        source: 'table',
        confidence: 0.7,
      });
    }
  }

  return results;
}
```

## 5. Regex Pattern Summary

### 5.1 Complete Pattern Reference

| Pattern Name | Regex | Purpose |
|--------------|-------|---------|
| `typeHeadingRegex` | `/^(#{2,4})\s+(Coordinators?|Orchestrators?|Workers?|Specialists?|Experts?|Reviewers?|Custom)\s*$/gim` | Extract agent type from section headings |
| `delegatesToRegex` | `/(?:(?:\*\*)?Delegates?\s*(?:to)?(?:\*\*)?:\s*)([`\w,\s-]+)/gi` | Extract delegation relationships |
| `toolsRegex` | `/(?:(?:\*\*)?(Tools?|Uses|Available\s+tools?)(?:\*\*)?:\s*)([^-\n]+)/gi` | Extract tool associations |
| `bulletAgentRegex` | `/^[-*]\s+(?:`([a-z][\w-]*)`|\*\*([a-z][\w-]*)\*\*)\s*[:\-]\s*(.+)$/gim` | Extract agents from bullet lists |
| `tableHeaderRegex` | `/\|\s*(agent|name)\s*\|\s*(type)?\s*\|?\s*(description)?\s*\|?\s*(tools|delegates)?\s*\|/gi` | Detect agent tables |
| `agentListRegex` | `/`?([a-z][\w-]*)`?/gi` | Extract agent names from comma lists |

### 5.2 Pattern Precedence

When multiple patterns match the same agent:

1. **Frontmatter** (highest) - Explicit YAML takes precedence
2. **Table column** - Explicit column data
3. **Nested bullet** - Sub-items under agent definition
4. **Heading context** - Section heading inference
5. **Name inference** (lowest) - Keyword matching in name

## 6. Test Cases

### 6.1 Heading Context Tests

```typescript
describe('parseHeadingContexts', () => {
  it('should extract coordinator type from h3 heading', () => {
    const content = `
### Coordinators

- \`planner\`: Task orchestrator
`;
    const contexts = parseHeadingContexts(content);
    expect(contexts).toEqual([
      { type: 'coordinator', level: 3, startLine: 1, endLine: 4 }
    ]);
  });

  it('should handle multiple heading levels', () => {
    const content = `
## Agents

### Coordinators

- \`planner\`: Plans

### Workers

- \`coder\`: Codes
`;
    const contexts = parseHeadingContexts(content);
    expect(contexts).toHaveLength(2);
    expect(contexts[0].type).toBe('coordinator');
    expect(contexts[1].type).toBe('worker');
  });

  it('should handle singular and plural headings', () => {
    const input = '### Specialist\n### Workers';
    const contexts = parseHeadingContexts(input);
    expect(contexts[0].type).toBe('specialist');
    expect(contexts[1].type).toBe('worker');
  });
});
```

### 6.2 delegatesTo Tests

```typescript
describe('extractDelegatesTo', () => {
  it('should extract from "Delegates to:" format', () => {
    const content = '- Delegates to: coder, tester, reviewer';
    expect(extractDelegatesTo(content)).toEqual(['coder', 'tester', 'reviewer']);
  });

  it('should handle backtick-wrapped names', () => {
    const content = '- Delegates to: `coder`, `tester`';
    expect(extractDelegatesTo(content)).toEqual(['coder', 'tester']);
  });

  it('should handle bold format', () => {
    const content = '**Delegates to:** planner, reviewer';
    expect(extractDelegatesTo(content)).toEqual(['planner', 'reviewer']);
  });

  it('should return empty array when no delegates', () => {
    const content = 'Just some regular text';
    expect(extractDelegatesTo(content)).toEqual([]);
  });

  it('should handle "Delegates:" without "to"', () => {
    const content = '- Delegates: coder';
    expect(extractDelegatesTo(content)).toEqual(['coder']);
  });
});
```

### 6.3 Tool Extraction Tests

```typescript
describe('extractTools', () => {
  it('should extract from "Tools:" format', () => {
    const content = '- Tools: github MCP server';
    expect(extractTools(content)).toEqual(['github MCP server']);
  });

  it('should handle multiple comma-separated tools', () => {
    const content = '- Tools: Read, Write, Bash';
    expect(extractTools(content)).toEqual(['Read', 'Write', 'Bash']);
  });

  it('should handle backtick-wrapped tools', () => {
    const content = '- Tools: `Read`, `Write`';
    expect(extractTools(content)).toEqual(['Read', 'Write']);
  });

  it('should handle "Uses:" variant', () => {
    const content = '- Uses: MCP filesystem';
    expect(extractTools(content)).toEqual(['MCP filesystem']);
  });

  it('should return empty array when no tools', () => {
    const content = 'No tools here';
    expect(extractTools(content)).toEqual([]);
  });
});
```

### 6.4 Bullet Agent Tests

```typescript
describe('parseBulletAgents', () => {
  it('should parse backtick agent with colon separator', () => {
    const content = '- `planner`: Task orchestration agent';
    const agents = parseBulletAgents(content);
    expect(agents).toEqual([{
      name: 'planner',
      description: 'Task orchestration agent',
      lineNumber: 0,
      indentLevel: 0
    }]);
  });

  it('should parse bold agent with dash separator', () => {
    const content = '- **coder** - Implementation specialist';
    const agents = parseBulletAgents(content);
    expect(agents[0].name).toBe('coder');
  });

  it('should capture indent level', () => {
    const content = '  - `nested`: Nested agent';
    const agents = parseBulletAgents(content);
    expect(agents[0].indentLevel).toBe(2);
  });

  it('should handle multiple agents', () => {
    const content = `
- \`planner\`: Plans tasks
- \`coder\`: Writes code
`;
    const agents = parseBulletAgents(content);
    expect(agents).toHaveLength(2);
  });
});
```

### 6.5 Integration Tests

```typescript
describe('parseAgentsFromClaudeMdEnhanced', () => {
  it('should parse sample-project CLAUDE.md correctly', async () => {
    const results = await parseAgentsFromClaudeMdEnhanced(
      '/workspaces/agentscope/examples/sample-project/CLAUDE.md'
    );

    const planner = results.find(r => r.agent.name === 'planner');
    expect(planner).toBeDefined();
    expect(planner?.agent.type).toBe('coordinator');
    expect(planner?.agent.delegatesTo).toEqual(['coder', 'tester', 'reviewer']);

    const coder = results.find(r => r.agent.name === 'coder');
    expect(coder).toBeDefined();
    expect(coder?.agent.type).toBe('worker');
    expect(coder?.agent.tools).toContain('github MCP server');
  });

  it('should merge frontmatter with inline definitions', async () => {
    // Agent defined in both .claude/agents/coder.md (with frontmatter)
    // and referenced in CLAUDE.md - frontmatter should win
    const results = await parseAgentsFromClaudeMdEnhanced(testPath);
    const coder = results.find(r => r.agent.name === 'coder');
    expect(coder?.confidence).toBeGreaterThan(0.8);
  });
});
```

## 7. Backward Compatibility Considerations

### 7.1 Non-Breaking Changes

The following changes will NOT break existing behavior:

- **Additional fields on Agent interface** - Already optional (`tools?`, `delegatesTo?`, `type?`)
- **Enhanced extraction** - Populates previously-empty fields
- **New parsing methods** - Private methods, no API impact

### 7.2 Potential Breaking Changes

| Change | Risk | Mitigation |
|--------|------|------------|
| Agent type inference changes | Low | Only affects `type: undefined` cases; add `--legacy-inference` flag if needed |
| Duplicate agent detection | Medium | May find same agent from multiple sources; implement deduplication with precedence |
| Performance impact | Low | Additional regex passes; benchmark and optimize if needed |

### 7.3 Versioning Strategy

- **Minor version bump** (0.x.0 -> 0.x+1.0) for this enhancement
- **Feature flag** `--enhanced-parsing` for opt-in during beta
- **Deprecation warning** for `--legacy-inference` after 2 minor versions

### 7.4 Migration Path

1. Release with `--enhanced-parsing` flag (off by default)
2. Gather feedback on extraction accuracy
3. Make `--enhanced-parsing` default in next minor version
4. Remove flag in next major version

## 8. Implementation Plan

### 8.1 Phase 1: Core Pattern Extraction

- Implement `parseHeadingContexts()`
- Implement `extractDelegatesTo()`
- Implement `extractTools()`
- Unit tests for all patterns

### 8.2 Phase 2: Bullet List Parsing

- Implement `parseBulletAgents()`
- Integrate with heading contexts
- Handle nested content extraction

### 8.3 Phase 3: Table Enhancement

- Implement multi-column table parsing
- Map columns to agent fields
- Handle various table formats

### 8.4 Phase 4: Integration

- Update `parseAgentsFromClaudeMd()` to use enhanced parsing
- Implement source precedence logic
- Add confidence scoring

### 8.5 Phase 5: Testing and Documentation

- Integration tests with real CLAUDE.md files
- Performance benchmarks
- Update parser documentation

## 9. Success Criteria

1. **Accuracy**: >95% correct type inference from heading context
2. **Coverage**: Extract delegatesTo from >90% of "Delegates to:" patterns
3. **Performance**: <10% increase in parse time for large files
4. **Compatibility**: Zero breaking changes for existing users
5. **Test Coverage**: >90% code coverage for new extraction logic

## 10. References

- [Current Parser Implementation](../src/core/parsers/claude-code.ts)
- [Agent Type Definition](../src/core/model/types.ts)
- [Sample Project CLAUDE.md](../examples/sample-project/CLAUDE.md)
- [Complex CLAUDE.md Example](../CLAUDE.md)
