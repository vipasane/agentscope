/**
 * Tests for DocumentBuilder
 */

import { describe, it, expect } from 'vitest';
import { DocumentBuilder } from '../../../../src/core/formatters/output/document-builder.js';
import type { DocumentSection, LegendEntry, RelationshipSummary } from '../../../../src/core/formatters/types.js';

describe('DocumentBuilder', () => {
  describe('navigation', () => {
    it('should add navigation links', () => {
      const doc = new DocumentBuilder()
        .addNavigation('./overview.md', './hierarchy.md')
        .build();

      expect(doc).toContain('[<- Overview](./overview.md)');
      expect(doc).toContain('[Hierarchy ->](./hierarchy.md)');
    });

    it('should handle prev only navigation', () => {
      const doc = new DocumentBuilder()
        .addNavigation('./overview.md')
        .build();

      expect(doc).toContain('[<- Overview](./overview.md)');
      expect(doc).not.toContain('[->]');
    });

    it('should handle next only navigation', () => {
      const doc = new DocumentBuilder()
        .addNavigation(undefined, './hierarchy.md')
        .build();

      expect(doc).not.toContain('[<-]');
      expect(doc).toContain('[Hierarchy ->](./hierarchy.md)');
    });

    it('should skip navigation when disabled', () => {
      const doc = new DocumentBuilder({ includeNavigation: false })
        .addNavigation('./overview.md', './hierarchy.md')
        .build();

      expect(doc).not.toContain('[<- Overview]');
      expect(doc).not.toContain('[Hierarchy ->]');
    });
  });

  describe('sections', () => {
    it('should add basic sections', () => {
      const section: DocumentSection = {
        id: 'intro',
        title: 'Introduction',
        content: 'This is the introduction.',
        level: 2,
      };

      const doc = new DocumentBuilder()
        .addSection(section)
        .build();

      expect(doc).toContain('This is the introduction.');
    });

    it('should add multiple sections with separators', () => {
      const section1: DocumentSection = {
        id: 'section1',
        title: 'Section 1',
        content: '## Section 1\n\nContent 1',
        level: 2,
      };

      const section2: DocumentSection = {
        id: 'section2',
        title: 'Section 2',
        content: '## Section 2\n\nContent 2',
        level: 2,
      };

      const doc = new DocumentBuilder()
        .addSection(section1)
        .addSection(section2)
        .build();

      expect(doc).toContain('Content 1');
      expect(doc).toContain('Content 2');
      expect(doc).toContain('---');
    });
  });

  describe('diagrams', () => {
    it('should add Mermaid diagram', () => {
      const mermaid = 'graph TD\n  A --> B';

      const doc = new DocumentBuilder()
        .addDiagram(mermaid, 'System Architecture')
        .build();

      expect(doc).toContain('```mermaid');
      expect(doc).toContain('graph TD');
      expect(doc).toContain('A --> B');
      expect(doc).toContain('```');
      expect(doc).toContain('### System Architecture');
    });

    it('should handle diagram without title', () => {
      const mermaid = 'graph LR\n  X --> Y';

      const doc = new DocumentBuilder()
        .addDiagram(mermaid)
        .build();

      expect(doc).toContain('```mermaid');
      expect(doc).toContain('graph LR');
      expect(doc).not.toContain('###');
    });
  });

  describe('tables', () => {
    it('should add markdown table', () => {
      const headers = ['Name', 'Type', 'Count'];
      const rows = [
        ['Agent A', 'Coordinator', '5'],
        ['Agent B', 'Worker', '10'],
      ];

      const doc = new DocumentBuilder()
        .addTable(headers, rows, 'Agent Summary')
        .build();

      expect(doc).toContain('### Agent Summary');
      expect(doc).toContain('| Name | Type | Count |');
      expect(doc).toContain('| Agent A | Coordinator | 5 |');
      expect(doc).toContain('| Agent B | Worker | 10 |');
    });

    it('should handle table without title', () => {
      const headers = ['A', 'B'];
      const rows = [['1', '2']];

      const doc = new DocumentBuilder()
        .addTable(headers, rows)
        .build();

      expect(doc).toContain('| A | B |');
      expect(doc).toContain('| 1 | 2 |');
      expect(doc).not.toContain('###');
    });
  });

  describe('legend', () => {
    it('should add legend with grouping', () => {
      const entries: LegendEntry[] = [
        { symbol: '🤖', meaning: 'Agent', category: 'agent' },
        { symbol: '👑', meaning: 'Coordinator', category: 'agent' },
        { symbol: '🖥️', meaning: 'Server', category: 'server' },
      ];

      const doc = new DocumentBuilder()
        .addLegend(entries)
        .build();

      expect(doc).toContain('### Legend');
      expect(doc).toContain('**Agent**');
      expect(doc).toContain('| 🤖 | Agent |');
      expect(doc).toContain('| 👑 | Coordinator |');
      expect(doc).toContain('**Server**');
      expect(doc).toContain('| 🖥️ | Server |');
    });
  });

  describe('relationships', () => {
    it('should add relationship summary', () => {
      const summary: RelationshipSummary = {
        delegations: { count: 12, example: 'Coord → Worker' },
        toolUsages: { count: 25, example: 'Agent uses git' },
        skillUsages: { count: 8, example: '"/test" → TestSkill' },
      };

      const doc = new DocumentBuilder()
        .addRelationshipSummary(summary)
        .build();

      expect(doc).toContain('### Relationship Summary');
      expect(doc).toContain('| Delegations | 12 | Coord → Worker |');
      expect(doc).toContain('| Tool Usages | 25 | Agent uses git |');
      expect(doc).toContain('| Skill Usages | 8 | "/test" → TestSkill |');
    });
  });

  describe('category navigation', () => {
    it('should add category navigation table', () => {
      const categories = [
        { category: 'Coordinators', count: 5, sectionLink: '#coordinators', detailsLink: './coord.md' },
        { category: 'Workers', count: 10, sectionLink: '#workers' },
      ];

      const doc = new DocumentBuilder()
        .addCategoryNavigation(categories)
        .build();

      expect(doc).toContain('### Category Navigation');
      expect(doc).toContain('| Coordinators | 5 | [Jump](#coordinators) | [View](./coord.md) |');
      expect(doc).toContain('| Workers | 10 | [Jump](#workers) | - |');
    });
  });

  describe('table of contents', () => {
    it('should add table of contents with hierarchy', () => {
      const items = [
        {
          label: 'Overview',
          anchor: 'overview',
          level: 0,
        },
        {
          label: 'Agents',
          anchor: 'agents',
          level: 0,
          children: [
            { label: 'Coordinator', anchor: 'coordinator', level: 1 },
            { label: 'Worker', anchor: 'worker', level: 1 },
          ],
        },
      ];

      const doc = new DocumentBuilder()
        .addTableOfContents(items)
        .build();

      expect(doc).toContain('## Table of Contents');
      expect(doc).toContain('- [Overview](#overview)');
      expect(doc).toContain('- [Agents](#agents)');
      expect(doc).toContain('  - [Coordinator](#coordinator)');
      expect(doc).toContain('  - [Worker](#worker)');
    });
  });

  describe('timestamp', () => {
    it('should add timestamp footer', () => {
      const doc = new DocumentBuilder()
        .addTimestamp()
        .build();

      expect(doc).toContain('*Generated by AgentScope on');
      expect(doc).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should skip timestamp when disabled', () => {
      const doc = new DocumentBuilder({ includeTimestamp: false })
        .addTimestamp()
        .build();

      expect(doc).not.toContain('*Generated by AgentScope on');
    });
  });

  describe('fluent API', () => {
    it('should chain methods fluently', () => {
      const doc = new DocumentBuilder()
        .addNavigation('./prev.md', './next.md')
        .addSection({
          id: 'test',
          title: 'Test',
          content: 'Test content',
          level: 2,
        })
        .addDiagram('graph TD\nA-->B', 'Test Diagram')
        .addTimestamp()
        .build();

      expect(doc).toContain('[<- Prev](./prev.md)');
      expect(doc).toContain('Test content');
      expect(doc).toContain('```mermaid');
      expect(doc).toContain('*Generated by AgentScope on');
    });
  });

  describe('edge cases', () => {
    it('should handle empty builder', () => {
      const doc = new DocumentBuilder().build();

      expect(doc).toBe('');
    });

    it('should handle special characters in file names', () => {
      const doc = new DocumentBuilder()
        .addNavigation('./my-cool_page.md')
        .build();

      expect(doc).toContain('[<- My Cool Page](./my-cool_page.md)');
    });

    it('should trim whitespace in mermaid diagrams', () => {
      const doc = new DocumentBuilder()
        .addDiagram('  \n  graph TD\n  A-->B  \n  ')
        .build();

      expect(doc).toContain('```mermaid\ngraph TD\n  A-->B\n```');
    });
  });
});
