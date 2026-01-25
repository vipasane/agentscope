/**
 * Tests for Enhanced Dataflow Diagram Generator
 * Phase 3 Implementation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  identifyDataFlow,
  generateEnhancedDataflowDiagram,
  formatDataflowDocument,
  type DataFlowMetadata,
} from '../../src/core/generators/diagrams/dataflow-enhanced.js';
import type { AgentScopeConfig } from '../../src/core/model/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConfig(overrides: Partial<AgentScopeConfig> = {}): AgentScopeConfig {
  return {
    agents: [
      {
        name: 'planner',
        path: '.claude/agents/planner.md',
        description: 'Plans and coordinates tasks',
        type: 'coordinator',
        delegatesTo: ['coder', 'tester'],
        tools: ['Task', 'Memory'],
      },
      {
        name: 'coder',
        path: '.claude/agents/coder.md',
        description: 'Implements code',
        type: 'worker',
        tools: ['Read', 'Write', 'Edit'],
      },
      {
        name: 'tester',
        path: '.claude/agents/tester.md',
        description: 'Writes tests',
        type: 'worker',
        tools: ['Read', 'Write', 'Bash'],
      },
    ],
    skills: [],
    hooks: [],
    commands: [],
    plugins: [],
    mcpServers: [
      {
        name: 'github-mcp',
        type: 'stdio',
        command: 'npx',
        args: ['@github/mcp'],
        tools: ['github-pr', 'github-issue'],
        disabled: false,
      },
    ],
    permissions: {
      filesystem: { allowed: ['read', 'write'] },
      network: { allowed: ['https'] },
    },
    metadata: {
      scanDate: '2026-01-25',
      version: '1.2.0',
    },
    errors: [],
    ...overrides,
  };
}

// ============================================================================
// Task 3.1: Data Source and Sink Identification Tests
// ============================================================================

describe('identifyDataFlow', () => {
  it('should identify data sources', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);

    expect(metadata.sources).toBeDefined();
    expect(metadata.sources.length).toBeGreaterThan(0);

    // Check for expected sources
    const sourceIds = metadata.sources.map(s => s.id);
    expect(sourceIds).toContain('user-input');
    expect(sourceIds).toContain('config-files');
    expect(sourceIds).toContain('agent-files');
  });

  it('should identify MCP server sources when present', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);

    const sourceIds = metadata.sources.map(s => s.id);
    expect(sourceIds).toContain('mcp-servers');

    const mcpSource = metadata.sources.find(s => s.id === 'mcp-servers');
    expect(mcpSource?.type).toBe('mcp');
    expect(mcpSource?.format).toBe('JSON-RPC');
  });

  it('should not include MCP sources when no servers configured', () => {
    const config = createMockConfig({ mcpServers: [] });
    const metadata = identifyDataFlow(config);

    const sourceIds = metadata.sources.map(s => s.id);
    expect(sourceIds).not.toContain('mcp-servers');
  });

  it('should identify data transformations', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);

    expect(metadata.transformations).toBeDefined();
    expect(metadata.transformations.length).toBeGreaterThan(0);

    // Check for expected transformations
    const transformIds = metadata.transformations.map(t => t.id);
    expect(transformIds).toContain('parse');
    expect(transformIds).toContain('validate');
    expect(transformIds).toContain('analyze');
    expect(transformIds).toContain('generate-diagrams');
    expect(transformIds).toContain('generate-docs');
  });

  it('should identify data sinks', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);

    expect(metadata.sinks).toBeDefined();
    expect(metadata.sinks.length).toBeGreaterThan(0);

    // Check for expected sinks
    const sinkIds = metadata.sinks.map(s => s.id);
    expect(sinkIds).toContain('readme');
    expect(sinkIds).toContain('component-map');
    expect(sinkIds).toContain('hierarchy');
    expect(sinkIds).toContain('dataflow');
    expect(sinkIds).toContain('config-json');
  });

  it('should include data formats for all sources', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);

    for (const source of metadata.sources) {
      expect(source.format).toBeDefined();
      expect(source.format.length).toBeGreaterThan(0);
    }
  });

  it('should include data formats for all transformations', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);

    for (const transform of metadata.transformations) {
      expect(transform.format).toBeDefined();
      expect(transform.from).toBeDefined();
      expect(transform.to).toBeDefined();
    }
  });
});

// ============================================================================
// Task 3.2: Enhanced Dataflow Diagram Generation Tests
// ============================================================================

describe('generateEnhancedDataflowDiagram', () => {
  it('should create source/transform/sink subgraphs', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata);

    expect(diagram).toContain('subgraph Sources');
    expect(diagram).toContain('subgraph Transformations');
    expect(diagram).toContain('subgraph Sinks');
  });

  it('should include all data sources in diagram', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata);

    for (const source of metadata.sources) {
      expect(diagram).toContain(source.id);
      expect(diagram).toContain(source.name);
    }
  });

  it('should include all transformations in diagram', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata);

    for (const transform of metadata.transformations) {
      expect(diagram).toContain(transform.id);
      expect(diagram).toContain(transform.name);
    }
  });

  it('should include all data sinks in diagram', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata);

    for (const sink of metadata.sinks) {
      expect(diagram).toContain(sink.id);
      expect(diagram).toContain(sink.name);
    }
  });

  it('should annotate edges with data formats when enabled', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata, { includeFormats: true });

    // Check for format annotations
    expect(diagram).toMatch(/-->\|"[^"]+"\|/);
  });

  it('should omit format annotations when disabled', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata, { includeFormats: false });

    // Should have arrows without annotations
    expect(diagram).toContain('-->');
  });

  it('should apply different styles for source/transform/sink nodes', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata);

    expect(diagram).toContain('classDef source');
    expect(diagram).toContain('classDef transform');
    expect(diagram).toContain('classDef sink');
  });

  it('should be valid Mermaid syntax', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata);

    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('graph LR');
    expect(diagram).toContain('```');
  });

  it('should include custom title when provided', () => {
    const config = createMockConfig();
    const metadata = identifyDataFlow(config);
    const diagram = generateEnhancedDataflowDiagram(metadata, {
      title: 'Custom Dataflow',
    });

    expect(diagram).toContain('Custom Dataflow');
  });
});

// ============================================================================
// Task 3.3: Dataflow Markdown Formatter Tests
// ============================================================================

describe('formatDataflowDocument', () => {
  it('should include dataflow diagram', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);

    expect(markdown).toContain('# System Data Flow');
    expect(markdown).toContain('```mermaid');
  });

  it('should include data format annotations table', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);

    expect(markdown).toContain('## Data Format Annotations');
    expect(markdown).toContain('### Data Sources');
    expect(markdown).toContain('### Data Transformations');
    expect(markdown).toContain('### Data Sinks');
  });

  it('should list all data sources in table', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);
    const metadata = identifyDataFlow(config);

    for (const source of metadata.sources) {
      expect(markdown).toContain(source.name);
      expect(markdown).toContain(source.format);
    }
  });

  it('should list all transformations in table', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);
    const metadata = identifyDataFlow(config);

    for (const transform of metadata.transformations) {
      expect(markdown).toContain(transform.name);
      expect(markdown).toContain(transform.from);
      expect(markdown).toContain(transform.to);
    }
  });

  it('should list all sinks in table', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);
    const metadata = identifyDataFlow(config);

    for (const sink of metadata.sinks) {
      expect(markdown).toContain(sink.name);
      expect(markdown).toContain(sink.format);
    }
  });

  it('should include back navigation to README', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);

    expect(markdown).toContain('[← Back to README](./README.md)');
  });

  it('should include flow summary section', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);

    expect(markdown).toContain('## Flow Summary');
    expect(markdown).toContain('Input Layer');
    expect(markdown).toContain('Parsing Layer');
    expect(markdown).toContain('Validation Layer');
    expect(markdown).toContain('Analysis Layer');
    expect(markdown).toContain('Generation Layer');
    expect(markdown).toContain('Output Layer');
  });

  it('should include timestamp footer', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);

    expect(markdown).toMatch(/Generated by AgentScope on \d{4}-\d{2}-\d{2}/);
  });

  it('should match expected document structure', () => {
    const config = createMockConfig();
    const markdown = formatDataflowDocument(config);

    // Check section order
    const sections = [
      '# System Data Flow',
      '## Data Format Annotations',
      '## Flow Summary',
    ];

    let lastIndex = -1;
    for (const section of sections) {
      const index = markdown.indexOf(section);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});
