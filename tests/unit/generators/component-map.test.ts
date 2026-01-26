/**
 * Unit tests for Component Map diagram generator
 * Tests Mermaid diagram generation showing all components and relationships
 */

import { describe, it, expect } from 'vitest';
import { generateComponentMap } from '../../../src/core/generators/diagrams/component-map.js';
import type { AgentScopeConfig, Agent, McpServer, Skill } from '../../../src/core/model/types.js';

// Helper to create a minimal config
function createConfig(overrides: Partial<AgentScopeConfig> = {}): AgentScopeConfig {
  return {
    agents: [],
    skills: [],
    hooks: [],
    commands: [],
    mcpServers: [],
    metadata: {
      scannedAt: new Date(),
      rootPath: '/test',
      version: '1.0.0',
      duration: 100,
      filesScanned: 10,
      errors: [],
    },
    ...overrides,
  };
}

// Helper to create an agent
function createAgent(name: string, overrides: Partial<Agent> = {}): Agent {
  return {
    name,
    path: `.claude/agents/${name}.md`,
    ...overrides,
  };
}

// Helper to create an MCP server
function createServer(name: string, overrides: Partial<McpServer> = {}): McpServer {
  return {
    name,
    command: 'node',
    ...overrides,
  };
}

// Helper to create a skill
function createSkill(name: string, overrides: Partial<Skill> = {}): Skill {
  return {
    name,
    path: `.claude/skills/${name}/SKILL.md`,
    ...overrides,
  };
}

describe('generateComponentMap', () => {
  describe('basic structure', () => {
    it('should generate valid Mermaid code block', async () => {
      const config = createConfig();
      const result = await generateComponentMap(config);

      expect(result).toContain('```mermaid');
      expect(result).toContain('```');
      expect(result).toContain('graph TB');
    });

    it('should include title comment', async () => {
      const config = createConfig();
      const result = await generateComponentMap(config, { title: 'Test Map' });

      expect(result).toContain('%% Test Map');
    });

    it('should use default title when not specified', async () => {
      const config = createConfig();
      const result = await generateComponentMap(config);

      expect(result).toContain('%% Agent Architecture Component Map');
    });
  });

  describe('agents rendering', () => {
    it('should render agents in category subgraphs', async () => {
      const config = createConfig({
        agents: [
          createAgent('agent1'),
          createAgent('agent2'),
        ],
      });

      const result = await generateComponentMap(config);

      // Agents are now grouped by category (default is 'other' for generic names)
      expect(result).toContain('subgraph');
      expect(result).toContain('agent1');
      expect(result).toContain('agent2');
    });

    it('should group github agents in GitHub category', async () => {
      const config = createConfig({
        agents: [
          createAgent('github-pr-manager'),
          createAgent('github-issue-tracker'),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('GitHub');
      expect(result).toContain('github_pr_manager');
      expect(result).toContain('github_issue_tracker');
    });

    it('should format agent labels with icons', async () => {
      const config = createConfig({
        agents: [
          createAgent('coordinator', { type: 'coordinator' }),
          createAgent('worker', { type: 'worker' }),
          createAgent('reviewer', { type: 'reviewer' }),
          createAgent('specialist', { type: 'specialist' }),
        ],
      });

      const result = await generateComponentMap(config);

      // Check that different icons are used for different types
      expect(result).toMatch(/coordinator.*\[".*coordinator/);
      expect(result).toMatch(/worker.*\[".*worker/);
    });

    it('should include agent descriptions when present', async () => {
      const config = createConfig({
        agents: [
          createAgent('test-agent', { description: 'A test agent description' }),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('test');
    });

    it('should handle empty agents array', async () => {
      const config = createConfig({ agents: [] });
      const result = await generateComponentMap(config);

      expect(result).not.toContain('subgraph Agents');
    });
  });

  describe('MCP servers rendering', () => {
    it('should render MCP servers in subgraph', async () => {
      const config = createConfig({
        agents: [createAgent('test-agent')], // Need at least one agent
        mcpServers: [
          createServer('server1'),
          createServer('server2'),
        ],
      });

      const result = await generateComponentMap(config, { level: 'detail' });

      expect(result).toContain('subgraph MCP');
      expect(result).toContain('mcp_server1');
      expect(result).toContain('mcp_server2');
    });

    it('should exclude disabled servers by default', async () => {
      const config = createConfig({
        mcpServers: [
          createServer('enabled-server', { disabled: false }),
          createServer('disabled-server', { disabled: true }),
        ],
      });

      const result = await generateComponentMap(config, { includeDisabled: false });

      expect(result).toContain('mcp_enabled_server');
      expect(result).not.toContain('mcp_disabled_server');
    });

    it('should include disabled servers when option is true', async () => {
      const config = createConfig({
        mcpServers: [
          createServer('enabled-server', { disabled: false }),
          createServer('disabled-server', { disabled: true }),
        ],
      });

      const result = await generateComponentMap(config, { includeDisabled: true });

      expect(result).toContain('mcp_enabled_server');
      expect(result).toContain('mcp_disabled_server');
    });

    it('should mark disabled servers with visual indicator', async () => {
      const config = createConfig({
        agents: [createAgent('test-agent')],
        mcpServers: [
          createServer('disabled-server', { disabled: true }),
        ],
      });

      const result = await generateComponentMap(config, { includeDisabled: true, level: 'detail' });

      // Disabled servers should have :::disabled class or 🔴 icon
      expect(result).toMatch(/:::disabled|🔴/);
    });
  });

  describe('skills rendering', () => {
    it('should render skills in subgraph', async () => {
      const config = createConfig({
        agents: [createAgent('test-agent')], // Need at least one agent
        skills: [
          createSkill('skill1'),
          createSkill('skill2'),
        ],
      });

      const result = await generateComponentMap(config, { level: 'detail' });

      expect(result).toContain('subgraph Skills');
      expect(result).toContain('skill_skill1');
      expect(result).toContain('skill_skill2');
    });

    it('should handle skill with enabled=false', async () => {
      const config = createConfig({
        skills: [
          createSkill('disabled-skill', { enabled: false }),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('skill_disabled_skill');
    });
  });

  describe('relationships and connections', () => {
    it('should draw agent delegation connections', async () => {
      const config = createConfig({
        agents: [
          createAgent('coordinator', { delegatesTo: ['worker1', 'worker2'] }),
          createAgent('worker1'),
          createAgent('worker2'),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('coordinator --> worker1');
      expect(result).toContain('coordinator --> worker2');
    });

    it('should draw agent to tool connections when showTools is true', async () => {
      const config = createConfig({
        agents: [
          createAgent('agent1', { tools: ['tool1'] }),
        ],
        mcpServers: [
          createServer('tool1', { tools: ['tool1'] }),
        ],
      });

      const result = await generateComponentMap(config, { showTools: true });

      expect(result).toContain('agent1 -.-> mcp_tool1');
    });

    it('should not draw tool connections when showTools is false', async () => {
      const config = createConfig({
        agents: [
          createAgent('agent1', { tools: ['tool1'] }),
        ],
        mcpServers: [
          createServer('tool1', { tools: ['tool1'] }),
        ],
      });

      const result = await generateComponentMap(config, { showTools: false });

      expect(result).not.toContain('agent1 -.-> mcp_tool1');
    });

    it('should draw skill dependencies', async () => {
      const config = createConfig({
        agents: [createAgent('test-agent')], // Need at least one agent
        skills: [
          createSkill('dependent-skill', { dependencies: ['base-skill'] }),
          createSkill('base-skill'),
        ],
      });

      const result = await generateComponentMap(config, { level: 'detail' });

      expect(result).toContain('skill_dependent_skill --> skill_base_skill');
    });
  });

  describe('styling', () => {
    it('should include class definitions', async () => {
      const config = createConfig({
        agents: [createAgent('test')],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('classDef coordinator');
      expect(result).toContain('classDef worker');
      expect(result).toContain('classDef reviewer');
      expect(result).toContain('classDef specialist');
      expect(result).toContain('classDef custom');
      expect(result).toContain('classDef mcp');
      expect(result).toContain('classDef skill');
    });

    it('should apply agent type styling', async () => {
      const config = createConfig({
        agents: [
          createAgent('coord', { type: 'coordinator' }),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('class coord coordinator');
    });

    it('should apply MCP server styling', async () => {
      const config = createConfig({
        mcpServers: [
          createServer('test-server'),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('class mcp_test_server mcp');
    });

    it('should apply skill styling', async () => {
      const config = createConfig({
        skills: [
          createSkill('test-skill'),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('class skill_test_skill skill');
    });
  });

  describe('ID sanitization', () => {
    it('should sanitize special characters in IDs', async () => {
      const config = createConfig({
        agents: [
          createAgent('agent-with-dashes'),
          createAgent('agent.with.dots'),
          createAgent('agent@special!chars'),
        ],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('agent_with_dashes');
      expect(result).toContain('agent_with_dots');
      expect(result).toContain('agent_special_chars');
    });
  });

  describe('complex scenarios', () => {
    it('should handle full config with all component types', async () => {
      const config = createConfig({
        agents: [
          createAgent('coordinator', { type: 'coordinator', delegatesTo: ['worker'], tools: ['github'] }),
          createAgent('worker', { type: 'worker' }),
        ],
        skills: [
          createSkill('code-review', { dependencies: ['testing'] }),
          createSkill('testing'),
        ],
        mcpServers: [
          createServer('github', { tools: ['read', 'write'] }),
          createServer('database', { disabled: true }),
        ],
      });

      const result = await generateComponentMap(config, { level: 'detail' });

      // Should contain all sections (now with category-based subgraphs)
      expect(result).toContain('subgraph');
      expect(result).toContain('subgraph Skills');
      expect(result).toContain('subgraph MCP');

      // Should contain relationships
      expect(result).toContain('%% Agent Relationships');

      // Should close properly
      expect(result.indexOf('```mermaid')).toBeLessThan(result.lastIndexOf('```'));
    });

    it('should handle empty config gracefully', async () => {
      const config = createConfig({
        agents: [],
        skills: [],
        mcpServers: [],
      });

      const result = await generateComponentMap(config);

      expect(result).toContain('```mermaid');
      expect(result).toContain('graph TB');
      expect(result).toContain('```');
    });
  });
});

describe('generateComponentMap - Snapshot Tests', () => {
  it('should match snapshot for minimal config', async () => {
    const config = createConfig({
      agents: [createAgent('test-agent', { type: 'worker' })],
    });

    const result = await generateComponentMap(config);

    expect(result).toMatchSnapshot();
  });

  it('should match snapshot for full config', async () => {
    const config = createConfig({
      agents: [
        createAgent('main-coordinator', { type: 'coordinator', delegatesTo: ['coder', 'tester'] }),
        createAgent('coder', { type: 'worker', tools: ['github'] }),
        createAgent('tester', { type: 'specialist' }),
      ],
      skills: [
        createSkill('code-review'),
        createSkill('testing'),
      ],
      mcpServers: [
        createServer('github'),
        createServer('filesystem'),
      ],
    });

    const result = await generateComponentMap(config, { title: 'Full Architecture' });

    expect(result).toMatchSnapshot();
  });
});
