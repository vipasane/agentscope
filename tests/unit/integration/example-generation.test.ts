import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeParser } from '../../../src/core/parsers/claude-code.js';
import { DocumentBuilder } from '../../../src/core/formatters/output/document-builder.js';
import { generateHierarchy } from '../../../src/core/generators/diagrams/hierarchy.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Agent } from '../../../src/core/model/types.js';

describe('Example Generation Integration', () => {
  let testDir: string;
  let sampleClaudeContent: string;
  let parsedAgents: Agent[];

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = join(tmpdir(), `agentscope-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Sample CLAUDE.md content similar to the example
    sampleClaudeContent = `
# Sample Project

## Available Agents

### Coordinators

- \`planner\`: High-level planning and task decomposition
  - Delegates to: researcher, coder, tester
  - Tools: Read, Write

### Workers

- \`researcher\`: Analyzes requirements and gathers information
  - Tools: Read, WebSearch, Grep

- \`coder\`: Implements features and writes code
  - Tools: Read, Write, Edit, Bash

- \`tester\`: Writes and runs tests
  - Tools: Read, Write, Bash
`;

    const claudeMdPath = join(testDir, 'CLAUDE.md');
    await writeFile(claudeMdPath, sampleClaudeContent);

    const parser = new ClaudeCodeParser(testDir);
    const result = await parser.parse();
    parsedAgents = result.agents;
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate example-style output from sample project', () => {
    const diagram = generateHierarchy(parsedAgents);

    const builder = new DocumentBuilder();
    const document = builder
      .addDiagram(diagram, 'Agent Architecture')
      .build(parsedAgents, {
        title: 'Sample Project - Agent Diagram',
        includeNavigation: true,
        includeLegend: true,
        includeRelationshipSummary: true,
        includeTimestamp: true
      });

    // Verify document structure
    expect(document).toBeTruthy();
    expect(typeof document).toBe('string');

    // Verify title
    expect(document).toContain('# Sample Project - Agent Diagram');

    // Verify diagram section
    expect(document).toContain('## Agent Architecture');
    expect(document).toContain('```mermaid');
    expect(document).toContain('graph TD');

    // Verify agents are in diagram
    expect(document).toContain('planner');
    expect(document).toContain('coder');
    expect(document).toContain('tester');
  });

  it('should include navigation links', () => {
    const diagram = generateHierarchy(parsedAgents);

    const builder = new DocumentBuilder();
    const document = builder
      .addDiagram(diagram)
      .build(parsedAgents, {
        includeNavigation: true,
        prevLink: 'index.md',
        nextLink: 'details.md'
      });

    expect(document).toContain('[← Previous](index.md)');
    expect(document).toContain('[Next →](details.md)');
  });

  it('should include legend', () => {
    const diagram = generateHierarchy(parsedAgents);

    const builder = new DocumentBuilder();
    const document = builder
      .addDiagram(diagram)
      .build(parsedAgents, {
        includeLegend: true
      });

    expect(document).toContain('## Legend');
    expect(document).toContain('| Symbol | Meaning |');
    expect(document).toContain('Coordinator');
    expect(document).toContain('Worker');
    expect(document).toContain('Delegates to');
  });

  it('should include relationship summary', () => {
    const diagram = generateHierarchy(parsedAgents);

    const builder = new DocumentBuilder();
    const document = builder
      .addDiagram(diagram)
      .build(parsedAgents, {
        includeRelationshipSummary: true
      });

    expect(document).toContain('## Agent Relationships');
    expect(document).toContain('**planner**');
    expect(document).toContain('→ researcher');
    expect(document).toContain('→ coder');
    expect(document).toContain('→ tester');
  });

  it('should parse all agents correctly', () => {
    expect(parsedAgents).toHaveLength(4);

    // Verify planner
    const planner = parsedAgents.find(a => a.name === 'planner');
    expect(planner).toBeDefined();
    expect(planner?.type).toBe('coordinator');
    expect(planner?.delegatesTo).toEqual(['researcher', 'coder', 'tester']);
    expect(planner?.tools).toEqual(['Read', 'Write']);

    // Verify researcher
    const researcher = parsedAgents.find(a => a.name === 'researcher');
    expect(researcher).toBeDefined();
    expect(researcher?.type).toBe('worker');
    expect(researcher?.tools).toEqual(['Read', 'WebSearch', 'Grep']);

    // Verify coder
    const coder = parsedAgents.find(a => a.name === 'coder');
    expect(coder).toBeDefined();
    expect(coder?.type).toBe('worker');
    expect(coder?.tools).toEqual(['Read', 'Write', 'Edit', 'Bash']);

    // Verify tester
    const tester = parsedAgents.find(a => a.name === 'tester');
    expect(tester).toBeDefined();
    expect(tester?.type).toBe('worker');
    expect(tester?.tools).toEqual(['Read', 'Write', 'Bash']);
  });

  it('should generate valid Mermaid syntax', () => {
    const diagram = generateHierarchy(parsedAgents);

    // Verify Mermaid structure
    expect(diagram).toContain('graph TD');
    expect(diagram).toMatch(/classDef coordinator/);
    expect(diagram).toMatch(/classDef worker/);

    // Verify node definitions
    expect(diagram).toMatch(/planner\[/);
    expect(diagram).toMatch(/coder\[/);
    expect(diagram).toMatch(/tester\[/);

    // Verify edges (planner delegates to others)
    expect(diagram).toMatch(/planner\s*-->/);

    // Verify class assignments
    expect(diagram).toMatch(/planner:::coordinator/);
    expect(diagram).toMatch(/coder:::worker/);
    expect(diagram).toMatch(/tester:::worker/);
  });

  it('should apply custom theme', () => {
    const diagram = generateHierarchy(parsedAgents, { theme: 'dark' });

    expect(diagram).toContain('%%{init: {"theme": "dark"}}%%');
  });

  it('should generate complete document matching example format', () => {
    const diagram = generateHierarchy(parsedAgents, {
      theme: 'forest'
    });

    const builder = new DocumentBuilder();
    const document = builder
      .addDiagram(diagram, 'Agent Architecture Diagram')
      .build(parsedAgents, {
        title: 'Sample Project - Agent Workflow',
        includeNavigation: true,
        prevLink: '../README.md',
        nextLink: 'implementation-details.md',
        includeLegend: true,
        includeRelationshipSummary: true,
        includeTimestamp: true
      });

    // Verify complete structure
    const lines = document.split('\n');

    // Should have multiple sections
    expect(document).toContain('# Sample Project - Agent Workflow');
    expect(document).toContain('[← Previous](../README.md)');
    expect(document).toContain('[Next →](implementation-details.md)');
    expect(document).toContain('## Agent Architecture Diagram');
    expect(document).toContain('```mermaid');
    expect(document).toContain('## Legend');
    expect(document).toContain('## Agent Relationships');
    expect(document).toContain('*Generated on');

    // Verify proper markdown structure
    expect(lines.filter(l => l.startsWith('#')).length).toBeGreaterThan(2);
    expect(lines.filter(l => l.startsWith('|')).length).toBeGreaterThan(0);
  });

  it('should handle complex nested structures', async () => {
    const complexContent = `
### Coordinators

- \`main-coord\`: Main coordinator
  - Delegates to: sub-coord1, sub-coord2, worker1

- \`sub-coord1\`: Sub coordinator 1
  - Delegates to: worker2, worker3

- \`sub-coord2\`: Sub coordinator 2
  - Delegates to: worker4

### Workers

- \`worker1\`: Worker 1
- \`worker2\`: Worker 2
- \`worker3\`: Worker 3
- \`worker4\`: Worker 4
`;

    const claudeMdPath = join(testDir, 'CLAUDE2.md');
    await writeFile(claudeMdPath, complexContent);

    const parser = new ClaudeCodeParser(testDir);
    const result = await parser.parse();
    const agents = result.agents;

    // Should parse all agents
    expect(agents.length).toBeGreaterThanOrEqual(7);

    const diagram = generateHierarchy(agents);

    // Should create proper hierarchy
    expect(diagram).toContain('main-coord');
    expect(diagram).toContain('sub-coord1');
    expect(diagram).toContain('sub-coord2');
  });

  it('should handle minimal content', async () => {
    const minimalContent = `
- \`simple-agent\`: Does simple tasks
`;

    const claudeMdPath = join(testDir, 'CLAUDE-MINIMAL.md');
    await writeFile(claudeMdPath, minimalContent);

    const parser = new ClaudeCodeParser(testDir);
    const result = await parser.parse();
    const agents = result.agents;

    expect(agents).toHaveLength(1);

    const diagram = generateHierarchy(agents);
    expect(diagram).toContain('simple-agent');

    const builder = new DocumentBuilder();
    const document = builder
      .addDiagram(diagram)
      .build(agents);

    expect(document).toContain('simple-agent');
  });
});
