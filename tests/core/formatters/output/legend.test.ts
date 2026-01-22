/**
 * Tests for Legend Generation
 */

import { describe, it, expect } from 'vitest';
import {
  standardLegend,
  mermaidLegend,
  generateLegendTable,
  generateCompactLegend,
  filterLegendByCategory,
  getLegendForDiagram,
} from '../../../../src/core/formatters/output/legend.js';
import type { LegendEntry } from '../../../../src/core/formatters/types.js';

describe('Legend Generation', () => {
  describe('standardLegend', () => {
    it('should have all required categories', () => {
      const categories = new Set(standardLegend.map(e => e.category));

      expect(categories.has('agent')).toBe(true);
      expect(categories.has('server')).toBe(true);
      expect(categories.has('connection')).toBe(true);
    });

    it('should have agent symbols', () => {
      const agentSymbols = standardLegend
        .filter(e => e.category === 'agent')
        .map(e => e.symbol);

      expect(agentSymbols).toContain('🤖');
      expect(agentSymbols).toContain('👑');
      expect(agentSymbols).toContain('⚙️');
    });

    it('should have connection symbols', () => {
      const connections = standardLegend
        .filter(e => e.category === 'connection')
        .map(e => e.symbol);

      expect(connections).toContain('-->');
      expect(connections).toContain('-.->');
      expect(connections).toContain('==>');
    });
  });

  describe('mermaidLegend', () => {
    it('should have node shape entries', () => {
      const nodeShapes = mermaidLegend.filter(e => e.category === 'agent');

      expect(nodeShapes.length).toBeGreaterThan(0);
      expect(nodeShapes.some(e => e.symbol.includes('['))).toBe(true);
    });

    it('should not use emojis', () => {
      const hasEmojis = mermaidLegend.some(e => /[\u{1F300}-\u{1F9FF}]/u.test(e.symbol));

      expect(hasEmojis).toBe(false);
    });
  });

  describe('generateLegendTable', () => {
    it('should generate grouped legend table', () => {
      const entries: LegendEntry[] = [
        { symbol: '🤖', meaning: 'Agent', category: 'agent' },
        { symbol: '👑', meaning: 'Coordinator', category: 'agent' },
        { symbol: '🖥️', meaning: 'Server', category: 'server' },
      ];

      const table = generateLegendTable(entries, true);

      expect(table).toContain('**Agent**');
      expect(table).toContain('| 🤖 | Agent |');
      expect(table).toContain('| 👑 | Coordinator |');
      expect(table).toContain('**Server**');
      expect(table).toContain('| 🖥️ | Server |');
    });

    it('should generate flat legend table', () => {
      const entries: LegendEntry[] = [
        { symbol: 'A', meaning: 'First', category: 'agent' },
        { symbol: 'B', meaning: 'Second', category: 'server' },
      ];

      const table = generateLegendTable(entries, false);

      expect(table).toContain('| Symbol | Meaning |');
      expect(table).toContain('| A | First |');
      expect(table).toContain('| B | Second |');
      expect(table).not.toContain('**Agent**');
      expect(table).not.toContain('**Server**');
    });

    it('should handle empty entries', () => {
      const table = generateLegendTable([]);

      expect(table).toBe('');
    });

    it('should group multiple entries per category', () => {
      const entries: LegendEntry[] = [
        { symbol: 'A1', meaning: 'First', category: 'agent' },
        { symbol: 'A2', meaning: 'Second', category: 'agent' },
        { symbol: 'A3', meaning: 'Third', category: 'agent' },
      ];

      const table = generateLegendTable(entries, true);

      expect(table).toContain('**Agent**');
      expect((table.match(/\| A\d \|/g) || []).length).toBe(3);
    });
  });

  describe('generateCompactLegend', () => {
    it('should generate compact single-line legend', () => {
      const entries: LegendEntry[] = [
        { symbol: '🤖', meaning: 'Agent', category: 'agent' },
        { symbol: '👑', meaning: 'Coordinator', category: 'agent' },
        { symbol: '🖥️', meaning: 'Server', category: 'server' },
      ];

      const compact = generateCompactLegend(entries);

      expect(compact).toBe('🤖 Agent | 👑 Coordinator | 🖥️ Server');
    });

    it('should handle single entry', () => {
      const entries: LegendEntry[] = [
        { symbol: 'X', meaning: 'Test', category: 'other' },
      ];

      const compact = generateCompactLegend(entries);

      expect(compact).toBe('X Test');
    });

    it('should handle empty entries', () => {
      const compact = generateCompactLegend([]);

      expect(compact).toBe('');
    });
  });

  describe('filterLegendByCategory', () => {
    it('should filter by single category', () => {
      const entries: LegendEntry[] = [
        { symbol: 'A', meaning: 'Agent', category: 'agent' },
        { symbol: 'S', meaning: 'Server', category: 'server' },
        { symbol: 'C', meaning: 'Connection', category: 'connection' },
      ];

      const filtered = filterLegendByCategory(entries, ['agent']);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].symbol).toBe('A');
    });

    it('should filter by multiple categories', () => {
      const entries: LegendEntry[] = [
        { symbol: 'A', meaning: 'Agent', category: 'agent' },
        { symbol: 'S', meaning: 'Server', category: 'server' },
        { symbol: 'C', meaning: 'Connection', category: 'connection' },
        { symbol: 'O', meaning: 'Other', category: 'other' },
      ];

      const filtered = filterLegendByCategory(entries, ['agent', 'server']);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.symbol)).toEqual(['A', 'S']);
    });

    it('should return empty for non-matching categories', () => {
      const entries: LegendEntry[] = [
        { symbol: 'A', meaning: 'Agent', category: 'agent' },
      ];

      const filtered = filterLegendByCategory(entries, ['server']);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('getLegendForDiagram', () => {
    it('should return mermaid legend for mermaid diagram', () => {
      const legend = getLegendForDiagram('mermaid');

      expect(legend).toBe(mermaidLegend);
    });

    it('should return component-map specific legend', () => {
      const legend = getLegendForDiagram('component-map');

      const categories = new Set(legend.map(e => e.category));
      expect(categories.has('agent')).toBe(true);
      expect(categories.has('server')).toBe(true);
      expect(categories.has('connection')).toBe(true);
      expect(categories.has('other')).toBe(false);
    });

    it('should return hierarchy specific legend', () => {
      const legend = getLegendForDiagram('hierarchy');

      const categories = new Set(legend.map(e => e.category));
      expect(categories.has('agent')).toBe(true);
      expect(categories.has('connection')).toBe(true);
      expect(categories.has('server')).toBe(false);
    });

    it('should return dataflow specific legend', () => {
      const legend = getLegendForDiagram('dataflow');

      const categories = new Set(legend.map(e => e.category));
      expect(categories.has('agent')).toBe(true);
      expect(categories.has('connection')).toBe(true);
    });
  });
});
