/**
 * Unit tests for Hierarchy diagram generator
 * Tests Mermaid diagram generation showing agent hierarchy and delegation chains
 */

import { describe, it, expect } from 'vitest';
import { generateHierarchy } from '../../../src/core/generators/diagrams/hierarchy.js';
import type { AgentScopeConfig, Agent, Skill } from '../../../src/core/model/types.js';

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

// Helper to create a skill
function createSkill(name: string, overrides: Partial<Skill> = {}): Skill {
  return {
    name,
    path: `.claude/skills/${name}/SKILL.md`,
    ...overrides,
  };
}

describe('generateHierarchy', () => {
  describe('basic structure', () => {
    it('should generate valid Mermaid code block', () => {
      const config = createConfig();
      const result = generateHierarchy(config);

      expect(result).toContain('```mermaid');
      expect(result).toContain('```');
    });

    it('should include graph directive with direction', () => {
      const config = createConfig();
      const result = generateHierarchy(config, { direction: 'TB' });

      expect(result).toContain('graph TB');
    });

    it('should support all direction options', () => {
      const config = createConfig({
        agents: [createAgent('test')],
      });

      const directions = ['TB', 'BT', 'LR', 'RL'] as const;

      for (const direction of directions) {
        const result = generateHierarchy(config, { direction });
        expect(result).toContain(`graph ${direction}`);
      }
    });

    it('should include title comment', () => {
      const config = createConfig();
      const result = generateHierarchy(config, { title: 'Custom Hierarchy' });

      expect(result).toContain('%% Custom Hierarchy');
    });

    it('should use default title when not specified', () => {
      const config = createConfig();
      const result = generateHierarchy(config);

      expect(result).toContain('%% Agent Hierarchy');
    });
  });

  describe('agent nodes rendering', () => {
    it('should render all agents as nodes', () => {
      const config = createConfig({
        agents: [
          createAgent('agent1'),
          createAgent('agent2'),
          createAgent('agent3'),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('agent1');
      expect(result).toContain('agent2');
      expect(result).toContain('agent3');
    });

    it('should use different shapes for different agent types', () => {
      const config = createConfig({
        agents: [
          createAgent('coordinator', { type: 'coordinator' }),
          createAgent('worker', { type: 'worker' }),
          createAgent('reviewer', { type: 'reviewer' }),
          createAgent('specialist', { type: 'specialist' }),
        ],
      });

      const result = generateHierarchy(config);

      // Coordinator uses stadium shape [[...]]
      expect(result).toMatch(/coordinator\[\[.*\]\]/);
      // Worker uses rectangle [...]
      expect(result).toMatch(/worker\[.*\]/);
      // Reviewer uses hexagon {{...}}
      expect(result).toMatch(/reviewer\{\{.*\}\}/);
      // Specialist uses cylinder ([...])
      expect(result).toMatch(/specialist\(\[.*\]\)/);
    });

    it('should show descriptions when option is enabled', () => {
      const config = createConfig({
        agents: [
          createAgent('test', { description: 'Test agent description' }),
        ],
      });

      const result = generateHierarchy(config, { showDescriptions: true });

      expect(result).toContain('Test agent');
    });

    it('should not show descriptions by default', () => {
      const config = createConfig({
        agents: [
          createAgent('test', { description: 'Test agent description' }),
        ],
      });

      const result = generateHierarchy(config, { showDescriptions: false });

      expect(result).toContain('"test"');
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(100);
      const config = createConfig({
        agents: [
          createAgent('test', { description: longDescription }),
        ],
      });

      const result = generateHierarchy(config, { showDescriptions: true });

      expect(result).toContain('...');
    });
  });

  describe('delegation relationships', () => {
    it('should draw delegation arrows between agents', () => {
      const config = createConfig({
        agents: [
          createAgent('parent', { delegatesTo: ['child'] }),
          createAgent('child'),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('parent -->|delegates| child');
    });

    it('should handle multiple delegations from one agent', () => {
      const config = createConfig({
        agents: [
          createAgent('coordinator', { delegatesTo: ['worker1', 'worker2', 'worker3'] }),
          createAgent('worker1'),
          createAgent('worker2'),
          createAgent('worker3'),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('coordinator -->|delegates| worker1');
      expect(result).toContain('coordinator -->|delegates| worker2');
      expect(result).toContain('coordinator -->|delegates| worker3');
    });

    it('should handle delegation chains', () => {
      const config = createConfig({
        agents: [
          createAgent('level1', { type: 'coordinator', delegatesTo: ['level2'] }),
          createAgent('level2', { delegatesTo: ['level3'] }),
          createAgent('level3'),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('level1 -->|delegates| level2');
      expect(result).toContain('level2 -->|delegates| level3');
    });

    it('should not draw delegation to non-existent agents', () => {
      const config = createConfig({
        agents: [
          createAgent('parent', { delegatesTo: ['non-existent'] }),
        ],
      });

      const result = generateHierarchy(config);

      // Should not contain delegation arrow to non-existent agent
      expect(result).not.toContain('-->|delegates| non_existent');
    });
  });

  describe('skill relationships', () => {
    it('should render skills section when skills exist', () => {
      const config = createConfig({
        agents: [createAgent('agent1')],
        skills: [createSkill('skill1')],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('%% Skills');
      expect(result).toContain('skill_skill1');
    });

    it('should connect skills to related agents by name', () => {
      const config = createConfig({
        agents: [createAgent('coder')],
        skills: [createSkill('coder-skill')],
      });

      const result = generateHierarchy(config, { level: 'detail' });

      expect(result).toContain('-->|uses|');
    });

    it('should handle skills without matching agents', () => {
      const config = createConfig({
        agents: [createAgent('agent1')],
        skills: [createSkill('unrelated-skill')],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('skill_unrelated_skill');
      // No connection should be made
      expect(result).not.toContain('agent1 -.->|uses| skill_unrelated_skill');
    });
  });

  describe('root agent detection', () => {
    it('should identify root agents (no parents)', () => {
      const config = createConfig({
        agents: [
          createAgent('root', { type: 'coordinator', delegatesTo: ['child'] }),
          createAgent('child'),
        ],
      });

      const result = generateHierarchy(config);

      // Both should be rendered
      expect(result).toContain('root');
      expect(result).toContain('child');
    });

    it('should handle circular delegation gracefully', () => {
      const config = createConfig({
        agents: [
          createAgent('agent1', { delegatesTo: ['agent2'] }),
          createAgent('agent2', { delegatesTo: ['agent1'] }),
        ],
      });

      const result = generateHierarchy(config);

      // Should not throw, should render both
      expect(result).toContain('agent1');
      expect(result).toContain('agent2');
    });
  });

  describe('styling', () => {
    it('should include class definitions', () => {
      const config = createConfig({
        agents: [createAgent('test')],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('classDef coordinator');
      expect(result).toContain('classDef worker');
      expect(result).toContain('classDef reviewer');
      expect(result).toContain('classDef specialist');
      expect(result).toContain('classDef skill');
    });

    it('should apply styling based on agent type', () => {
      const config = createConfig({
        agents: [
          createAgent('coord', { type: 'coordinator' }),
          createAgent('work', { type: 'worker' }),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('class coord coordinator');
      expect(result).toContain('class work worker');
    });

    it('should default to worker class when type is undefined', () => {
      const config = createConfig({
        agents: [
          createAgent('untyped'),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('class untyped worker');
    });

    it('should style skills differently', () => {
      const config = createConfig({
        agents: [createAgent('test')],
        skills: [createSkill('test-skill')],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('class skill_test_skill skill');
    });
  });

  describe('ID sanitization', () => {
    it('should sanitize special characters in agent IDs', () => {
      const config = createConfig({
        agents: [
          createAgent('agent-with-dashes'),
          createAgent('agent.with.dots'),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('agent_with_dashes');
      expect(result).toContain('agent_with_dots');
    });

    it('should sanitize skill IDs', () => {
      const config = createConfig({
        agents: [createAgent('test')],
        skills: [createSkill('skill-name')],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('skill_skill_name');
    });
  });

  describe('complex hierarchy scenarios', () => {
    it('should handle multi-level hierarchy', () => {
      const config = createConfig({
        agents: [
          createAgent('ceo', { type: 'coordinator', delegatesTo: ['manager1', 'manager2'] }),
          createAgent('manager1', { delegatesTo: ['worker1', 'worker2'] }),
          createAgent('manager2', { delegatesTo: ['worker3'] }),
          createAgent('worker1', { type: 'worker' }),
          createAgent('worker2', { type: 'worker' }),
          createAgent('worker3', { type: 'worker' }),
        ],
      });

      const result = generateHierarchy(config);

      // Check all delegations
      expect(result).toContain('ceo -->|delegates| manager1');
      expect(result).toContain('ceo -->|delegates| manager2');
      expect(result).toContain('manager1 -->|delegates| worker1');
      expect(result).toContain('manager1 -->|delegates| worker2');
      expect(result).toContain('manager2 -->|delegates| worker3');
    });

    it('should handle mixed agents with and without delegations', () => {
      const config = createConfig({
        agents: [
          createAgent('delegator', { delegatesTo: ['worker'] }),
          createAgent('worker'),
          createAgent('standalone'),
        ],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('delegator');
      expect(result).toContain('worker');
      expect(result).toContain('standalone');
      expect(result).toContain('delegator -->|delegates| worker');
    });

    it('should handle empty config', () => {
      const config = createConfig({
        agents: [],
        skills: [],
      });

      const result = generateHierarchy(config);

      expect(result).toContain('```mermaid');
      expect(result).toContain('```');
    });
  });
});

describe('generateHierarchy - Snapshot Tests', () => {
  it('should match snapshot for simple hierarchy', () => {
    const config = createConfig({
      agents: [
        createAgent('coordinator', { type: 'coordinator', delegatesTo: ['worker'] }),
        createAgent('worker', { type: 'worker' }),
      ],
    });

    const result = generateHierarchy(config);

    expect(result).toMatchSnapshot();
  });

  it('should match snapshot for complex hierarchy', () => {
    const config = createConfig({
      agents: [
        createAgent('main', { type: 'coordinator', delegatesTo: ['sub1', 'sub2'] }),
        createAgent('sub1', { type: 'specialist', delegatesTo: ['worker1'] }),
        createAgent('sub2', { type: 'reviewer' }),
        createAgent('worker1', { type: 'worker' }),
      ],
      skills: [
        createSkill('coding'),
        createSkill('testing'),
      ],
    });

    const result = generateHierarchy(config, {
      direction: 'LR',
      title: 'Complex Hierarchy',
      showDescriptions: false,
    });

    expect(result).toMatchSnapshot();
  });
});
