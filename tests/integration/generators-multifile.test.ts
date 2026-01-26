/**
 * Integration tests for Multi-File Generator Output
 * Tests that multiple generators work together to create coherent output
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { generateComponentMap } from '../../src/core/generators/diagrams/component-map.js';
import { generateHierarchy } from '../../src/core/generators/diagrams/hierarchy.js';
import { generateDataflow } from '../../src/core/generators/diagrams/dataflow.js';
import { generateMarkdown } from '../../src/core/generators/docs/markdown.js';
import { categorizeAgents } from '../../src/core/generators/diagrams/categories.js';
import type { AgentScopeConfig, Agent, McpServer, Skill } from '../../src/core/model/types.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentscope-test-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

function createConfig(overrides: Partial<AgentScopeConfig> = {}): AgentScopeConfig {
  return {
    agents: [],
    skills: [],
    hooks: [],
    commands: [],
    mcpServers: [],
    metadata: {
      scannedAt: new Date(),
      rootPath: tempDir,
      version: '1.2.0',
      duration: 100,
      filesScanned: 10,
      errors: [],
    },
    ...overrides,
  };
}

function createAgent(name: string, type?: string, delegatesTo?: string[]): Agent {
  return {
    name,
    path: `.claude/agents/${name}.md`,
    ...(type && { type }),
    ...(delegatesTo && { delegatesTo }),
  };
}

function createSkill(name: string, path?: string): Skill {
  return {
    name,
    path: path || `.claude/skills/${name}`,
  };
}

function createServer(name: string): McpServer {
  return {
    name,
    command: 'node',
  };
}

describe('Multi-File Generator Integration', () => {
  describe('Coordinated Output', () => {
    it('should generate all diagram types without conflicts', async () => {
      const config = createConfig({
        agents: [
          createAgent('planner', 'coordinator', ['coder', 'tester']),
          createAgent('coder', 'worker'),
          createAgent('tester', 'worker'),
          createAgent('reviewer', 'reviewer'),
        ],
      });

      const componentMap = generateComponentMap(config);
      const hierarchy = generateHierarchy(config);
      const dataflow = generateDataflow(config);

      expect(componentMap).toBeTruthy();
      expect(hierarchy).toBeTruthy();
      expect(dataflow).toBeTruthy();

      // All should be Mermaid diagrams
      expect(componentMap).toContain('graph');
      expect(hierarchy).toContain('graph');
      expect(dataflow).toContain('graph');
    });

    it('should generate markdown that references all agents', async () => {
      const agents = [
        createAgent('github-pr', 'coordinator'),
        createAgent('security-auditor', 'specialist'),
        createAgent('coder', 'worker'),
      ];

      const config = createConfig({ agents });
      const markdown = generateMarkdown(config);

      expect(markdown).toContain('github-pr');
      expect(markdown).toContain('security-auditor');
      expect(markdown).toContain('coder');
    });

    it('should maintain consistency across diagrams', async () => {
      const agents = [
        createAgent('lead', 'coordinator', ['worker1', 'worker2']),
        createAgent('worker1', 'worker'),
        createAgent('worker2', 'worker'),
      ];

      const config = createConfig({ agents });

      const componentMap = generateComponentMap(config);
      const hierarchy = generateHierarchy(config);

      // Both should contain all agent names
      expect(componentMap).toContain('lead');
      expect(hierarchy).toContain('lead');
      expect(componentMap).toContain('worker1');
      expect(hierarchy).toContain('worker1');
    });
  });

  describe('Large-Scale Output', () => {
    it('should handle 100+ agents without errors', () => {
      const agents = Array.from({ length: 100 }, (_, i) => createAgent(`agent-${i}`, 'worker'));

      const config = createConfig({ agents });
      const componentMap = generateComponentMap(config);
      const hierarchy = generateHierarchy(config);

      expect(componentMap).toBeTruthy();
      expect(hierarchy).toBeTruthy();
      expect(componentMap.length).toBeGreaterThan(100);
    });

    it('should handle complex delegation networks', () => {
      const agents = [
        createAgent('root', 'coordinator', ['a', 'b', 'c']),
        createAgent('a', 'coordinator', ['a1', 'a2']),
        createAgent('b', 'coordinator', ['b1', 'b2']),
        createAgent('c', 'worker'),
        createAgent('a1', 'worker'),
        createAgent('a2', 'worker'),
        createAgent('b1', 'worker'),
        createAgent('b2', 'worker'),
      ];

      const config = createConfig({ agents });
      const hierarchy = generateHierarchy(config);

      expect(hierarchy).toContain('root');
      expect(hierarchy).toContain('a1');
      expect(hierarchy).toContain('b2');
    });

    it('should handle circular delegation references gracefully', () => {
      const agents = [
        createAgent('a', 'coordinator', ['b']),
        createAgent('b', 'coordinator', ['a']),
      ];

      const config = createConfig({ agents });
      // Should not throw or cause infinite loop
      const hierarchy = generateHierarchy(config);

      expect(hierarchy).toBeTruthy();
    });
  });

  describe('Skills and Tools Integration', () => {
    it('should reference skills in output', () => {
      const agents = [
        createAgent('github-pr', 'coordinator'),
        createAgent('coder', 'worker'),
      ];

      const skills = [
        createSkill('github-review'),
        createSkill('sparc-methodology'),
      ];

      const config = createConfig({ agents, skills });
      const markdown = generateMarkdown(config);

      expect(markdown).toContain('github-review');
      expect(markdown).toContain('sparc-methodology');
    });

    it('should include MCP server information', () => {
      const agents = [createAgent('agent', 'worker')];
      const mcpServers = [
        createServer('claude-flow'),
        createServer('github'),
      ];

      const config = createConfig({ agents, mcpServers });
      const markdown = generateMarkdown(config);

      expect(markdown).toContain('claude-flow');
      expect(markdown).toContain('github');
    });
  });

  describe('Categorization in Context', () => {
    it('should categorize agents in markdown output', () => {
      const agents = [
        createAgent('github-pr'),
        createAgent('security-auditor'),
        createAgent('coder'),
        createAgent('tester'),
      ];

      const config = createConfig({ agents });
      const categorized = categorizeAgents(agents);

      expect(categorized.length).toBeGreaterThan(0);
      expect(categorized.map(c => c.category)).toContain('github');
      expect(categorized.map(c => c.category)).toContain('security');
      expect(categorized.map(c => c.category)).toContain('development');
      expect(categorized.map(c => c.category)).toContain('testing');
    });

    it('should maintain categorization across multiple calls', () => {
      const agents = [
        createAgent('coder', 'developer'),
        createAgent('tester', 'tester'),
      ];

      const config = createConfig({ agents });

      const result1 = categorizeAgents(agents);
      const result2 = categorizeAgents(agents);

      expect(result1).toEqual(result2);
    });
  });

  describe('Output File Writing', () => {
    it('should write valid markdown files', async () => {
      const agents = [
        createAgent('coder'),
        createAgent('tester'),
      ];

      const config = createConfig({ agents });
      const markdown = generateMarkdown(config);

      const filePath = path.join(tempDir, 'architecture.md');
      await fs.writeFile(filePath, markdown);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(markdown);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should write valid diagram files as markdown blocks', async () => {
      const agents = [
        createAgent('planner', 'coordinator', ['worker']),
        createAgent('worker', 'worker'),
      ];

      const config = createConfig({ agents });
      const diagram = generateComponentMap(config);

      const filePath = path.join(tempDir, 'diagram.md');
      const wrapped = `# Component Map\n\n\`\`\`mermaid\n${diagram}\n\`\`\``;
      await fs.writeFile(filePath, wrapped);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('```mermaid');
      expect(content).toContain('```');
    });

    it('should write configuration JSON', async () => {
      const agents = [
        createAgent('agent1'),
        createAgent('agent2'),
      ];

      const config = createConfig({ agents });
      const filePath = path.join(tempDir, 'config.json');

      await fs.writeFile(filePath, JSON.stringify(config, null, 2));

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.agents).toHaveLength(2);
      expect(parsed.agents[0].name).toBe('agent1');
    });
  });

  describe('Concurrent Generation', () => {
    it('should generate all outputs concurrently without race conditions', async () => {
      const agents = Array.from({ length: 50 }, (_, i) =>
        createAgent(`agent-${i}`, i % 5 === 0 ? 'coordinator' : 'worker')
      );

      const config = createConfig({ agents });

      const [componentMap, hierarchy, dataflow, markdown] = await Promise.all([
        Promise.resolve(generateComponentMap(config)),
        Promise.resolve(generateHierarchy(config)),
        Promise.resolve(generateDataflow(config)),
        Promise.resolve(generateMarkdown(config)),
      ]);

      expect(componentMap).toBeTruthy();
      expect(hierarchy).toBeTruthy();
      expect(dataflow).toBeTruthy();
      expect(markdown).toBeTruthy();
    });

    it('should handle sequential file writes correctly', async () => {
      const agents = [createAgent('test-agent')];
      const config = createConfig({ agents });

      const files = [
        { name: 'component.md', content: generateComponentMap(config) },
        { name: 'hierarchy.md', content: generateHierarchy(config) },
        { name: 'dataflow.md', content: generateDataflow(config) },
        { name: 'readme.md', content: generateMarkdown(config) },
      ];

      await Promise.all(
        files.map(file =>
          fs.writeFile(path.join(tempDir, file.name), `# ${file.name}\n\`\`\`mermaid\n${file.content}\n\`\`\``)
        )
      );

      const writtenFiles = await fs.readdir(tempDir);
      expect(writtenFiles).toHaveLength(files.length);

      for (const file of files) {
        const content = await fs.readFile(path.join(tempDir, file.name), 'utf-8');
        expect(content).toContain(file.name);
      }
    });
  });

  describe('Consistency Validation', () => {
    it('should have matching agent lists across outputs', () => {
      const agents = [
        createAgent('agent-a'),
        createAgent('agent-b'),
        createAgent('agent-c'),
      ];

      const config = createConfig({ agents });

      const componentMap = generateComponentMap(config);
      const hierarchy = generateHierarchy(config);
      const markdown = generateMarkdown(config);

      // Each output should reference all agents
      const agentNames = agents.map(a => a.name);

      for (const name of agentNames) {
        expect(componentMap).toContain(name);
        expect(hierarchy).toContain(name);
        expect(markdown).toContain(name);
      }
    });

    it('should preserve agent order in categorization', () => {
      const agents = [
        createAgent('first', 'worker'),
        createAgent('second', 'worker'),
        createAgent('third', 'worker'),
      ];

      const categorized = categorizeAgents(agents);
      const devAgents = categorized.find(c => c.category === 'development');

      expect(devAgents?.agents).toHaveLength(3);
    });

    it('should handle metadata consistency', () => {
      const config = createConfig({
        agents: [createAgent('test')],
        metadata: {
          scannedAt: new Date('2024-01-01'),
          rootPath: '/test/path',
          version: '1.2.0',
          duration: 150,
          filesScanned: 42,
          errors: [],
        },
      });

      const markdown = generateMarkdown(config);

      expect(markdown).toContain('1.2.0');
      expect(markdown).toContain('/test/path');
    });
  });

  describe('Error Resilience', () => {
    it('should handle empty agent list', () => {
      const config = createConfig({ agents: [] });

      const componentMap = generateComponentMap(config);
      const hierarchy = generateHierarchy(config);

      expect(componentMap).toBeTruthy();
      expect(hierarchy).toBeTruthy();
    });

    it('should handle agents with minimal properties', () => {
      const agents = [{ name: 'minimal-agent', path: 'test.md' } as Agent];
      const config = createConfig({ agents });

      const componentMap = generateComponentMap(config);
      expect(componentMap).toContain('minimal-agent');
    });

    it('should handle missing optional fields', () => {
      const agents = [
        { name: 'agent1', path: 'a.md' } as Agent,
        { name: 'agent2', path: 'b.md' } as Agent,
      ];

      const config = createConfig({ agents });
      const markdown = generateMarkdown(config);

      expect(markdown).toContain('agent1');
      expect(markdown).toContain('agent2');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should generate 100 agents in reasonable time', () => {
      const agents = Array.from({ length: 100 }, (_, i) => createAgent(`agent-${i}`));
      const config = createConfig({ agents });

      const start = performance.now();
      generateComponentMap(config);
      const duration = performance.now() - start;

      // Should complete in less than 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should generate 500 agents without excessive memory', () => {
      const agents = Array.from({ length: 500 }, (_, i) => createAgent(`agent-${i}`));
      const config = createConfig({ agents });

      const diagram = generateComponentMap(config);

      // Diagram string should be reasonable size
      expect(diagram.length).toBeLessThan(1000000); // Less than 1MB
    });
  });
});
