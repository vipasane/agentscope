/**
 * Document Builder - Fluent API for Markdown Document Generation
 *
 * Provides a fluent builder pattern for creating structured, navigable markdown documents
 * with sections, diagrams, tables, legends, and metadata.
 *
 * ## Features
 *
 * - **Fluent API**: Chainable methods for document construction
 * - **Section Management**: Organize content with hierarchical sections
 * - **Diagram Integration**: Embed Mermaid diagrams with titles
 * - **Table Generation**: Create markdown tables with headers and rows
 * - **Navigation**: Add prev/next links for multi-document navigation
 * - **Legend Support**: Generate symbol legend tables by category
 * - **Table of Contents**: Auto-generate TOC with anchors
 * - **Timestamp Footers**: Optional generation timestamp
 *
 * ## Usage Pattern
 *
 * 1. Create builder instance with options
 * 2. Chain add methods to build document structure
 * 3. Call build() to generate final markdown
 * 4. Optionally save or further process the output
 *
 * @module formatters/output/document-builder
 * @see {@link DocumentSection} for section structure
 * @see {@link DocumentBuilderOptions} for configuration options
 *
 * @example
 * ```typescript
 * import { DocumentBuilder } from './formatters/output/document-builder.js';
 *
 * // Create a comprehensive documentation page
 * const markdown = new DocumentBuilder({
 *   includeNavigation: true,
 *   includeTimestamp: true
 * })
 *   .addNavigation('./overview.md', './implementation.md')
 *   .addSection({
 *     id: 'intro',
 *     title: 'Introduction',
 *     content: 'This document describes...',
 *     level: 2
 *   })
 *   .addDiagram(componentMapDiagram, 'Component Architecture')
 *   .addTable(
 *     ['Component', 'Type', 'Status'],
 *     [
 *       ['Parser', 'Core', '✅ Complete'],
 *       ['Generator', 'Core', '⏳ In Progress']
 *     ],
 *     'Component Status'
 *   )
 *   .addLegend([
 *     { category: 'status', symbol: '✅', meaning: 'Complete' },
 *     { category: 'status', symbol: '⏳', meaning: 'In Progress' }
 *   ])
 *   .addTimestamp()
 *   .build();
 * ```
 */

import type { DocumentSection, NavigationItem, LegendEntry, RelationshipSummary, DocumentBuilderOptions } from '../types.js';

/**
 * Fluent builder for creating structured markdown documents
 *
 * Provides a chainable API for building markdown documents with:
 * - Navigation headers (prev/next links)
 * - Content sections with hierarchical titles
 * - Embedded Mermaid diagrams
 * - Markdown tables with formatted data
 * - Legend tables grouped by category
 * - Relationship summaries
 * - Category navigation
 * - Table of contents with nested items
 * - Timestamp footers
 *
 * @class DocumentBuilder
 *
 * @example
 * ```typescript
 * // Basic document with section and diagram
 * const doc = new DocumentBuilder()
 *   .addSection({ id: 'intro', title: 'Introduction', content: 'Welcome', level: 2 })
 *   .addDiagram(mermaidCode, 'System Architecture')
 *   .build();
 *
 * // Document with navigation and timestamp
 * const navDoc = new DocumentBuilder({ includeTimestamp: true })
 *   .addNavigation('./prev.md', './next.md')
 *   .addSection({ id: 'content', title: 'Content', content: '...', level: 2 })
 *   .addTimestamp()
 *   .build();
 *
 * // Document with table of contents
 * const tocDoc = new DocumentBuilder()
 *   .addTableOfContents([
 *     { label: 'Overview', anchor: 'overview' },
 *     { label: 'Details', anchor: 'details', children: [
 *       { label: 'Implementation', anchor: 'implementation' }
 *     ]}
 *   ])
 *   .addSection({ id: 'overview', title: 'Overview', content: '...', level: 2 })
 *   .build();
 * ```
 */
export class DocumentBuilder {
  private sections: DocumentSection[] = [];
  private navigation?: { prev?: string; next?: string };
  private timestamp = false;
  private options: DocumentBuilderOptions;

  /**
   * Create a new document builder
   *
   * @param {DocumentBuilderOptions} [options={}] - Builder configuration options
   * @param {boolean} [options.includeNavigation=true] - Include navigation links
   * @param {boolean} [options.includeTimestamp=true] - Include generation timestamp
   *
   * @example
   * ```typescript
   * // Default options (navigation and timestamp enabled)
   * const builder1 = new DocumentBuilder();
   *
   * // Custom options
   * const builder2 = new DocumentBuilder({
   *   includeNavigation: false,
   *   includeTimestamp: true
   * });
   * ```
   */
  constructor(options: DocumentBuilderOptions = {}) {
    this.options = {
      includeNavigation: true,
      includeTimestamp: true,
      ...options,
    };
  }

  /**
   * Add navigation links (prev/next) to the document header
   *
   * Creates a header section with links to previous and next documents,
   * useful for multi-page documentation navigation.
   *
   * @param {string} [prev] - Path to previous document
   * @param {string} [next] - Path to next document
   * @returns {this} Builder instance for chaining
   *
   * @example
   * ```typescript
   * builder
   *   .addNavigation('./introduction.md', './implementation.md')
   *   // Renders: [<- Introduction](./introduction.md) | [Implementation ->](./implementation.md)
   *
   * builder.addNavigation(undefined, './next.md')
   *   // Renders: [Next ->](./next.md)
   * ```
   */
  addNavigation(prev?: string, next?: string): this {
    if (this.options.includeNavigation !== false) {
      this.navigation = { prev, next };
    }
    return this;
  }

  /**
   * Add a content section to the document
   *
   * Sections are the primary content building blocks. Each section has:
   * - Unique ID for anchoring
   * - Title for headings
   * - Markdown content
   * - Level for heading hierarchy (2-6)
   *
   * @param {DocumentSection} section - Section configuration
   * @param {string} section.id - Unique section identifier (for anchors)
   * @param {string} section.title - Section title (used for heading)
   * @param {string} section.content - Markdown content
   * @param {number} [section.level=2] - Heading level (2-6)
   * @returns {this} Builder instance for chaining
   *
   * @example
   * ```typescript
   * builder
   *   .addSection({
   *     id: 'overview',
   *     title: 'System Overview',
   *     content: 'The system consists of three main components...',
   *     level: 2
   *   })
   *   .addSection({
   *     id: 'implementation',
   *     title: 'Implementation Details',
   *     content: '### Architecture\n\nThe architecture follows...',
   *     level: 2
   *   });
   * ```
   */
  addSection(section: DocumentSection): this {
    this.sections.push(section);
    return this;
  }

  /**
   * Add a Mermaid diagram section
   *
   * Wraps Mermaid diagram code in a markdown code block with optional title.
   * The diagram is automatically added as a section with appropriate formatting.
   *
   * @param {string} mermaid - Mermaid diagram code (without code fence)
   * @param {string} [title] - Optional diagram title (appears as heading)
   * @returns {this} Builder instance for chaining
   *
   * @example
   * ```typescript
   * // Diagram with title
   * builder.addDiagram(`
   *   graph TB
   *     A[Parser] --> B[Generator]
   *     B --> C[Formatter]
   * `, 'Data Flow');
   *
   * // Diagram without title
   * builder.addDiagram(`
   *   classDiagram
   *     class Agent {
   *       +name: string
   *       +type: AgentType
   *     }
   * `);
   * ```
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
   *
   * Creates a formatted markdown table with headers, separator row, and data rows.
   * Automatically handles alignment and formatting.
   *
   * @param {string[]} headers - Table column headers
   * @param {string[][]} rows - Table data rows (each row is an array of cell values)
   * @param {string} [title] - Optional table title (appears as heading)
   * @returns {this} Builder instance for chaining
   *
   * @example
   * ```typescript
   * builder.addTable(
   *   ['Component', 'Type', 'Status'],
   *   [
   *     ['Parser', 'Core', '✅ Complete'],
   *     ['Generator', 'Core', '⏳ In Progress'],
   *     ['Formatter', 'Core', '📋 Planned']
   *   ],
   *   'Implementation Status'
   * );
   * // Renders:
   * // ### Implementation Status
   * //
   * // | Component | Type | Status |
   * // |-----------|------|--------|
   * // | Parser | Core | ✅ Complete |
   * // | Generator | Core | ⏳ In Progress |
   * // | Formatter | Core | 📋 Planned |
   * ```
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
   *
   * Enables the generation timestamp footer. When enabled, the final document
   * will include a footer with the generation date and time in ISO format.
   *
   * @returns {this} Builder instance for chaining
   *
   * @example
   * ```typescript
   * builder.addTimestamp();
   * // Adds footer: *Generated by AgentScope on 2026-01-26T12:00:00.000Z*
   * ```
   */
  addTimestamp(): this {
    if (this.options.includeTimestamp !== false) {
      this.timestamp = true;
    }
    return this;
  }

  /**
   * Build the final markdown document
   *
   * Assembles all added sections, navigation, and metadata into a complete
   * markdown document. Sections are joined with appropriate separators,
   * navigation is added at the top, and timestamp is added at the bottom.
   *
   * @returns {string} Complete markdown document
   *
   * @example
   * ```typescript
   * const markdown = new DocumentBuilder()
   *   .addNavigation('./prev.md', './next.md')
   *   .addSection({
   *     id: 'intro',
   *     title: 'Introduction',
   *     content: 'Welcome to the documentation',
   *     level: 2
   *   })
   *   .addDiagram(mermaidCode, 'Architecture')
   *   .addTimestamp()
   *   .build();
   *
   * // Save to file
   * await writeFile('docs/output.md', markdown);
   *
   * // Or use in further processing
   * console.log(markdown);
   * ```
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
