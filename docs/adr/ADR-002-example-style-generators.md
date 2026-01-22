# ADR-002: Enhanced Diagram Generators with Example-Style Output

## Status

**Proposed**

## Date

2026-01-22

## Context

### Current State

AgentScope's diagram generators (`component-map.ts`, `hierarchy.ts`, `dataflow.ts`) currently produce basic Mermaid diagrams with:

- Raw Mermaid code blocks
- Timestamp footers
- No navigation structure
- No supplementary tables or metadata

### Desired State

Hand-crafted examples in `/examples/` demonstrate a richer output format:

1. **Navigation links** - Inter-document navigation (Back/Forward links)
2. **Category tables** - Tabular navigation to diagram sections and detail pages
3. **Legends** - Symbol definitions for icons, line styles, and colors
4. **Relationship summaries** - Aggregated counts of delegations, tool usage, skill connections
5. **Comparison tables** - Dense agent listings with capabilities matrices

### Problem Statement

The gap between current generator output and the example documents creates:

1. **Manual work** - Users must hand-edit generated files to match desired format
2. **Inconsistency** - Generated and hand-crafted documents drift apart
3. **Missing navigation** - No cross-references between related diagrams
4. **No metadata** - Relationship counts and summaries require manual calculation

### Requirements

| Requirement | Priority | Source |
|-------------|----------|--------|
| Navigation links between related documents | High | `component-map-example.md` line 3 |
| Category navigation table | High | `component-map-example.md` lines 87-93 |
| Legend table with symbol definitions | High | `component-map-example.md` lines 98-108 |
| Relationship summary table | Medium | `component-map-example.md` lines 113-118 |
| Hierarchy tables (root, chains, shared) | Medium | `hierarchy-example.md` lines 51-84 |
| Quick stats header | Medium | `README-example.md` lines 7-11 |
| GitHub-compatible relative links only | High | No JavaScript dependencies |

## Decision

Implement an **Output Formatter Domain** that wraps existing diagram generators to produce example-style documents. This preserves the current generator architecture while adding a composable formatting layer.

### Architecture

```
src/core/
  formatters/                    # New bounded context
    output/
      document-builder.ts        # Composes sections into full documents
      navigation.ts              # Generates nav links and tables
      legend.ts                  # Generates legend tables
      relationship-summary.ts    # Aggregates and summarizes relationships
      index.ts                   # Public exports
    types.ts                     # Formatter types and interfaces
    index.ts                     # Domain entry point
  generators/
    diagrams/                    # Existing (unchanged)
      component-map.ts
      hierarchy.ts
      dataflow.ts
```

### Bounded Contexts

#### 1. Generator Domain (Existing)

**Responsibility**: Produce raw Mermaid diagram strings.

**Interfaces**:
- `generateComponentMap(config, options): string`
- `generateHierarchy(config, options): string`
- `generateDataflow(config, options): string`

**No changes required** - generators continue to produce diagram content.

#### 2. Parser Domain (Existing)

**Responsibility**: Extract configuration from Claude Code and MCP files.

**Interfaces**:
- `parseClaudeCode(rootPath): ParseResult`
- `parseMcp(rootPath): ParseResult`

**No changes required** - parsers continue to provide configuration data.

#### 3. Theme Domain (Existing)

**Responsibility**: Provide color palettes and Mermaid styling.

**Interfaces**:
- `ThemeRegistry.getTheme(name): ThemePalette`
- `MermaidThemeGenerator.getClassDefs(): string[]`

**No changes required** - themes continue to provide visual styling.

#### 4. Output Formatter Domain (New)

**Responsibility**: Transform generator output into rich, navigable documents.

**Key Interfaces**:

```typescript
interface DocumentContext {
  config: AgentScopeConfig;
  outputDir: string;
  currentFile: string;
  relatedFiles: Map<string, string>;  // name -> relative path
}

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  anchor?: string;
}

interface DocumentBuilder {
  addNavigation(prev?: string, next?: string): this;
  addSection(section: DocumentSection): this;
  addDiagram(mermaid: string, title?: string): this;
  addTable(headers: string[], rows: string[][]): this;
  addLegend(entries: LegendEntry[]): this;
  addRelationshipSummary(relationships: RelationshipSummary): this;
  build(): string;
}
```

### Integration Points

```
                    +-----------------+
                    |  scan()         |
                    |  (entry point)  |
                    +--------+--------+
                             |
                             v
          +------------------+------------------+
          |                                     |
          v                                     v
  +-------+--------+                  +--------+--------+
  | Parser Domain  |                  | Theme Domain    |
  | - claude-code  |                  | - palettes      |
  | - mcp          |                  | - generator     |
  +-------+--------+                  +--------+--------+
          |                                     |
          v                                     v
  +-------+---------------------------------------+
  |              AgentScopeConfig                 |
  +-------+---------------------------------------+
          |
          v
  +-------+--------+
  | Generator      |
  | Domain         |
  | - component-map|
  | - hierarchy    |
  | - dataflow     |
  +-------+--------+
          |
          | (Mermaid strings)
          v
  +-------+--------+
  | Output         |
  | Formatter      |
  | Domain (NEW)   |
  | - document-    |
  |   builder      |
  | - navigation   |
  | - legend       |
  | - summary      |
  +-------+--------+
          |
          | (Rich markdown documents)
          v
  +-------+--------+
  |  writeOutputs()|
  +----------------+
```

### Document Structure Specification

Each generated document follows this structure:

```markdown
# {Title}

[Navigation Links]

---

## {Main Content Section}

{Mermaid Diagram}

---

## Category Navigation

| Category | Agents | Diagram Section | Details |
|----------|-------:|-----------------|---------|
...

---

## Legend

| Symbol | Meaning |
|--------|---------|
...

---

## Relationship Summary

| Relationship Type | Count | Example |
|-------------------|------:|---------|
...

---

[Footer Navigation]
```

### Navigation Link Rules

All links MUST be:

1. **Relative paths** - No absolute URLs
2. **GitHub compatible** - Work in GitHub markdown preview
3. **Anchor-aware** - Support `#section-name` references
4. **Bidirectional** - Each link has a corresponding back-link

**Navigation Pattern**:

```markdown
[<- Back to Overview](./README.md) | [Hierarchy ->](./hierarchy.md)
```

**Category Table Pattern**:

```markdown
| Category | Agents | Diagram Section | Details |
|----------|-------:|-----------------|---------|
| {emoji} {name} | {count} | [-> {id}](#{anchor}) | [-> {file}](./{path}) |
```

### Legend Generation Rules

Legend entries are derived from:

1. **Agent types** - Coordinator, Worker, Reviewer, Specialist icons
2. **Server states** - Enabled/Disabled indicators
3. **Line styles** - Solid (delegation), Dashed (tool/skill usage)

```typescript
interface LegendEntry {
  symbol: string;
  meaning: string;
  category: 'agent' | 'server' | 'connection';
}

const standardLegend: LegendEntry[] = [
  { symbol: 'crown', meaning: 'Coordinator (orchestrates other agents)', category: 'agent' },
  { symbol: 'robot', meaning: 'Worker (executes tasks)', category: 'agent' },
  { symbol: 'magnifier', meaning: 'Reviewer (validates work)', category: 'agent' },
  { symbol: 'target', meaning: 'Specialist (domain expert)', category: 'agent' },
  { symbol: 'green-circle', meaning: 'Enabled MCP server', category: 'server' },
  { symbol: 'red-circle', meaning: 'Disabled MCP server', category: 'server' },
  { symbol: 'arrow', meaning: 'Delegation (solid line)', category: 'connection' },
  { symbol: 'dashed-arrow', meaning: 'Tool/Skill usage (dashed line)', category: 'connection' },
];
```

### Relationship Summary Calculation

```typescript
interface RelationshipSummary {
  delegations: { count: number; example: string };
  toolUsages: { count: number; example: string };
  skillUsages: { count: number; example: string };
}

function calculateRelationships(config: AgentScopeConfig): RelationshipSummary {
  // Count all delegatesTo relationships
  // Count all tool connections
  // Count all skill connections
  // Return with example of each type
}
```

## Consequences

### Positive

1. **Consistent output** - Generated documents match hand-crafted examples
2. **No manual editing** - Full documents generated automatically
3. **Navigation included** - Cross-references built into output
4. **Extensible** - New section types can be added without changing generators
5. **Backwards compatible** - Existing generator API unchanged
6. **Separation of concerns** - Formatting logic isolated from diagram generation

### Negative

1. **Increased complexity** - New domain adds code to maintain
2. **More dependencies** - Formatters depend on generators
3. **Larger output** - Documents include more sections than before
4. **Testing burden** - Need tests for formatter domain

### Neutral

1. **File count increase** - More files in `/src/core/formatters/`
2. **Output size increase** - Documents include navigation, legend, summary tables
3. **API surface growth** - New public interfaces for formatting

## Implementation Approach

### Phase 1: Foundation (Core Types)

1. Create `/src/core/formatters/` directory structure
2. Define `DocumentContext`, `DocumentSection`, `DocumentBuilder` interfaces
3. Implement base `DocumentBuilder` class

### Phase 2: Section Generators

1. Implement `NavigationGenerator` - prev/next links, category tables
2. Implement `LegendGenerator` - symbol tables from theme
3. Implement `RelationshipSummaryGenerator` - aggregation logic

### Phase 3: Integration

1. Create `ExampleStyleFormatter` that composes all section generators
2. Update `/src/core/index.ts` to export new formatter
3. Modify `generate()` function to use formatter when `exampleStyle: true`

### Phase 4: Document Templates

1. Create templates for each document type:
   - `component-map-template.ts`
   - `hierarchy-template.ts`
   - `readme-template.ts`
   - `category-template.ts`

### File Changes Summary

| Path | Action | Description |
|------|--------|-------------|
| `src/core/formatters/types.ts` | Create | Formatter interfaces and types |
| `src/core/formatters/output/document-builder.ts` | Create | Base document composition |
| `src/core/formatters/output/navigation.ts` | Create | Navigation link generation |
| `src/core/formatters/output/legend.ts` | Create | Legend table generation |
| `src/core/formatters/output/relationship-summary.ts` | Create | Relationship aggregation |
| `src/core/formatters/output/index.ts` | Create | Output subdomain exports |
| `src/core/formatters/index.ts` | Create | Formatter domain exports |
| `src/core/index.ts` | Modify | Add formatter exports |
| `src/core/model/types.ts` | Modify | Add formatter option types |

## Related Decisions

- [ADR-001: Mermaid Theme System](./ADR-001-mermaid-theme-system.md) - Provides styling foundation
- Theme system integration ensures consistent visual styling across formatted documents

## References

- [Target format: component-map-example.md](../../examples/component-map-example.md)
- [Target format: hierarchy-example.md](../../examples/hierarchy-example.md)
- [Target format: README-example.md](../../examples/README-example.md)
- [Current generator: component-map.ts](../../src/core/generators/diagrams/component-map.ts)
- [Current generator: hierarchy.ts](../../src/core/generators/diagrams/hierarchy.ts)
- [Core exports: index.ts](../../src/core/index.ts)
