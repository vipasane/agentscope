/**
 * Output formatter for various formats (table, JSON, YAML)
 */

import type { OutputOptions, TableColumn } from '../types.js';
import { c, displayWidth } from '../utils/colors.js';

export class OutputFormatter {
  constructor(private options: OutputOptions = {}) {
    // Default to color if not explicitly disabled
    if (this.options.color === undefined) {
      this.options.color = true;
    }
  }

  /**
   * Format data as table
   */
  table<T extends Record<string, unknown>>(
    data: T[],
    columns: TableColumn[]
  ): string {
    if (data.length === 0) {
      return this.options.quiet ? '' : c.dim('No data');
    }

    const rows: string[] = [];

    // Calculate column widths
    const widths = columns.map((col) => {
      const headerWidth = col.header.length;
      const maxDataWidth = Math.max(
        ...data.map((row) => {
          const value = this.formatValue(row[col.field], col.format);
          return displayWidth(value);
        })
      );
      return Math.max(headerWidth, maxDataWidth, col.width || 0);
    });

    // Add header
    const header = columns.map((col, i) => {
      const text = col.header.padEnd(widths[i]);
      return this.options.color ? c.bold(text) : text;
    }).join(' │ ');

    rows.push(header);

    // Add separator
    const separator = columns.map((_, i) => '─'.repeat(widths[i])).join('─┼─');
    rows.push(separator);

    // Add data rows
    for (const row of data) {
      const cells = columns.map((col, i) => {
        const value = this.formatValue(row[col.field], col.format);
        return this.alignText(value, widths[i], col.align || 'left');
      });
      rows.push(cells.join(' │ '));
    }

    return rows.join('\n');
  }

  /**
   * Format data as JSON
   */
  json<T>(data: T, pretty = true): string {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Format data as YAML (simple implementation)
   */
  yaml<T>(data: T, indent = 0): string {
    const spaces = '  '.repeat(indent);

    if (data === null || data === undefined) {
      return `${spaces}null`;
    }

    if (typeof data === 'string') {
      // Quote strings with special characters
      if (data.includes(':') || data.includes('\n') || data.includes('#')) {
        return `${spaces}"${data.replace(/"/g, '\\"')}"`;
      }
      return `${spaces}${data}`;
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return `${spaces}${data}`;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `${spaces}[]`;
      }
      return data.map((item) => `${spaces}- ${this.yaml(item, indent + 1).trim()}`).join('\n');
    }

    if (typeof data === 'object') {
      const entries = Object.entries(data as Record<string, unknown>);
      if (entries.length === 0) {
        return `${spaces}{}`;
      }
      return entries
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return `${spaces}${key}:\n${this.yaml(value, indent + 1)}`;
          }
          return `${spaces}${key}: ${this.yaml(value, 0).trim()}`;
        })
        .join('\n');
    }

    return `${spaces}${String(data)}`;
  }

  /**
   * Format data based on options
   */
  format<T>(data: T, columns?: TableColumn[]): string {
    if (this.options.quiet && !this.options.format) {
      return '';
    }

    const format = this.options.format || 'text';

    switch (format) {
      case 'json':
        return this.json(data);
      case 'yaml':
        return this.yaml(data);
      case 'table':
        if (Array.isArray(data) && columns) {
          return this.table(data as Record<string, unknown>[], columns);
        }
        return this.json(data);
      case 'text':
      default:
        if (Array.isArray(data) && columns) {
          return this.table(data as Record<string, unknown>[], columns);
        }
        return typeof data === 'string' ? data : this.json(data);
    }
  }

  /**
   * Format a value using a custom formatter
   */
  private formatValue(value: unknown, formatter?: (value: unknown) => string): string {
    if (formatter) {
      return formatter(value);
    }

    if (value === null || value === undefined) {
      return c.dim('-');
    }

    if (typeof value === 'boolean') {
      return value ? c.green('✓') : c.red('✗');
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  }

  /**
   * Align text within a column
   */
  private alignText(text: string, width: number, align: 'left' | 'right' | 'center'): string {
    const textWidth = displayWidth(text);
    const padding = width - textWidth;

    if (padding <= 0) {
      return text;
    }

    switch (align) {
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center': {
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
      }
      case 'left':
      default:
        return text + ' '.repeat(padding);
    }
  }

  /**
   * Create a box around text
   */
  box(text: string, title?: string): string {
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map((line) => displayWidth(line)));
    const width = maxWidth + 2;

    const top = title
      ? `┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐`
      : `┌${'─'.repeat(width)}┐`;

    const bottom = `└${'─'.repeat(width)}┘`;

    const body = lines.map((line) => {
      const padding = ' '.repeat(maxWidth - displayWidth(line));
      return `│ ${line}${padding} │`;
    });

    return [top, ...body, bottom].join('\n');
  }

  /**
   * Create a list
   */
  list(items: string[], bullet = '•'): string {
    return items.map((item) => `  ${c.dim(bullet)} ${item}`).join('\n');
  }

  /**
   * Create a tree structure
   */
  tree(
    data: Array<{ label: string; children?: Array<{ label: string }> }>,
    prefix = ''
  ): string {
    const lines: string[] = [];

    data.forEach((item, index) => {
      const isLast = index === data.length - 1;
      const connector = isLast ? '└─' : '├─';
      lines.push(`${prefix}${connector} ${item.label}`);

      if (item.children && item.children.length > 0) {
        const childPrefix = prefix + (isLast ? '  ' : '│ ');
        item.children.forEach((child, childIndex) => {
          const childIsLast = childIndex === item.children!.length - 1;
          const childConnector = childIsLast ? '└─' : '├─';
          lines.push(`${childPrefix}${childConnector} ${child.label}`);
        });
      }
    });

    return lines.join('\n');
  }
}
