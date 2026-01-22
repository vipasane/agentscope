# Output Formatter Domain

The Output Formatter Domain provides a comprehensive set of utilities for building structured markdown documents with navigation, diagrams, legends, and relationship summaries.

## Architecture

Following **ADR-002 (Domain Design)** and **DDD-001 (Domain Boundaries)**, the formatter domain is organized as:

```
src/core/formatters/
├── types.ts                      # Core interfaces
├── output/
│   ├── document-builder.ts       # Fluent document builder
│   ├── navigation.ts             # Navigation utilities
│   ├── legend.ts                 # Legend generation
│   ├── relationship-summary.ts   # Relationship analysis
│   └── index.ts                  # Module exports
└── index.ts                      # Domain exports
```

## Core Components

### 1. DocumentBuilder

Fluent API for building markdown documents:

```typescript
import { DocumentBuilder } from '@agentscope/core';

const doc = new DocumentBuilder()
  .addNavigation('./overview.md', './details.md')
  .addSection({
    id: 'intro',
    title: 'Introduction',
    content: '## Introduction\n\nContent here.',
    level: 2,
  })
  .addDiagram(mermaidCode, 'System Architecture')
  .addLegend(standardLegend)
  .addTimestamp()
  .build();
```

**Methods:**
- `addNavigation(prev?, next?)` - Add prev/next navigation links
- `addSection(section)` - Add content section
- `addDiagram(mermaid, title?)` - Add Mermaid diagram
- `addTable(headers, rows, title?)` - Add markdown table
- `addLegend(entries)` - Add symbol legend
- `addRelationshipSummary(summary)` - Add relationship statistics
- `addCategoryNavigation(categories)` - Add category navigation table
- `addTableOfContents(items)` - Add hierarchical TOC
- `addTimestamp()` - Add generation timestamp
- `build()` - Generate final markdown

### 2. Navigation Utilities

```typescript
import {
  generateNavLinks,
  generateCategoryTable,
  generateTableOfContents,
  buildNavigationFromAgents,
  generateBreadcrumbs,
} from '@agentscope/core';

// Generate navigation links
const nav = generateNavLinks('./prev.md', './next.md');
// Returns: "[<- Prev](./prev.md) | [Next ->](./next.md)"

// Generate category table
const table = generateCategoryTable([
  { category: 'Coordinators', count: 5, sectionLink: '#coordinators' }
]);

// Build navigation from agents
const navItems = buildNavigationFromAgents(agents);
const toc = generateTableOfContents(navItems);

// Generate breadcrumbs
const crumbs = generateBreadcrumbs(['Docs', 'Architecture', 'Component Map']);
// Returns: "[Docs](./docs.md) > [Architecture](./architecture.md) > Component Map"
```

### 3. Legend Generation

```typescript
import {
  standardLegend,
  mermaidLegend,
  generateLegendTable,
  generateCompactLegend,
  filterLegendByCategory,
  getLegendForDiagram,
} from '@agentscope/core';

// Use standard legend (with emojis)
const legend = generateLegendTable(standardLegend);

// Use Mermaid-specific legend (no emojis)
const mermaidLegendTable = generateLegendTable(mermaidLegend);

// Filter by category
const agentLegend = filterLegendByCategory(standardLegend, ['agent']);

// Get legend for specific diagram type
const legend = getLegendForDiagram('component-map');

// Generate compact single-line legend
const compact = generateCompactLegend(standardLegend);
```

**Standard Legend Symbols:**

**Agents:**
- 🤖 Agent (general)
- 👑 Coordinator Agent
- ⚙️ Worker Agent
- 🎯 Specialist Agent
- 👁️ Reviewer Agent

**Servers:**
- 🖥️ MCP Server
- 🔌 stdio Server
- 🌐 HTTP/SSE Server
- 🔗 WebSocket Server

**Connections:**
- `-->` Delegates to
- `-.->` Uses tool from
- `==>` Requires
- `~~>` Optional dependency

### 4. Relationship Summary

```typescript
import {
  calculateRelationships,
  generateRelationshipTable,
  getDelegationChains,
  generateDelegationChainList,
  getToolUsageByType,
  generateToolUsageSummary,
  findCircularDelegations,
} from '@agentscope/core';

// Calculate relationships from config
const summary = calculateRelationships(config);
console.log(summary.delegations.count); // 12
console.log(summary.delegations.example); // "Coordinator → Worker"

// Generate relationship table
const table = generateRelationshipTable(summary);

// Get delegation chains
const chains = getDelegationChains(config);
// Returns: [['Coordinator', 'Worker', 'Specialist'], ...]

// Generate chain list
const chainList = generateDelegationChainList(chains);

// Analyze tool usage by agent type
const toolUsage = getToolUsageByType(config);
const usageTable = generateToolUsageSummary(config);

// Find circular dependencies
const circular = findCircularDelegations(config);
if (circular.length > 0) {
  console.warn('Circular delegations found:', circular);
}
```

## Type Definitions

### DocumentContext

```typescript
interface DocumentContext {
  config: AgentScopeConfig;
  outputDir: string;
  currentFile: string;
  relatedFiles: Map<string, string>;
}
```

### DocumentSection

```typescript
interface DocumentSection {
  id: string;
  title: string;
  content: string;
  anchor?: string;
  level?: number;
}
```

### LegendEntry

```typescript
interface LegendEntry {
  symbol: string;
  meaning: string;
  category: 'agent' | 'server' | 'connection' | 'other';
}
```

### RelationshipSummary

```typescript
interface RelationshipSummary {
  delegations: { count: number; example: string };
  toolUsages: { count: number; example: string };
  skillUsages: { count: number; example: string };
}
```

### NavigationItem

```typescript
interface NavigationItem {
  label: string;
  anchor: string;
  level: number;
  children?: NavigationItem[];
}
```

### CategorizedAgents

```typescript
interface CategorizedAgents {
  category: string;
  count: number;
  sectionLink: string;
  detailsLink?: string;
}
```

## Usage Examples

See `/src/examples/formatter-usage.ts` for comprehensive examples including:
- Complete document with all features
- Document with relationship summary
- Navigation link generation
- Table building
- Fluent API chaining

Run examples:
```bash
npx tsx src/examples/formatter-usage.ts
```

## Testing

Comprehensive test suite with 76 tests covering:
- DocumentBuilder functionality
- Navigation utilities
- Legend generation
- Relationship analysis
- Edge cases and error handling

Run tests:
```bash
npm test tests/core/formatters/
```

## Design Principles

1. **Fluent API**: DocumentBuilder uses method chaining for intuitive document construction
2. **Type Safety**: Full TypeScript types for all interfaces and functions
3. **Separation of Concerns**: Clear domain boundaries (ADR-002)
4. **Composability**: Small, focused functions that can be combined
5. **GitHub Compatibility**: All markdown uses relative links
6. **Testability**: 100% test coverage with comprehensive test cases

## Integration

The formatter domain integrates with:
- **Model Domain** (`src/core/model/types.ts`) - Uses `AgentScopeConfig`, `Agent`, etc.
- **Generators** (`src/core/generators/`) - Provides formatting for generated diagrams
- **Themes** (`src/core/themes/`) - Legend symbols match diagram themes

## Future Enhancements

Potential future features:
- HTML output format
- PDF generation
- Custom template support
- Internationalization (i18n)
- Interactive navigation trees
- Diagram validation
- Link checking

## License

MIT
