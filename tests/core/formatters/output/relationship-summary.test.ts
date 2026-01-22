/**
 * Tests for Relationship Summary
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRelationships,
  generateRelationshipTable,
  getDelegationChains,
  generateDelegationChainList,
  getToolUsageByType,
  generateToolUsageSummary,
  findCircularDelegations,
} from '../../../../src/core/formatters/output/relationship-summary.js';
import type { AgentScopeConfig, Agent } from '../../../../src/core/model/types.js';

describe('Relationship Summary', () => {
  const createMockConfig = (agents: Agent[]): AgentScopeConfig => ({
    agents,
    skills: [],
    hooks: [],
    commands: [],
    mcpServers: [],
    metadata: {
      scannedAt: new Date(),
      rootPath: '/test',
      version: '1.0.0',
      duration: 100,
      filesScanned: 5,
      errors: [],
    },
  });

  describe('calculateRelationships', () => {
    it('should count delegations', () => {
      const agents: Agent[] = [
        {
          name: 'Coordinator',
          path: './coord.ts',
          delegatesTo: ['Worker1', 'Worker2'],
        },
        {
          name: 'Worker1',
          path: './worker1.ts',
          delegatesTo: ['Specialist'],
        },
      ];

      const config = createMockConfig(agents);
      const summary = calculateRelationships(config);

      expect(summary.delegations.count).toBe(3);
      expect(summary.delegations.example).toBe('Coordinator → Worker1');
    });

    it('should count tool usages', () => {
      const agents: Agent[] = [
        {
          name: 'Agent1',
          path: './agent1.ts',
          tools: ['git', 'npm', 'docker'],
        },
        {
          name: 'Agent2',
          path: './agent2.ts',
          tools: ['bash'],
        },
      ];

      const config = createMockConfig(agents);
      const summary = calculateRelationships(config);

      expect(summary.toolUsages.count).toBe(4);
      expect(summary.toolUsages.example).toBe('Agent1 uses git');
    });

    it('should handle empty configuration', () => {
      const config = createMockConfig([]);
      const summary = calculateRelationships(config);

      expect(summary.delegations.count).toBe(0);
      expect(summary.delegations.example).toBe('None');
      expect(summary.toolUsages.count).toBe(0);
      expect(summary.toolUsages.example).toBe('None');
    });

    it('should count skill usages from triggers', () => {
      const config: AgentScopeConfig = {
        agents: [],
        skills: [
          { name: 'TestSkill', path: './test.ts', triggers: ['/test', '/t'] },
          { name: 'HelpSkill', path: './help.ts', triggers: ['/help'] },
        ],
        hooks: [],
        commands: [],
        mcpServers: [],
        metadata: {
          scannedAt: new Date(),
          rootPath: '/test',
          version: '1.0.0',
          duration: 100,
          filesScanned: 5,
          errors: [],
        },
      };

      const summary = calculateRelationships(config);

      expect(summary.skillUsages.count).toBe(3);
      expect(summary.skillUsages.example).toBe('"/test" → TestSkill');
    });
  });

  describe('generateRelationshipTable', () => {
    it('should generate markdown table', () => {
      const summary = {
        delegations: { count: 12, example: 'A → B' },
        toolUsages: { count: 25, example: 'C uses git' },
        skillUsages: { count: 8, example: '"/test" → Skill' },
      };

      const table = generateRelationshipTable(summary);

      expect(table).toContain('| Type | Count | Example |');
      expect(table).toContain('| Delegations | 12 | A → B |');
      expect(table).toContain('| Tool Usages | 25 | C uses git |');
      expect(table).toContain('| Skill Usages | 8 | "/test" → Skill |');
    });
  });

  describe('getDelegationChains', () => {
    it('should find simple chains', () => {
      const agents: Agent[] = [
        { name: 'A', path: './a.ts', delegatesTo: ['B'] },
        { name: 'B', path: './b.ts', delegatesTo: ['C'] },
        { name: 'C', path: './c.ts' },
      ];

      const config = createMockConfig(agents);
      const chains = getDelegationChains(config);

      expect(chains).toHaveLength(1);
      expect(chains[0]).toEqual(['A', 'B', 'C']);
    });

    it('should find multiple chains from single root', () => {
      const agents: Agent[] = [
        { name: 'Root', path: './root.ts', delegatesTo: ['A', 'B'] },
        { name: 'A', path: './a.ts', delegatesTo: ['C'] },
        { name: 'B', path: './b.ts', delegatesTo: ['D'] },
        { name: 'C', path: './c.ts' },
        { name: 'D', path: './d.ts' },
      ];

      const config = createMockConfig(agents);
      const chains = getDelegationChains(config);

      expect(chains).toHaveLength(2);
      expect(chains).toContainEqual(['Root', 'A', 'C']);
      expect(chains).toContainEqual(['Root', 'B', 'D']);
    });

    it('should handle agents with no delegations', () => {
      const agents: Agent[] = [
        { name: 'Standalone', path: './standalone.ts' },
      ];

      const config = createMockConfig(agents);
      const chains = getDelegationChains(config);

      expect(chains).toHaveLength(0);
    });

    it('should prevent infinite loops in circular delegations', () => {
      const agents: Agent[] = [
        { name: 'A', path: './a.ts', delegatesTo: ['B'] },
        { name: 'B', path: './b.ts', delegatesTo: ['A'] },
      ];

      const config = createMockConfig(agents);
      const chains = getDelegationChains(config);

      // Should not hang and should return empty or limited chains
      expect(chains).toBeDefined();
    });
  });

  describe('generateDelegationChainList', () => {
    it('should generate markdown list', () => {
      const chains = [
        ['A', 'B', 'C'],
        ['X', 'Y', 'Z'],
      ];

      const list = generateDelegationChainList(chains);

      expect(list).toContain('**Delegation Chains**:');
      expect(list).toContain('1. A → B → C');
      expect(list).toContain('2. X → Y → Z');
    });

    it('should handle empty chains', () => {
      const list = generateDelegationChainList([]);

      expect(list).toBe('No delegation chains found.');
    });
  });

  describe('getToolUsageByType', () => {
    it('should group tool usage by agent type', () => {
      const agents: Agent[] = [
        { name: 'Coord', path: './c.ts', type: 'coordinator', tools: ['git', 'npm'] },
        { name: 'Worker1', path: './w1.ts', type: 'worker', tools: ['bash'] },
        { name: 'Worker2', path: './w2.ts', type: 'worker', tools: ['git', 'docker'] },
      ];

      const config = createMockConfig(agents);
      const usage = getToolUsageByType(config);

      expect(usage.coordinator.count).toBe(2);
      expect(usage.coordinator.tools.size).toBe(2);
      expect(usage.worker.count).toBe(3);
      expect(usage.worker.tools.size).toBe(3); // bash, git, docker
    });

    it('should handle agents without tools', () => {
      const agents: Agent[] = [
        { name: 'Agent1', path: './a1.ts', type: 'worker' },
      ];

      const config = createMockConfig(agents);
      const usage = getToolUsageByType(config);

      expect(usage.worker.count).toBe(0);
      expect(usage.worker.tools.size).toBe(0);
    });
  });

  describe('generateToolUsageSummary', () => {
    it('should generate tool usage table', () => {
      const agents: Agent[] = [
        { name: 'A', path: './a.ts', type: 'coordinator', tools: ['git', 'npm'] },
        { name: 'B', path: './b.ts', type: 'worker', tools: ['bash', 'git'] },
      ];

      const config = createMockConfig(agents);
      const summary = generateToolUsageSummary(config);

      expect(summary).toContain('| Agent Type | Tool Count | Unique Tools |');
      expect(summary).toContain('| Coordinator | 2 | 2 |');
      expect(summary).toContain('| Worker | 2 | 2 |');
    });
  });

  describe('findCircularDelegations', () => {
    it('should detect simple circular dependency', () => {
      const agents: Agent[] = [
        { name: 'A', path: './a.ts', delegatesTo: ['B'] },
        { name: 'B', path: './b.ts', delegatesTo: ['A'] },
      ];

      const config = createMockConfig(agents);
      const circular = findCircularDelegations(config);

      expect(circular.length).toBeGreaterThan(0);
      expect(circular[0]).toContain('A');
      expect(circular[0]).toContain('B');
    });

    it('should detect larger circular dependency', () => {
      const agents: Agent[] = [
        { name: 'A', path: './a.ts', delegatesTo: ['B'] },
        { name: 'B', path: './b.ts', delegatesTo: ['C'] },
        { name: 'C', path: './c.ts', delegatesTo: ['A'] },
      ];

      const config = createMockConfig(agents);
      const circular = findCircularDelegations(config);

      expect(circular.length).toBeGreaterThan(0);
    });

    it('should not detect circles in linear chains', () => {
      const agents: Agent[] = [
        { name: 'A', path: './a.ts', delegatesTo: ['B'] },
        { name: 'B', path: './b.ts', delegatesTo: ['C'] },
        { name: 'C', path: './c.ts' },
      ];

      const config = createMockConfig(agents);
      const circular = findCircularDelegations(config);

      expect(circular).toHaveLength(0);
    });

    it('should handle empty configuration', () => {
      const config = createMockConfig([]);
      const circular = findCircularDelegations(config);

      expect(circular).toHaveLength(0);
    });
  });
});
