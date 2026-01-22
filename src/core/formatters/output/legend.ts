/**
 * Output Formatter Domain - Legend Generation
 * Standard symbols and legend table generation for diagrams
 */

import type { LegendEntry } from '../types.js';

/**
 * Standard legend entries for Mermaid diagrams
 */
export const standardLegend: LegendEntry[] = [
  // Agent symbols
  {
    symbol: '🤖',
    meaning: 'Agent (general)',
    category: 'agent',
  },
  {
    symbol: '👑',
    meaning: 'Coordinator Agent',
    category: 'agent',
  },
  {
    symbol: '⚙️',
    meaning: 'Worker Agent',
    category: 'agent',
  },
  {
    symbol: '🎯',
    meaning: 'Specialist Agent',
    category: 'agent',
  },
  {
    symbol: '👁️',
    meaning: 'Reviewer Agent',
    category: 'agent',
  },

  // Server symbols
  {
    symbol: '🖥️',
    meaning: 'MCP Server',
    category: 'server',
  },
  {
    symbol: '🔌',
    meaning: 'stdio Server',
    category: 'server',
  },
  {
    symbol: '🌐',
    meaning: 'HTTP/SSE Server',
    category: 'server',
  },
  {
    symbol: '🔗',
    meaning: 'WebSocket Server',
    category: 'server',
  },

  // Connection symbols
  {
    symbol: '-->',
    meaning: 'Delegates to',
    category: 'connection',
  },
  {
    symbol: '-.->',
    meaning: 'Uses tool from',
    category: 'connection',
  },
  {
    symbol: '==>',
    meaning: 'Requires',
    category: 'connection',
  },
  {
    symbol: '~~>',
    meaning: 'Optional dependency',
    category: 'connection',
  },
];

/**
 * Mermaid-specific legend (no emojis, uses graph nodes)
 */
export const mermaidLegend: LegendEntry[] = [
  // Node shapes
  {
    symbol: '[Agent]',
    meaning: 'Agent (rectangular node)',
    category: 'agent',
  },
  {
    symbol: '(Coordinator)',
    meaning: 'Coordinator (rounded)',
    category: 'agent',
  },
  {
    symbol: '((Specialist))',
    meaning: 'Specialist (circle)',
    category: 'agent',
  },
  {
    symbol: '{Server}',
    meaning: 'MCP Server (diamond)',
    category: 'server',
  },
  {
    symbol: '[(Database)]',
    meaning: 'Data store',
    category: 'other',
  },

  // Connection types
  {
    symbol: '-->',
    meaning: 'Delegation',
    category: 'connection',
  },
  {
    symbol: '-.->',
    meaning: 'Tool usage',
    category: 'connection',
  },
  {
    symbol: '==>',
    meaning: 'Data flow',
    category: 'connection',
  },
  {
    symbol: '-.-',
    meaning: 'Weak dependency',
    category: 'connection',
  },
];

/**
 * Generate legend table in markdown format
 *
 * @param entries - Legend entries to include
 * @param groupByCategory - Whether to group by category
 * @returns Markdown legend table
 *
 * @example
 * ```typescript
 * generateLegendTable(standardLegend)
 * // Returns grouped legend table
 * ```
 */
export function generateLegendTable(
  entries: LegendEntry[],
  groupByCategory = true
): string {
  if (entries.length === 0) {
    return '';
  }

  if (!groupByCategory) {
    // Simple flat table
    const lines: string[] = [
      '| Symbol | Meaning |',
      '|--------|---------|',
    ];

    for (const entry of entries) {
      lines.push(`| ${entry.symbol} | ${entry.meaning} |`);
    }

    return lines.join('\n');
  }

  // Grouped by category
  const grouped = new Map<string, LegendEntry[]>();
  for (const entry of entries) {
    if (!grouped.has(entry.category)) {
      grouped.set(entry.category, []);
    }
    grouped.get(entry.category)!.push(entry);
  }

  const lines: string[] = [];

  for (const [category, categoryEntries] of grouped) {
    lines.push(`**${capitalize(category)}**\n`);
    lines.push('| Symbol | Meaning |');
    lines.push('|--------|---------|');

    for (const entry of categoryEntries) {
      lines.push(`| ${entry.symbol} | ${entry.meaning} |`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate compact legend (single line with separators)
 *
 * @param entries - Legend entries
 * @returns Compact legend string
 *
 * @example
 * ```typescript
 * generateCompactLegend(standardLegend.slice(0, 3))
 * // Returns: "🤖 Agent | 👑 Coordinator | ⚙️ Worker"
 * ```
 */
export function generateCompactLegend(entries: LegendEntry[]): string {
  return entries
    .map(entry => `${entry.symbol} ${entry.meaning}`)
    .join(' | ');
}

/**
 * Filter legend entries by category
 *
 * @param entries - All legend entries
 * @param categories - Categories to include
 * @returns Filtered entries
 */
export function filterLegendByCategory(
  entries: LegendEntry[],
  categories: Array<'agent' | 'server' | 'connection' | 'other'>
): LegendEntry[] {
  return entries.filter(entry => categories.includes(entry.category));
}

/**
 * Get legend for specific diagram type
 *
 * @param diagramType - Type of diagram
 * @returns Appropriate legend entries
 */
export function getLegendForDiagram(
  diagramType: 'component-map' | 'hierarchy' | 'dataflow' | 'mermaid'
): LegendEntry[] {
  switch (diagramType) {
    case 'mermaid':
      return mermaidLegend;
    case 'component-map':
      return filterLegendByCategory(standardLegend, ['agent', 'server', 'connection']);
    case 'hierarchy':
      return filterLegendByCategory(standardLegend, ['agent', 'connection']);
    case 'dataflow':
      return filterLegendByCategory(standardLegend, ['agent', 'connection']);
    default:
      return standardLegend;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
