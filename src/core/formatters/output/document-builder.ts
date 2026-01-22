/**
 * Output Formatter Domain - Document Builder
 * Fluent API for building markdown documents with sections, diagrams, and navigation
 */

import type { DocumentSection, NavigationItem, LegendEntry, RelationshipSummary, DocumentBuilderOptions } from '../types.js';

/**
 * Fluent builder for creating structured markdown documents
 *
 * @example
 * ```typescript
 * const doc = new DocumentBuilder()
 *   .addNavigation('./overview.md', './hierarchy.md')
 *   .addSection({ id: 'intro', title: 'Introduction', content: '...' })
 *   .addDiagram(mermaidCode, 'System Architecture')
 *   .addTimestamp()
 *   .build();
 * ```
 */
export class DocumentBuilder {
  private sections: DocumentSection[] = [];
  private navigation?: { prev?: string; next?: string };
  private timestamp = false;
  private options: DocumentBuilderOptions;

  constructor(options: DocumentBuilderOptions = {}) {
    this.options = {
      includeNavigation: true,
      includeTimestamp: true,
      ...options,
    };
  }

  /**
   * Add navigation links (prev/next) to the document header
   */
  addNavigation(prev?: string, next?: string): this {
    if (this.options.includeNavigation !== false) {
      this.navigation = { prev, next };
    }
    return this;
  }

  /**
   * Add a content section to the document
   */
  addSection(section: DocumentSection): this {
    this.sections.push(section);
    return this;
  }

  /**
   * Add a Mermaid diagram section
   */
  addDiagram(mermaid: string, title?: string): this {
    const content = [
      title ? `### ${title}\n` : '',
      '```mermaid',
      mermaid.trim(),
      '```',
    ].filter(Boolean).join('\n');

    this.sections.push({
      id: `diagram-${this.sections.length}`,
      title: title ?? 'Diagram',
      content,
      level: title ? 3 : 2,
    });

    return this;
  }

  /**
   * Add a markdown table
   */
  addTable(headers: string[], rows: string[][], title?: string): this {
    const lines: string[] = [];

    if (title) {
      lines.push(`### ${title}\n`);
    }

    // Headers
    lines.push('| ' + headers.join(' | ') + ' |');

    // Separator
    lines.push('|' + headers.map(() => '-------').join('|') + '|');

    // Rows
    for (const row of rows) {
      lines.push('| ' + row.join(' | ') + ' |');
    }

    this.sections.push({
      id: `table-${this.sections.length}`,
      title: title ?? 'Table',
      content: lines.join('\n'),
      level: title ? 3 : 2,
    });

    return this;
  }

  /**
   * Add a legend table for diagram symbols
   */
  addLegend(entries: LegendEntry[]): this {
    // Group by category
    const grouped = new Map<string, LegendEntry[]>();
    for (const entry of entries) {
      const category = entry.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(entry);
    }

    const lines: string[] = ['### Legend\n'];

    for (const [category, categoryEntries] of grouped) {
      lines.push(`**${this.capitalize(category)}**\n`);
      lines.push('| Symbol | Meaning |');
      lines.push('|--------|---------|');

      for (const entry of categoryEntries) {
        lines.push(`| ${entry.symbol} | ${entry.meaning} |`);
      }

      lines.push('');
    }

    this.sections.push({
      id: 'legend',
      title: 'Legend',
      content: lines.join('\n'),
      level: 2,
    });

    return this;
  }

  /**
   * Add a relationship summary section
   */
  addRelationshipSummary(relationships: RelationshipSummary): this {
    const lines: string[] = [
      '### Relationship Summary\n',
      '| Type | Count | Example |',
      '|------|------:|---------|',
      `| Delegations | ${relationships.delegations.count} | ${relationships.delegations.example} |`,
      `| Tool Usages | ${relationships.toolUsages.count} | ${relationships.toolUsages.example} |`,
      `| Skill Usages | ${relationships.skillUsages.count} | ${relationships.skillUsages.example} |`,
    ];

    this.sections.push({
      id: 'relationships',
      title: 'Relationship Summary',
      content: lines.join('\n'),
      level: 2,
    });

    return this;
  }

  /**
   * Add a category navigation table
   */
  addCategoryNavigation(categories: Array<{ category: string; count: number; sectionLink: string; detailsLink?: string }>): this {
    const lines: string[] = [
      '### Category Navigation\n',
      '| Category | Agents | Section | Details |',
      '|----------|-------:|---------|---------|',
    ];

    for (const cat of categories) {
      const details = cat.detailsLink ? `[View](${cat.detailsLink})` : '-';
      lines.push(`| ${cat.category} | ${cat.count} | [Jump](${cat.sectionLink}) | ${details} |`);
    }

    this.sections.push({
      id: 'category-nav',
      title: 'Category Navigation',
      content: lines.join('\n'),
      level: 2,
    });

    return this;
  }

  /**
   * Add a table of contents
   */
  addTableOfContents(items: NavigationItem[]): this {
    const lines: string[] = ['## Table of Contents\n'];

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

    this.sections.push({
      id: 'toc',
      title: 'Table of Contents',
      content: lines.join('\n'),
      level: 2,
    });

    return this;
  }

  /**
   * Add timestamp footer
   */
  addTimestamp(): this {
    if (this.options.includeTimestamp !== false) {
      this.timestamp = true;
    }
    return this;
  }

  /**
   * Build the final markdown document
   */
  build(): string {
    const parts: string[] = [];

    // Navigation header
    if (this.navigation) {
      const { prev, next } = this.navigation;
      const navLinks: string[] = [];

      if (prev) {
        const prevLabel = this.extractFileName(prev);
        navLinks.push(`[<- ${prevLabel}](${prev})`);
      }

      if (next) {
        const nextLabel = this.extractFileName(next);
        navLinks.push(`[${nextLabel} ->](${next})`);
      }

      if (navLinks.length > 0) {
        parts.push(navLinks.join(' | '));
        parts.push('');
        parts.push('---');
        parts.push('');
      }
    }

    // Sections
    for (const section of this.sections) {
      parts.push(section.content);
      parts.push('');

      // Add separator between major sections
      if (section.level === 2) {
        parts.push('---');
        parts.push('');
      }
    }

    // Timestamp footer
    if (this.timestamp) {
      const now = new Date().toISOString();
      parts.push('---');
      parts.push(`*Generated by AgentScope on ${now}*`);
    }

    const result = parts.join('\n').trim();
    return result ? result + '\n' : '';
  }

  /**
   * Helper: Extract file name from path for navigation labels
   */
  private extractFileName(path: string): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    return fileName
      .replace(/\.md$/, '')
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Helper: Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
