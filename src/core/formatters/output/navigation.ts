/**
 * Output Formatter Domain - Navigation Utilities
 * Generate navigation links, category tables, and table of contents
 */

import type { CategorizedAgents, NavigationItem } from '../types.js';
import type { Agent } from '../../model/types.js';

/**
 * Generate navigation links for document header
 *
 * @param prev - Previous page relative path
 * @param next - Next page relative path
 * @returns Markdown navigation links
 *
 * @example
 * ```typescript
 * generateNavLinks('./overview.md', './hierarchy.md')
 * // Returns: "[<- Overview](./overview.md) | [Hierarchy ->](./hierarchy.md)"
 * ```
 */
export function generateNavLinks(prev?: string, next?: string): string {
  const links: string[] = [];

  if (prev) {
    const label = extractFileLabel(prev);
    links.push(`[<- ${label}](${prev})`);
  }

  if (next) {
    const label = extractFileLabel(next);
    links.push(`[${label} ->](${next})`);
  }

  return links.join(' | ');
}

/**
 * Generate category navigation table
 *
 * @param categories - Categorized agents with links
 * @returns Markdown table
 *
 * @example
 * ```typescript
 * generateCategoryTable([
 *   { category: 'Coordinators', count: 5, sectionLink: '#coordinators', detailsLink: './coordinators.md' }
 * ])
 * ```
 */
export function generateCategoryTable(categories: CategorizedAgents[]): string {
  const lines: string[] = [
    '| Category | Agents | Section | Details |',
    '|----------|-------:|---------|---------|',
  ];

  for (const cat of categories) {
    const details = cat.detailsLink ? `[View](${cat.detailsLink})` : '-';
    lines.push(`| ${cat.category} | ${cat.count} | [Jump](${cat.sectionLink}) | ${details} |`);
  }

  return lines.join('\n');
}

/**
 * Generate table of contents from navigation items
 *
 * @param items - Navigation items with hierarchy
 * @returns Markdown table of contents
 *
 * @example
 * ```typescript
 * generateTableOfContents([
 *   { label: 'Overview', anchor: 'overview', level: 0 },
 *   { label: 'Agents', anchor: 'agents', level: 0, children: [...] }
 * ])
 * ```
 */
export function generateTableOfContents(items: NavigationItem[]): string {
  const lines: string[] = [];

  const renderItem = (item: NavigationItem, depth = 0): void => {
    const indent = '  '.repeat(depth);
    lines.push(`${indent}- [${item.label}](#${item.anchor})`);

    if (item.children) {
      for (const child of item.children) {
        renderItem(child, depth + 1);
      }
    }
  };

  for (const item of items) {
    renderItem(item);
  }

  return lines.join('\n');
}

/**
 * Build navigation items from agents grouped by category
 *
 * @param agents - List of agents
 * @returns Hierarchical navigation items
 */
export function buildNavigationFromAgents(agents: Agent[]): NavigationItem[] {
  // Group by type
  const grouped = new Map<string, Agent[]>();
  for (const agent of agents) {
    const type = agent.type ?? 'worker';
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(agent);
  }

  const items: NavigationItem[] = [];

  for (const [type, typeAgents] of grouped) {
    const children: NavigationItem[] = typeAgents.map(agent => ({
      label: agent.name,
      anchor: `agent-${slugify(agent.name)}`,
      level: 1,
    }));

    items.push({
      label: capitalize(type) + 's',
      anchor: `type-${slugify(type)}`,
      level: 0,
      children,
    });
  }

  return items;
}

/**
 * Generate breadcrumb navigation
 *
 * @param path - Current path segments
 * @returns Markdown breadcrumb
 *
 * @example
 * ```typescript
 * generateBreadcrumbs(['Docs', 'Architecture', 'Component Map'])
 * // Returns: "[Docs](./README.md) > [Architecture](./architecture.md) > Component Map"
 * ```
 */
export function generateBreadcrumbs(path: string[]): string {
  const parts: string[] = [];

  for (let i = 0; i < path.length; i++) {
    const segment = path[i];

    if (i === path.length - 1) {
      // Last segment (current page) - no link
      parts.push(segment);
    } else {
      // Intermediate segments - create links
      const link = `./${slugify(segment)}.md`;
      parts.push(`[${segment}](${link})`);
    }
  }

  return parts.join(' > ');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract human-readable label from file path
 */
function extractFileLabel(path: string): string {
  const parts = path.split('/');
  const fileName = parts[parts.length - 1];
  return fileName
    .replace(/\.md$/, '')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert string to URL-safe slug
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
