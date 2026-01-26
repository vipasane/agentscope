# AgentScope v1.2 Implementation Phases

> **Project**: AgentScope v1.2
> **Timeline**: 2-3 weeks
> **Approach**: Atomic tasks with TDD
> **Last Updated**: 2026-01-25

---

## Phase Structure

Each phase includes:
- **Atomic tasks** (<200 lines each)
- **Acceptance criteria** (clear "done" definition)
- **Test requirements** (unit, integration, snapshot)
- **Dependencies** (what must be done first)

---

## Phase 1: Enhanced Documentation Output (Week 1)

### Overview
Generate professional-quality documentation matching `/examples/` style.

### Total Effort: 14-18 hours
### Tasks: 7 atomic tasks

---

### Task 1.1: Quick Stats Section Generator

**File**: `src/core/formatters/output/section-formatters.ts`

**Size**: ~50 lines

**Description**:
Generate Quick Stats table with entity counts (agents, skills, hooks, commands, plugins, MCP servers, permissions).

**Inputs**:
- `AgentScopeConfig` object

**Outputs**:
- Markdown table with 7 entity counts
- Scan metadata (timestamp, duration, file count)

**Acceptance Criteria**:
- [ ] Counts all 7 entity types correctly
- [ ] Formats as markdown table
- [ ] Includes scan metadata
- [ ] Links to detail sections
- [ ] Matches `examples/README-example.md` format

**Tests**:
```typescript
// tests/formatters/section-formatters.test.ts
describe('generateQuickStats', () => {
  it('should count all entity types', () => {
    const config = mockConfig({ agents: 14, skills: 5, ... });
    const stats = generateQuickStats(config);
    expect(stats).toContain('| 🤖 Agents | 14 |');
    expect(stats).toContain('| ⚡ Skills | 5 |');
  });

  it('should include scan metadata', () => {
    const config = mockConfig({ scanDate: '2026-01-25', duration: 1.2 });
    const stats = generateQuickStats(config);
    expect(stats).toContain('**Scanned:** 2026-01-25');
    expect(stats).toContain('**Duration:** 1.2s');
  });
});
```

**Dependencies**: None

**Estimated Time**: 2 hours

---

### Task 1.2: System Overview Diagram Generator

**File**: `src/core/formatters/output/section-formatters.ts`

**Size**: ~80 lines

**Description**:
Generate Mermaid diagram showing agent categories as subgraphs with entity counts.

**Inputs**:
- `AgentScopeConfig` with categorized agents

**Outputs**:
- Mermaid graph TB diagram
- Category subgraphs (GitHub, Security, Development, Testing)
- Entity count annotations
- Connections to MCP, Skills, Hooks, Permissions

**Acceptance Criteria**:
- [ ] Groups agents by category
- [ ] Shows entity counts on each node
- [ ] Includes all 4 entity types (MCP, Skills, Hooks, Permissions)
- [ ] Uses correct classDef styles
- [ ] Renders correctly in GitHub
- [ ] Matches `examples/README-example.md` format

**Tests**:
```typescript
// tests/formatters/section-formatters.test.ts
describe('generateSystemOverviewDiagram', () => {
  it('should create category subgraphs', () => {
    const config = mockConfig({ categories: ['github', 'security'] });
    const diagram = generateSystemOverviewDiagram(config);
    expect(diagram).toContain('subgraph System');
    expect(diagram).toContain('github["🐙 GitHub');
  });

  it('should annotate with entity counts', () => {
    const config = mockConfig({ github: 4, security: 3 });
    const diagram = generateSystemOverviewDiagram(config);
    expect(diagram).toContain('<b>4 agents</b>');
    expect(diagram).toContain('<b>3 agents</b>');
  });

  // Snapshot test
  it('should match example format', () => {
    const config = mockConfig();
    const diagram = generateSystemOverviewDiagram(config);
    expect(diagram).toMatchSnapshot();
  });
});
```

**Dependencies**: Task 2.1 (Category Detection) for category data

**Estimated Time**: 3 hours

---

### Task 1.3: Agents Comparison Table Generator

**File**: `src/core/formatters/output/section-formatters.ts`

**Size**: ~100 lines

**Description**:
Generate dense table with all agents showing category, type, delegations, tools, description.

**Inputs**:
- `Agent[]` array with all agent data

**Outputs**:
- Markdown table with columns: Agent, Cat, Type, Delegates To, Tools, Description
- Icon-based categorization
- Legend for symbols

**Acceptance Criteria**:
- [ ] Includes all agents from config
- [ ] Shows category icon (🐙, 🔒, 💻, 🧪)
- [ ] Shows type icon (👑, 🤖, 🔍, 🎯)
- [ ] Lists delegations (comma-separated)
- [ ] Lists tools (comma-separated or count)
- [ ] Truncates long descriptions
- [ ] Includes legend
- [ ] Matches `examples/README-example.md` format

**Tests**:
```typescript
describe('generateAgentsComparisonTable', () => {
  it('should include all agents', () => {
    const agents = [mockAgent('coder'), mockAgent('reviewer')];
    const table = generateAgentsComparisonTable(agents);
    expect(table).toContain('coder');
    expect(table).toContain('reviewer');
  });

  it('should show category icons', () => {
    const agent = mockAgent({ category: 'github' });
    const table = generateAgentsComparisonTable([agent]);
    expect(table).toContain('🐙');
  });

  it('should show type icons', () => {
    const coordinator = mockAgent({ type: 'coordinator' });
    const worker = mockAgent({ type: 'worker' });
    const table = generateAgentsComparisonTable([coordinator, worker]);
    expect(table).toContain('👑');
    expect(table).toContain('🤖');
  });

  it('should include legend', () => {
    const table = generateAgentsComparisonTable([]);
    expect(table).toContain('**Legend:**');
    expect(table).toContain('👑 Coordinator');
  });
});
```

**Dependencies**: Task 2.1 (Category Detection) for category data

**Estimated Time**: 4 hours

---

### Task 1.4: Capabilities Matrix Generator

**File**: `src/core/formatters/output/section-formatters.ts`

**Size**: ~60 lines

**Description**:
Generate matrix showing agent capabilities (writes code, reviews, tests, deploys, security).

**Inputs**:
- `Agent[]` with capabilities metadata

**Outputs**:
- Markdown table with checkmarks (✓) for capabilities
- Centered columns

**Acceptance Criteria**:
- [ ] Detects capabilities from agent description and tools
- [ ] Shows checkmark (✓) for each capability
- [ ] Empty cell for missing capabilities
- [ ] Centers checkmarks in columns
- [ ] Matches `examples/README-example.md` format

**Capability Detection Logic**:
```typescript
function detectCapabilities(agent: Agent): Capabilities {
  return {
    writesCode: agent.tools.some(t => ['Write', 'Edit', 'MultiEdit'].includes(t)),
    reviews: agent.description.toLowerCase().includes('review'),
    tests: agent.description.toLowerCase().includes('test'),
    deploys: agent.description.toLowerCase().includes('deploy'),
    security: agent.category === 'security' || agent.description.toLowerCase().includes('security')
  };
}
```

**Tests**:
```typescript
describe('generateCapabilitiesMatrix', () => {
  it('should detect code writing capability', () => {
    const agent = mockAgent({ tools: ['Write', 'Edit'] });
    const matrix = generateCapabilitiesMatrix([agent]);
    expect(matrix).toContain('| coder | ✓ |');
  });

  it('should detect review capability', () => {
    const agent = mockAgent({ description: 'Code review agent' });
    const matrix = generateCapabilitiesMatrix([agent]);
    expect(matrix).toContain('| reviewer | | ✓ |');
  });

  it('should show empty cells for missing capabilities', () => {
    const agent = mockAgent({ tools: [] });
    const matrix = generateCapabilitiesMatrix([agent]);
    expect(matrix).toContain('| agent | | | | | |');
  });
});
```

**Dependencies**: None

**Estimated Time**: 2 hours

---

### Task 1.5: Delegation Hierarchy Section Generator

**File**: `src/core/formatters/output/section-formatters.ts`

**Size**: ~70 lines

**Description**:
Generate collapsible section with Mermaid delegation hierarchy diagram.

**Inputs**:
- `Agent[]` with delegation relationships

**Outputs**:
- Collapsible `<details>` section
- Mermaid graph TB diagram showing delegation tree
- Styled nodes (coordinators, workers, reviewers)

**Acceptance Criteria**:
- [ ] Shows only agents with delegations (not standalone)
- [ ] Coordinator nodes styled differently
- [ ] Worker nodes styled differently
- [ ] Arrows show delegation direction
- [ ] Collapsible section renders correctly
- [ ] Matches `examples/README-example.md` format

**Tests**:
```typescript
describe('generateDelegationHierarchy', () => {
  it('should show delegation arrows', () => {
    const planner = mockAgent({ delegatesTo: ['coder', 'tester'] });
    const hierarchy = generateDelegationHierarchy([planner, ...]);
    expect(hierarchy).toContain('planner --> coder');
    expect(hierarchy).toContain('planner --> tester');
  });

  it('should use collapsible section', () => {
    const hierarchy = generateDelegationHierarchy([...]);
    expect(hierarchy).toContain('<details>');
    expect(hierarchy).toContain('<summary>📊 Click to expand hierarchy</summary>');
  });

  it('should apply correct styles', () => {
    const hierarchy = generateDelegationHierarchy([...]);
    expect(hierarchy).toContain('classDef coord');
    expect(hierarchy).toContain('class planner coord');
  });
});
```

**Dependencies**: None

**Estimated Time**: 3 hours

---

### Task 1.6: Component Map Markdown Formatter

**File**: `src/core/formatters/output/component-map-formatter.ts` (NEW)

**Size**: ~120 lines

**Description**:
Generate component-map.md with full system diagram, category navigation, legend, and relationship summary.

**Inputs**:
- `AgentScopeConfig` object
- Generated Mermaid diagram (from existing generator)

**Outputs**:
- Complete component-map.md file
- Category navigation table
- Legend table
- Relationship summary table

**Acceptance Criteria**:
- [ ] Includes full system Mermaid diagram
- [ ] Category navigation with links to category files
- [ ] Legend explaining symbols
- [ ] Relationship summary (delegations, tool usages, skill usages)
- [ ] Back navigation to README.md
- [ ] Matches `examples/component-map-example.md` format

**Tests**:
```typescript
describe('formatComponentMap', () => {
  it('should include system diagram', () => {
    const markdown = formatComponentMap(mockConfig(), mockDiagram());
    expect(markdown).toContain('## Full System Diagram');
    expect(markdown).toContain('```mermaid');
  });

  it('should include category navigation', () => {
    const markdown = formatComponentMap(mockConfig());
    expect(markdown).toContain('## Category Navigation');
    expect(markdown).toContain('[→ categories/github.md]');
  });

  it('should include legend', () => {
    const markdown = formatComponentMap(mockConfig());
    expect(markdown).toContain('## Legend');
    expect(markdown).toContain('👑 | Coordinator');
  });

  it('should match example format', () => {
    const markdown = formatComponentMap(mockConfig());
    expect(markdown).toMatchSnapshot();
  });
});
```

**Dependencies**: Task 2.3 (Category Diagrams) for category links

**Estimated Time**: 4 hours

---

### Task 1.7: Hierarchy Markdown Formatter

**File**: `src/core/formatters/output/hierarchy-formatter.ts` (NEW)

**Size**: ~100 lines

**Description**:
Generate hierarchy.md with delegation tree diagram and supporting tables.

**Inputs**:
- `AgentScopeConfig` object
- Generated Mermaid hierarchy diagram

**Outputs**:
- Complete hierarchy.md file
- Root coordinators table
- Delegation chains table
- Shared workers table
- Standalone agents table
- Depth analysis table

**Acceptance Criteria**:
- [ ] Includes delegation tree Mermaid diagram
- [ ] Root coordinators table (entry points)
- [ ] Delegation chains table (from → to relationships)
- [ ] Shared workers table (agents with multiple parents)
- [ ] Standalone agents table (no delegations)
- [ ] Depth analysis (0=root, 1=worker, standalone)
- [ ] Back navigation to README.md
- [ ] Matches `examples/hierarchy-example.md` format

**Tests**:
```typescript
describe('formatHierarchy', () => {
  it('should identify root coordinators', () => {
    const markdown = formatHierarchy(mockConfig());
    expect(markdown).toContain('## Root Coordinators');
    expect(markdown).toContain('planner | coder, tester');
  });

  it('should identify shared workers', () => {
    const markdown = formatHierarchy(mockConfig());
    expect(markdown).toContain('## Shared Workers');
    expect(markdown).toContain('coder | planner, pr-manager');
  });

  it('should analyze delegation depth', () => {
    const markdown = formatHierarchy(mockConfig());
    expect(markdown).toContain('## Depth Analysis');
    expect(markdown).toContain('0 (Root) | 2 | planner, pr-manager');
  });

  it('should match example format', () => {
    const markdown = formatHierarchy(mockConfig());
    expect(markdown).toMatchSnapshot();
  });
});
```

**Dependencies**: None

**Estimated Time**: 3 hours

---

## Phase 2: Multi-File Diagram Support (Week 2)

### Overview
Enable category-based documentation for large agent systems.

### Total Effort: 16-20 hours
### Tasks: 5 atomic tasks

---

### Task 2.1: Category Extraction from Frontmatter

**File**: `src/core/scanner/claude-code.ts`

**Size**: ~40 lines

**Description**:
Extract `category` field from agent frontmatter during scanning.

**Inputs**:
- Agent markdown file with frontmatter

**Outputs**:
- `Agent` object with `category?: string` field

**Changes**:
```typescript
interface Agent {
  // Existing fields
  name: string;
  description: string;
  // NEW
  category?: string;
}
```

**Acceptance Criteria**:
- [ ] Extracts `category` from frontmatter YAML
- [ ] Category field is optional (undefined if not present)
- [ ] Validates category value (non-empty string)
- [ ] Logs warning if category is invalid

**Tests**:
```typescript
describe('parseAgentFile with category', () => {
  it('should extract category from frontmatter', () => {
    const markdown = `---
name: pr-manager
category: github
description: PR management
---
`;
    const agent = parseAgentFile(markdown);
    expect(agent.category).toBe('github');
  });

  it('should handle missing category', () => {
    const markdown = `---
name: coder
description: Code implementation
---
`;
    const agent = parseAgentFile(markdown);
    expect(agent.category).toBeUndefined();
  });
});
```

**Dependencies**: None

**Estimated Time**: 2 hours

---

### Task 2.2: Auto-Categorization Logic

**File**: `src/core/generators/diagrams/categories.ts` (NEW)

**Size**: ~80 lines

**Description**:
Automatically categorize agents without explicit category based on name and description keywords.

**Inputs**:
- `Agent[]` array (may have undefined categories)

**Outputs**:
- `Agent[]` array with all categories filled in

**Auto-Categorization Rules**:
```typescript
function autoDetectCategory(agent: Agent): string {
  if (agent.category) return agent.category; // Explicit takes precedence

  const name = agent.name.toLowerCase();
  const desc = agent.description.toLowerCase();

  if (matches(name, desc, ['github', 'pr-', 'issue-', 'pull request'])) {
    return 'github';
  }
  if (matches(name, desc, ['security', 'audit', 'pii', 'vulnerability'])) {
    return 'security';
  }
  if (matches(name, desc, ['test', 'review', 'validator', 'validation'])) {
    return 'testing';
  }
  return 'development'; // Default
}
```

**Acceptance Criteria**:
- [ ] Explicit category always takes precedence
- [ ] GitHub category detected from keywords
- [ ] Security category detected from keywords
- [ ] Testing category detected from keywords
- [ ] Default to 'development' category
- [ ] Keyword matching is case-insensitive
- [ ] Returns 4 canonical categories only

**Tests**:
```typescript
describe('autoDetectCategory', () => {
  it('should respect explicit category', () => {
    const agent = mockAgent({ category: 'custom' });
    expect(autoDetectCategory(agent)).toBe('custom');
  });

  it('should detect github category', () => {
    const agent = mockAgent({ name: 'pr-manager' });
    expect(autoDetectCategory(agent)).toBe('github');
  });

  it('should detect security category', () => {
    const agent = mockAgent({ description: 'Security auditing' });
    expect(autoDetectCategory(agent)).toBe('security');
  });

  it('should default to development', () => {
    const agent = mockAgent({ name: 'coder' });
    expect(autoDetectCategory(agent)).toBe('development');
  });
});
```

**Dependencies**: Task 2.1 (Category Extraction)

**Estimated Time**: 3 hours

---

### Task 2.3: Category Diagram Generator

**File**: `src/core/generators/diagrams/categories.ts`

**Size**: ~150 lines

**Description**:
Generate per-category Mermaid diagrams showing agents, delegations, and cross-category dependencies.

**Inputs**:
- `Agent[]` filtered by category
- All agents (for cross-category dependencies)

**Outputs**:
- Mermaid diagram for each category
- Shows agents within category
- Shows delegations within category
- Shows cross-category dependencies (dashed lines)

**Acceptance Criteria**:
- [ ] One diagram per category
- [ ] Agents grouped within category subgraph
- [ ] Delegations shown as solid arrows
- [ ] Cross-category dependencies shown as dashed arrows
- [ ] Coordinators styled differently
- [ ] Workers styled differently
- [ ] Renders correctly in GitHub
- [ ] Matches `examples/categories/github-example.md` format

**Tests**:
```typescript
describe('generateCategoryDiagram', () => {
  it('should group agents by category', () => {
    const agents = [
      mockAgent({ name: 'pr-manager', category: 'github' }),
      mockAgent({ name: 'issue-tracker', category: 'github' })
    ];
    const diagram = generateCategoryDiagram('github', agents);
    expect(diagram).toContain('subgraph GitHub');
    expect(diagram).toContain('pr-manager');
    expect(diagram).toContain('issue-tracker');
  });

  it('should show within-category delegations', () => {
    const agents = [
      mockAgent({ name: 'pr-manager', delegatesTo: ['reviewer'], category: 'github' }),
      mockAgent({ name: 'reviewer', category: 'github' })
    ];
    const diagram = generateCategoryDiagram('github', agents);
    expect(diagram).toContain('pr_manager --> reviewer');
  });

  it('should show cross-category dependencies', () => {
    const githubAgent = mockAgent({ name: 'pr-manager', delegatesTo: ['coder'], category: 'github' });
    const devAgent = mockAgent({ name: 'coder', category: 'development' });
    const diagram = generateCategoryDiagram('github', [githubAgent], [githubAgent, devAgent]);
    expect(diagram).toContain('pr_manager -.-> coder');
  });
});
```

**Dependencies**: Task 2.2 (Auto-Categorization)

**Estimated Time**: 5 hours

---

### Task 2.4: Category Documentation Formatter

**File**: `src/core/formatters/output/category-formatter.ts` (NEW)

**Size**: ~120 lines

**Description**:
Generate complete category markdown file with overview, agents table, capabilities, delegation chains, and cross-category dependencies.

**Inputs**:
- Category name
- `Agent[]` in category
- All agents (for cross-category analysis)
- Category Mermaid diagram

**Outputs**:
- Complete category.md file with:
  - Overview (category, counts)
  - Agents table
  - Category diagram
  - Capabilities matrix
  - Delegation chains table
  - Cross-category dependencies table
  - Skills used table
  - Back navigation

**Acceptance Criteria**:
- [ ] Overview shows category icon, name, counts
- [ ] Agents table includes all category agents
- [ ] Category diagram embedded
- [ ] Capabilities matrix (category-specific)
- [ ] Delegation chains table
- [ ] Cross-category dependencies table
- [ ] Skills used by category agents
- [ ] Back navigation to main README
- [ ] Matches `examples/categories/github-example.md` format

**Tests**:
```typescript
describe('formatCategoryDocument', () => {
  it('should include category overview', () => {
    const markdown = formatCategoryDocument('github', agents);
    expect(markdown).toContain('**Category**: 🐙 GitHub');
    expect(markdown).toContain('**Agent Count**: 4');
  });

  it('should include agents table', () => {
    const markdown = formatCategoryDocument('github', agents);
    expect(markdown).toContain('## Agents in This Category');
    expect(markdown).toContain('pr-manager');
  });

  it('should identify cross-category dependencies', () => {
    const markdown = formatCategoryDocument('github', agents, allAgents);
    expect(markdown).toContain('## Cross-Category Dependencies');
    expect(markdown).toContain('pr-manager | 💻 Development | coder');
  });

  it('should match example format', () => {
    const markdown = formatCategoryDocument('github', agents);
    expect(markdown).toMatchSnapshot();
  });
});
```

**Dependencies**: Task 2.3 (Category Diagrams)

**Estimated Time**: 4 hours

---

### Task 2.5: Category File Output

**File**: `src/core/generators/docs/markdown.ts`

**Size**: ~60 lines

**Description**:
Write category files to `docs/agent-architecture/categories/` directory and update main README with category links.

**Inputs**:
- Category markdown content for each category
- Main README content

**Outputs**:
- Category files written to filesystem
- Main README updated with category links

**Directory Structure**:
```
docs/agent-architecture/
├── README.md (updated with category links)
└── categories/
    ├── github.md
    ├── security.md
    ├── development.md
    └── testing.md
```

**Acceptance Criteria**:
- [ ] Creates `categories/` directory if not exists
- [ ] Writes one file per category
- [ ] Updates main README with "Drill into categories" table
- [ ] Links from README to category files
- [ ] Handles file system errors gracefully

**Tests**:
```typescript
describe('writeCategoryFiles', () => {
  it('should create categories directory', () => {
    writeCategoryFiles(categories, outputDir);
    expect(fs.existsSync(path.join(outputDir, 'categories'))).toBe(true);
  });

  it('should write one file per category', () => {
    writeCategoryFiles(categories, outputDir);
    expect(fs.existsSync(path.join(outputDir, 'categories/github.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'categories/security.md'))).toBe(true);
  });

  it('should update main README with category links', () => {
    const readme = writeCategoryFiles(categories, outputDir);
    expect(readme).toContain('[→ github.md](./categories/github.md)');
  });
});
```

**Dependencies**: Task 2.4 (Category Formatting)

**Estimated Time**: 2 hours

---

## Phase 3: Dataflow Enhancement & Templates (Week 2-3)

### Overview
Improve dataflow diagram and add architectural documentation templates.

### Total Effort: 13-16 hours
### Tasks: 3 atomic tasks

---

### Task 3.1: Data Source and Sink Identification

**File**: `src/core/generators/diagrams/dataflow.ts`

**Size**: ~70 lines

**Description**:
Identify data sources (user, config files, MCP) and data sinks (documentation, diagrams, JSON) for dataflow diagram.

**Inputs**:
- `AgentScopeConfig` object

**Outputs**:
- `DataFlowMetadata` object with sources, transformations, sinks

**Data Flow Metadata**:
```typescript
interface DataFlowMetadata {
  sources: DataSource[];
  transformations: DataTransformation[];
  sinks: DataSink[];
}

interface DataSource {
  id: string;
  name: string;
  type: 'user' | 'config' | 'mcp';
  format: string;
}

interface DataTransformation {
  id: string;
  name: string;
  from: string;
  to: string;
  format: string;
}

interface DataSink {
  id: string;
  name: string;
  format: string;
}
```

**Acceptance Criteria**:
- [ ] Identifies all data sources (User Input, .claude/, .mcp.json, MCP servers)
- [ ] Identifies all transformations (Parse, Validate, Generate)
- [ ] Identifies all data sinks (README.md, *.md diagrams, config.json)
- [ ] Annotates with data formats (JSON, YAML, Markdown, Mermaid)

**Tests**:
```typescript
describe('identifyDataFlow', () => {
  it('should identify data sources', () => {
    const metadata = identifyDataFlow(mockConfig());
    expect(metadata.sources).toContainEqual({
      id: 'config-files',
      name: 'Config Files',
      type: 'config',
      format: 'JSON/YAML'
    });
  });

  it('should identify transformations', () => {
    const metadata = identifyDataFlow(mockConfig());
    expect(metadata.transformations).toContainEqual({
      id: 'parse',
      name: 'Parser',
      from: 'JSON/YAML',
      to: 'TypeScript Types',
      format: 'AgentScopeConfig'
    });
  });

  it('should identify data sinks', () => {
    const metadata = identifyDataFlow(mockConfig());
    expect(metadata.sinks).toContainEqual({
      id: 'docs',
      name: 'Documentation',
      format: 'Markdown'
    });
  });
});
```

**Dependencies**: None

**Estimated Time**: 3 hours

---

### Task 3.2: Enhanced Dataflow Diagram Generation

**File**: `src/core/generators/diagrams/dataflow.ts`

**Size**: ~120 lines

**Description**:
Generate enhanced dataflow Mermaid diagram with data-centric view (sources, transformations, sinks).

**Inputs**:
- `DataFlowMetadata` from Task 3.1

**Outputs**:
- Mermaid graph LR diagram
- Subgraphs for Sources, Transformations, Sinks
- Annotated edges with data formats
- Styled nodes by type

**Acceptance Criteria**:
- [ ] Shows data sources in "Sources" subgraph
- [ ] Shows transformations in "Transformations" subgraph
- [ ] Shows data sinks in "Sinks" subgraph
- [ ] Edges annotated with data formats
- [ ] Different styles for source/transform/sink nodes
- [ ] Renders correctly in GitHub
- [ ] Matches template format

**Tests**:
```typescript
describe('generateEnhancedDataflowDiagram', () => {
  it('should create source/transform/sink subgraphs', () => {
    const diagram = generateEnhancedDataflowDiagram(metadata);
    expect(diagram).toContain('subgraph Sources');
    expect(diagram).toContain('subgraph Transformations');
    expect(diagram).toContain('subgraph Sinks');
  });

  it('should annotate edges with data formats', () => {
    const diagram = generateEnhancedDataflowDiagram(metadata);
    expect(diagram).toContain('Config -->|JSON/YAML| Parse');
    expect(diagram).toContain('Parse -->|TypeScript Types| Validate');
  });

  it('should apply styles by node type', () => {
    const diagram = generateEnhancedDataflowDiagram(metadata);
    expect(diagram).toContain('classDef source');
    expect(diagram).toContain('class User,Config,MCP source');
  });

  it('should match example format', () => {
    const diagram = generateEnhancedDataflowDiagram(metadata);
    expect(diagram).toMatchSnapshot();
  });
});
```

**Dependencies**: Task 3.1 (Data Flow Metadata)

**Estimated Time**: 4 hours

---

### Task 3.3: Dataflow Markdown Formatter

**File**: `src/core/generators/diagrams/dataflow.ts`

**Size**: ~80 lines

**Description**:
Generate complete dataflow.md file with diagram and data format annotations table.

**Inputs**:
- Enhanced dataflow Mermaid diagram
- `DataFlowMetadata` object

**Outputs**:
- Complete dataflow.md file
- Data format annotations table
- Back navigation

**Acceptance Criteria**:
- [ ] Includes dataflow diagram
- [ ] Includes data format annotations table
- [ ] Back navigation to README
- [ ] Matches template format

**Tests**:
```typescript
describe('formatDataflowDocument', () => {
  it('should include dataflow diagram', () => {
    const markdown = formatDataflowDocument(diagram, metadata);
    expect(markdown).toContain('## System Data Flow');
    expect(markdown).toContain('```mermaid');
  });

  it('should include format annotations table', () => {
    const markdown = formatDataflowDocument(diagram, metadata);
    expect(markdown).toContain('## Data Format Annotations');
    expect(markdown).toContain('| Config Files | Parser | JSON/YAML | Parse frontmatter |');
  });

  it('should match example format', () => {
    const markdown = formatDataflowDocument(diagram, metadata);
    expect(markdown).toMatchSnapshot();
  });
});
```

**Dependencies**: Task 3.2 (Dataflow Diagram)

**Estimated Time**: 2 hours

---

### Task 3.4: ADR Index Generator

**File**: `src/core/generators/docs/adr-generator.ts` (NEW)

**Size**: ~80 lines

**Description**:
Scan `/docs/adr/` and `/docs/architecture/decisions/` directories, generate ADR index README.md.

**Inputs**:
- Project root path

**Outputs**:
- ADR index markdown with links to all ADRs
- Categorized ADR list

**Acceptance Criteria**:
- [ ] Scans both ADR directories
- [ ] Parses ADR frontmatter (title, status, date)
- [ ] Categorizes ADRs (Architecture, Output, Quality, Implementation)
- [ ] Generates ADR index table
- [ ] Follows MADR 3.0 format

**Tests**:
```typescript
describe('generateADRIndex', () => {
  it('should scan ADR directories', () => {
    const index = generateADRIndex(projectRoot);
    expect(index.adrs.length).toBeGreaterThan(0);
  });

  it('should parse ADR metadata', () => {
    const index = generateADRIndex(projectRoot);
    expect(index.adrs[0]).toMatchObject({
      number: 'ADR-001',
      title: 'Architecture Style',
      status: 'Accepted',
      date: '2026-01-20'
    });
  });

  it('should categorize ADRs', () => {
    const index = generateADRIndex(projectRoot);
    expect(index.categories).toHaveProperty('Architecture & Design');
  });
});
```

**Dependencies**: None

**Estimated Time**: 3 hours

---

### Task 3.5: CONTEXT.md Generator

**File**: `src/core/generators/docs/context-generator.ts` (NEW)

**Size**: ~100 lines

**Description**:
Generate CONTEXT.md with arc42 sections 1-3 auto-populated from agent data.

**Inputs**:
- `AgentScopeConfig` object

**Outputs**:
- CONTEXT.md with:
  - Section 1: Introduction and Goals (from agent descriptions)
  - Section 2: Constraints (from MCP servers, tools)
  - Section 3: Context and Scope (system boundary diagram)

**Acceptance Criteria**:
- [ ] Section 1 auto-populated from agent descriptions
- [ ] Section 2 auto-populated from MCP/tools
- [ ] Section 3 includes system boundary Mermaid diagram
- [ ] Clearly marks user-filled vs auto-generated sections
- [ ] Follows arc42 format

**Tests**:
```typescript
describe('generateContextMd', () => {
  it('should populate section 1 from agents', () => {
    const context = generateContextMd(mockConfig());
    expect(context).toContain('## 1. Introduction and Goals');
    expect(context).toContain('**Primary Goals**:');
  });

  it('should populate section 2 from MCP', () => {
    const context = generateContextMd(mockConfig());
    expect(context).toContain('## 2. Constraints');
    expect(context).toContain('### Technical Constraints');
  });

  it('should include system boundary diagram', () => {
    const context = generateContextMd(mockConfig());
    expect(context).toContain('## 3. Context and Scope');
    expect(context).toContain('```mermaid');
  });

  it('should match template format', () => {
    const context = generateContextMd(mockConfig());
    expect(context).toMatchSnapshot();
  });
});
```

**Dependencies**: None

**Estimated Time**: 3 hours

---

## Phase 4: Testing, Polish & Release (Week 3)

### Overview
Comprehensive testing, performance optimization, and release preparation.

### Total Effort: 16-20 hours

---

### Task 4.1: Integration Test Suite

**Files**: `tests/integration/` (multiple files)

**Size**: ~200 lines total

**Description**:
End-to-end tests for all v1.2 features (multi-file output, category generation, dataflow, ADR, CONTEXT.md).

**Test Scenarios**:
1. **Multi-file output**: Scan project, verify all files generated
2. **Category detection**: Verify explicit and auto-categorization
3. **Category diagrams**: Verify category-specific diagrams
4. **Dataflow diagram**: Verify enhanced dataflow output
5. **ADR index**: Verify ADR scanning and index generation
6. **CONTEXT.md**: Verify arc42 sections generated

**Acceptance Criteria**:
- [ ] All features tested end-to-end
- [ ] Tests run against real project structure
- [ ] All output files validated
- [ ] Snapshot tests for all generated content

**Estimated Time**: 6 hours

---

### Task 4.2: Regression Test Suite

**Files**: `tests/regression/` (multiple files)

**Size**: ~150 lines total

**Description**:
Verify all v1.1 features continue to work after v1.2 changes.

**Test Scenarios**:
1. **v1.1 README**: Verify README structure unchanged (without categories)
2. **v1.1 scanner**: Verify scanner still works for v1.1 projects
3. **v1.1 permissions**: Verify permission parser unchanged
4. **v1.1 hooks**: Verify hook parser unchanged
5. **v1.1 plugins**: Verify plugin parser unchanged

**Acceptance Criteria**:
- [ ] All v1.1 tests pass
- [ ] No breaking changes to v1.1 output
- [ ] Backward compatibility maintained

**Estimated Time**: 4 hours

---

### Task 4.3: Performance Benchmark Suite

**Files**: `tests/benchmarks/` (NEW)

**Size**: ~100 lines

**Description**:
Benchmark scan performance with various project sizes and verify <3s target for 50 components.

**Benchmark Scenarios**:
1. **Small project** (5 agents): <500ms
2. **Medium project** (25 agents): <1.5s
3. **Large project** (50 agents): <3s
4. **XL project** (100 agents): <6s

**Acceptance Criteria**:
- [ ] Benchmarks run on CI
- [ ] Performance regression alerts
- [ ] Results logged and tracked

**Estimated Time**: 3 hours

---

### Task 4.4: Documentation Review & Updates

**Files**: `README.md`, `CHANGELOG.md`, `/docs/v1.2/`

**Size**: ~200 lines updates

**Description**:
Review and update all documentation for v1.2 release.

**Updates Required**:
1. **Main README**: Add v1.2 features section
2. **CHANGELOG**: Document all v1.2 changes
3. **CLI help**: Update command documentation
4. **Examples**: Ensure all examples updated

**Acceptance Criteria**:
- [ ] All documentation accurate
- [ ] CHANGELOG follows Keep a Changelog format
- [ ] Examples match actual output
- [ ] Links functional

**Estimated Time**: 3 hours

---

### Task 4.5: Release Preparation & npm Publish

**Files**: `package.json`, GitHub release

**Size**: ~50 lines changes

**Description**:
Prepare v1.2.0 release, publish to npm, create GitHub release.

**Steps**:
1. Version bump to 1.2.0
2. Final test run
3. npm publish
4. Create GitHub release with changelog
5. Update documentation site

**Acceptance Criteria**:
- [ ] Version bumped correctly
- [ ] All tests passing on CI
- [ ] npm package published
- [ ] GitHub release created
- [ ] Release notes complete

**Estimated Time**: 2-3 hours

---

## Summary

### Total Effort Estimate

| Phase | Tasks | Hours |
|-------|------:|------:|
| Phase 1: Enhanced Documentation | 7 | 14-18 |
| Phase 2: Multi-File Support | 5 | 16-20 |
| Phase 3: Dataflow & Templates | 5 | 13-16 |
| Phase 4: Testing & Release | 5 | 16-20 |
| **Total** | **22** | **59-74 hours** |

### Timeline

**Optimistic**: 2 weeks (assuming 30-35 hours/week)
**Realistic**: 2.5-3 weeks (accounting for blockers, revisions)

### Critical Path

```
Category Detection (2h) → Auto-Categorization (3h) → Category Diagrams (5h)
  → Category Formatting (4h) → Category File Output (2h)
  → Integration Testing (6h) → Release (3h)
```

**Critical Path Duration**: ~25 hours (minimum 1.5 weeks)

---

*Implementation Phases Version: 1.0 | Created: 2026-01-25 | Coordinated by Strategic Planning Agent*
