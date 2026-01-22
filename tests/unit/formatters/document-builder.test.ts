import { describe, it, expect } from 'vitest';
import { DocumentBuilder } from '../../../src/core/formatters/output/document-builder.js';
import { NavigationGenerator } from '../../../src/core/formatters/output/navigation.js';
import { LegendGenerator } from '../../../src/core/formatters/output/legend.js';
import type { Agent } from '../../../src/core/model/types.js';

describe('DocumentBuilder', () => {
  const sampleAgents: Agent[] = [
    {
      name: 'planner',
      path: 'CLAUDE.md',
      description: 'Plans tasks',
      type: 'coordinator',
      delegatesTo: ['coder', 'tester'],
      tools: ['Read', 'Write']
    },
    {
      name: 'coder',
      path: 'CLAUDE.md',
      description: 'Writes code',
      type: 'worker',
      delegatesTo: [],
      tools: ['Read', 'Write', 'Edit']
    },
    {
      name: 'tester',
      path: 'CLAUDE.md',
      description: 'Tests code',
      type: 'worker',
      delegatesTo: [],
      tools: ['Read', 'Write', 'Bash']
    }
  ];

  it('should build document with navigation', () => {
    const builder = new DocumentBuilder();
    const doc = builder.build(sampleAgents, {
      includeNavigation: true,
      title: 'Test Agents'
    });

    expect(doc).toContain('# Test Agents');
    expect(doc).toContain('[← Previous]');
    expect(doc).toContain('[Next →]');
  });

  it('should add diagram section', () => {
    const builder = new DocumentBuilder();
    const diagramCode = 'graph TD\n  A-->B';

    const doc = builder
      .addDiagram(diagramCode, 'Test Diagram')
      .build(sampleAgents);

    expect(doc).toContain('## Test Diagram');
    expect(doc).toContain('```mermaid');
    expect(doc).toContain('graph TD');
    expect(doc).toContain('A-->B');
    expect(doc).toContain('```');
  });

  it('should generate legend table', () => {
    const builder = new DocumentBuilder();
    const doc = builder.build(sampleAgents, {
      includeLegend: true
    });

    expect(doc).toContain('## Legend');
    expect(doc).toContain('| Symbol | Meaning |');
    expect(doc).toContain('Coordinator');
    expect(doc).toContain('Worker');
  });

  it('should generate relationship summary', () => {
    const builder = new DocumentBuilder();
    const doc = builder.build(sampleAgents, {
      includeRelationshipSummary: true
    });

    expect(doc).toContain('## Agent Relationships');
    expect(doc).toContain('**planner**');
    expect(doc).toContain('→ coder');
    expect(doc).toContain('→ tester');
  });

  it('should add timestamp footer', () => {
    const builder = new DocumentBuilder();
    const doc = builder.build(sampleAgents, {
      includeTimestamp: true
    });

    expect(doc).toContain('---');
    expect(doc).toContain('*Generated on');
    expect(doc).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
  });

  it('should combine multiple sections in correct order', () => {
    const builder = new DocumentBuilder();
    const diagramCode = 'graph TD\n  A-->B';

    const doc = builder
      .addDiagram(diagramCode, 'Architecture')
      .build(sampleAgents, {
        title: 'Full Document',
        includeNavigation: true,
        includeLegend: true,
        includeRelationshipSummary: true,
        includeTimestamp: true
      });

    // Check order of sections
    const titleIndex = doc.indexOf('# Full Document');
    const navIndex = doc.indexOf('[← Previous]');
    const diagramIndex = doc.indexOf('## Architecture');
    const legendIndex = doc.indexOf('## Legend');
    const relationshipIndex = doc.indexOf('## Agent Relationships');
    const timestampIndex = doc.indexOf('*Generated on');

    expect(titleIndex).toBeLessThan(navIndex);
    expect(navIndex).toBeLessThan(diagramIndex);
    expect(diagramIndex).toBeLessThan(legendIndex);
    expect(legendIndex).toBeLessThan(relationshipIndex);
    expect(relationshipIndex).toBeLessThan(timestampIndex);
  });

  it('should handle empty agents array', () => {
    const builder = new DocumentBuilder();
    const doc = builder.build([]);

    expect(doc).toContain('# Agent Diagram');
    expect(doc).not.toContain('## Agent Relationships');
  });

  it('should allow custom theme', () => {
    const builder = new DocumentBuilder();
    const diagramCode = 'graph TD';

    const doc = builder
      .addDiagram(diagramCode, 'Test', 'dark')
      .build([]);

    expect(doc).toContain('%%{init: {"theme": "dark"}}%%');
  });

  it('should not include optional sections by default', () => {
    const builder = new DocumentBuilder();
    const doc = builder.build(sampleAgents);

    expect(doc).not.toContain('[← Previous]');
    expect(doc).not.toContain('## Legend');
    expect(doc).not.toContain('*Generated on');
  });
});

describe('NavigationGenerator', () => {
  it('should generate prev/next links', () => {
    const nav = NavigationGenerator.generate({
      prevLink: 'intro.md',
      nextLink: 'details.md'
    });

    expect(nav).toContain('[← Previous](intro.md)');
    expect(nav).toContain('[Next →](details.md)');
  });

  it('should generate category table', () => {
    const nav = NavigationGenerator.generate({
      categories: [
        { name: 'Overview', link: 'overview.md' },
        { name: 'Details', link: 'details.md' }
      ]
    });

    expect(nav).toContain('| Category | Link |');
    expect(nav).toContain('| Overview | [View](overview.md) |');
    expect(nav).toContain('| Details | [View](details.md) |');
  });

  it('should combine prev/next with categories', () => {
    const nav = NavigationGenerator.generate({
      prevLink: 'intro.md',
      nextLink: 'conclusion.md',
      categories: [
        { name: 'Home', link: 'index.md' }
      ]
    });

    expect(nav).toContain('[← Previous]');
    expect(nav).toContain('[Next →]');
    expect(nav).toContain('| Category | Link |');
  });

  it('should handle missing prev link', () => {
    const nav = NavigationGenerator.generate({
      nextLink: 'next.md'
    });

    expect(nav).toContain('[Next →](next.md)');
    expect(nav).not.toContain('← Previous');
  });

  it('should handle missing next link', () => {
    const nav = NavigationGenerator.generate({
      prevLink: 'prev.md'
    });

    expect(nav).toContain('[← Previous](prev.md)');
    expect(nav).not.toContain('Next →');
  });

  it('should handle empty categories', () => {
    const nav = NavigationGenerator.generate({
      categories: []
    });

    expect(nav).not.toContain('| Category | Link |');
  });

  it('should return empty string when no options provided', () => {
    const nav = NavigationGenerator.generate({});
    expect(nav).toBe('');
  });
});

describe('LegendGenerator', () => {
  it('should include standard legend entries', () => {
    const legend = LegendGenerator.generate();

    expect(legend).toContain('## Legend');
    expect(legend).toContain('| Symbol | Meaning |');
    expect(legend).toContain('Coordinator');
    expect(legend).toContain('Worker');
    expect(legend).toContain('Delegates to');
    expect(legend).toContain('Uses tool');
  });

  it('should include custom entries', () => {
    const legend = LegendGenerator.generate([
      { symbol: '🎯', meaning: 'Custom entry' }
    ]);

    expect(legend).toContain('🎯');
    expect(legend).toContain('Custom entry');
  });

  it('should combine standard and custom entries', () => {
    const legend = LegendGenerator.generate([
      { symbol: '⚡', meaning: 'Fast execution' }
    ]);

    expect(legend).toContain('Coordinator');
    expect(legend).toContain('⚡');
    expect(legend).toContain('Fast execution');
  });

  it('should format table correctly', () => {
    const legend = LegendGenerator.generate();
    const lines = legend.split('\n');

    // Should have header, separator, and entries
    expect(lines[0]).toBe('## Legend');
    expect(lines[2]).toContain('| Symbol | Meaning |');
    expect(lines[3]).toContain('|--------|---------|');
    expect(lines.length).toBeGreaterThan(4);
  });

  it('should handle empty custom entries', () => {
    const legend = LegendGenerator.generate([]);

    // Should still include standard entries
    expect(legend).toContain('Coordinator');
    expect(legend).toContain('Worker');
  });

  it('should escape pipe characters in entries', () => {
    const legend = LegendGenerator.generate([
      { symbol: '|', meaning: 'Pipe symbol' }
    ]);

    // Should escape the pipe in symbol
    expect(legend).toContain('\\|');
  });
});
