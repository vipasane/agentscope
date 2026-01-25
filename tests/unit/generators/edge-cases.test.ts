/**
 * Edge Case and Boundary Testing
 * Tests handling of zero agents, missing categories, malformed input
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeAgents,
  detectCategory,
  filterByCategory,
  filterByType,
  filterByPattern,
} from '../../../src/core/generators/diagrams/categories.js';
import { generateComponentMap } from '../../../src/core/generators/diagrams/component-map.js';
import { generateHierarchy } from '../../../src/core/generators/diagrams/hierarchy.js';
import { generateDataflow } from '../../../src/core/generators/diagrams/dataflow.js';
import { generateMarkdown } from '../../../src/core/generators/docs/markdown.js';
import type { AgentScopeConfig, Agent } from '../../../src/core/model/types.js';

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

function createAgent(name: string, type?: string): Agent {
  return {
    name,
    path: `/test/${name}.md`,
    ...(type && { type }),
  };
}

describe('Edge Cases and Boundary Conditions', () => {
  describe('Zero/Empty Agent Lists', () => {
    it('should handle 0 agents gracefully', () => {
      const config = createConfig({ agents: [] });

      const componentMap = generateComponentMap(config);
      const hierarchy = generateHierarchy(config);
      const dataflow = generateDataflow(config);
      const markdown = generateMarkdown(config);

      expect(componentMap).toBeTruthy();
      expect(hierarchy).toBeTruthy();
      expect(dataflow).toBeTruthy();
      expect(markdown).toBeTruthy();
    });

    it('should categorize empty agent list', () => {
      const result = categorizeAgents([]);
      expect(result).toEqual([]);
    });

    it('should filter empty agent list', () => {
      expect(filterByCategory([], ['development'])).toEqual([]);
      expect(filterByType([], ['worker'])).toEqual([]);
      expect(filterByPattern([], 'agent-*')).toEqual([]);
    });
  });

  describe('Single Agent', () => {
    it('should handle single agent', () => {
      const agents = [createAgent('only-agent')];
      const config = createConfig({ agents });

      const componentMap = generateComponentMap(config);
      expect(componentMap).toContain('only-agent');
    });

    it('should categorize single agent', () => {
      const result = categorizeAgents([createAgent('coder')]);
      expect(result).toHaveLength(1);
      expect(result[0].agents).toHaveLength(1);
    });
  });

  describe('Boundary Agent Names', () => {
    it('should handle empty name', () => {
      const agent = createAgent('');
      expect(() => detectCategory(agent)).not.toThrow();
      expect(detectCategory(agent)).toBe('other');
    });

    it('should handle very long agent names', () => {
      const longName = 'a'.repeat(1000);
      const agent = createAgent(longName);

      expect(() => detectCategory(agent)).not.toThrow();
      expect(detectCategory(agent)).toBe('other');
    });

    it('should handle special characters in names', () => {
      const agents = [
        createAgent('agent-with-dash'),
        createAgent('agent_with_underscore'),
        createAgent('agent.with.dot'),
        createAgent('agent@with#special$chars'),
      ];

      for (const agent of agents) {
        expect(() => categorizeAgents([agent])).not.toThrow();
      }
    });

    it('should handle whitespace in names', () => {
      const agents = [
        createAgent('agent with space'),
        createAgent('  agent'),
        createAgent('agent  '),
        createAgent('\tagent'),
      ];

      for (const agent of agents) {
        expect(() => detectCategory(agent)).not.toThrow();
      }
    });

    it('should handle unicode characters', () => {
      const agents = [
        createAgent('agent-🤖'),
        createAgent('代理-agent'),
        createAgent('agentcafé'),
      ];

      for (const agent of agents) {
        expect(() => detectCategory(agent)).not.toThrow();
      }
    });
  });

  describe('Missing/Null Categories', () => {
    it('should handle agents with no matching category', () => {
      const agents = [
        createAgent('completely-random-name-xyz'),
        createAgent('unrelated-service'),
      ];

      const result = categorizeAgents(agents);
      expect(result[0]?.category).toBe('other');
    });

    it('should handle missing agent type field', () => {
      const agent: Agent = { name: 'test', path: 'test.md' };
      expect(() => detectCategory(agent)).not.toThrow();
    });

    it('should handle undefined type', () => {
      const agent = createAgent('test');
      expect(() => detectCategory(agent)).not.toThrow();
    });
  });

  describe('Malformed Input', () => {
    it('should handle null-like agent names gracefully', () => {
      // TypeScript prevents us from passing null directly,
      // but we test boundary cases
      const agent = createAgent('');
      expect(() => detectCategory(agent)).not.toThrow();
    });

    it('should handle circular delegation references', () => {
      const agents = [
        { name: 'a', path: 'a.md', delegatesTo: ['b'] } as Agent,
        { name: 'b', path: 'b.md', delegatesTo: ['a'] } as Agent,
      ];

      const config = createConfig({ agents });
      expect(() => generateHierarchy(config)).not.toThrow();
    });

    it('should handle self-delegation', () => {
      const agents = [{ name: 'self-delegator', path: 's.md', delegatesTo: ['self-delegator'] } as Agent];

      const config = createConfig({ agents });
      expect(() => generateHierarchy(config)).not.toThrow();
    });

    it('should handle invalid delegation references', () => {
      const agents = [
        { name: 'a', path: 'a.md', delegatesTo: ['nonexistent'] } as Agent,
        { name: 'b', path: 'b.md', delegatesTo: ['also-nonexistent'] } as Agent,
      ];

      const config = createConfig({ agents });
      expect(() => generateHierarchy(config)).not.toThrow();
    });
  });

  describe('Filter Edge Cases', () => {
    it('should handle filter with empty category list', () => {
      const agents = [createAgent('coder'), createAgent('tester')];
      const result = filterByCategory(agents, []);

      expect(result).toEqual([]);
    });

    it('should handle filter with non-existent category', () => {
      const agents = [createAgent('agent')];
      // @ts-expect-error - testing invalid category
      const result = filterByCategory(agents, ['nonexistent-category']);

      expect(result).toEqual([]);
    });

    it('should handle case-insensitive type filtering', () => {
      const agents = [
        createAgent('a', 'Developer'),
        createAgent('b', 'WORKER'),
        createAgent('c', 'Coordinator'),
      ];

      expect(filterByType(agents, ['developer'])).toHaveLength(1);
      expect(filterByType(agents, ['WORKER'])).toHaveLength(1);
      expect(filterByType(agents, ['COORDINATOR'])).toHaveLength(1);
    });

    it('should handle pattern with no matches', () => {
      const agents = [createAgent('coder')];
      const result = filterByPattern(agents, 'completely-different-*');

      expect(result).toEqual([]);
    });

    it('should handle pattern with special regex characters', () => {
      const agents = [createAgent('agent-[1]'), createAgent('agent-2')];

      // Should treat * as wildcard, other chars as literal
      const result = filterByPattern(agents, 'agent-*');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Large Input Handling', () => {
    it('should handle 10,000 agents', () => {
      const agents = Array.from({ length: 10000 }, (_, i) => createAgent(`agent-${i}`));

      expect(() => categorizeAgents(agents)).not.toThrow();
    });

    it('should handle agents with many delegation targets', () => {
      const agents = [
        {
          name: 'hub',
          path: 'hub.md',
          delegatesTo: Array.from({ length: 100 }, (_, i) => `worker-${i}`),
        } as Agent,
        ...Array.from({ length: 100 }, (_, i) => createAgent(`worker-${i}`)),
      ];

      const config = createConfig({ agents });
      expect(() => generateHierarchy(config)).not.toThrow();
    });

    it('should handle deep delegation chains', () => {
      const agents: Agent[] = [];

      // Create a chain: a -> b -> c -> d -> ... -> z
      for (let i = 0; i < 26; i++) {
        const name = String.fromCharCode(97 + i); // a-z
        const nextName = i < 25 ? String.fromCharCode(98 + i) : undefined;

        agents.push({
          name,
          path: `${name}.md`,
          ...(nextName && { delegatesTo: [nextName] }),
        });
      }

      const config = createConfig({ agents });
      expect(() => generateHierarchy(config)).not.toThrow();
    });
  });

  describe('Type and Category Conflicts', () => {
    it('should prefer name pattern over type pattern', () => {
      // github-* name pattern should match before type patterns
      const agent = createAgent('github-custom', 'security');
      expect(detectCategory(agent)).toBe('github');
    });

    it('should handle agents matching multiple patterns', () => {
      // coordination matches suffix, v3 would match prefix
      const agent = createAgent('my-coordinator');
      const category = detectCategory(agent);

      expect(['coordination', 'v3-core']).toContain(category);
    });

    it('should handle ambiguous agent names', () => {
      const agents = [
        createAgent('coordinator-coder'), // Could be coordination or development
        createAgent('security-tester'), // Could be security or testing
      ];

      expect(() => categorizeAgents(agents)).not.toThrow();
      const result = categorizeAgents(agents);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Special Name Cases', () => {
    it('should handle names that are category keywords', () => {
      const agents = [
        createAgent('github'),
        createAgent('security'),
        createAgent('specification'),
        createAgent('coder'),
      ];

      expect(() => categorizeAgents(agents)).not.toThrow();
    });

    it('should handle names with repeated patterns', () => {
      const agents = [
        createAgent('github-github-github'),
        createAgent('coder-coder-coder'),
      ];

      expect(() => categorizeAgents(agents)).not.toThrow();
    });

    it('should handle names that contain other category keywords', () => {
      const agent = createAgent('github-security-coder-tester');
      // Should match first pattern (github)
      expect(detectCategory(agent)).toBe('github');
    });
  });

  describe('Output Size Limits', () => {
    it('should produce reasonable diagram size for 1000 agents', () => {
      const agents = Array.from({ length: 1000 }, (_, i) => createAgent(`agent-${i}`));
      const config = createConfig({ agents });

      const diagram = generateComponentMap(config);
      // Diagram should be large but not excessive (< 50MB)
      expect(diagram.length).toBeLessThan(50 * 1024 * 1024);
    });

    it('should produce reasonable markdown size', () => {
      const agents = Array.from({ length: 100 }, (_, i) => createAgent(`agent-${i}`));
      const config = createConfig({ agents });

      const markdown = generateMarkdown(config);
      // Markdown should be reasonable (< 10MB)
      expect(markdown.length).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Null/Undefined Handling', () => {
    it('should handle missing metadata fields', () => {
      const config = createConfig({
        agents: [createAgent('test')],
        metadata: {
          scannedAt: new Date(),
          rootPath: '',
          version: '',
          duration: 0,
          filesScanned: 0,
          errors: [],
        },
      });

      expect(() => generateMarkdown(config)).not.toThrow();
    });

    it('should handle agents with partial path information', () => {
      const agents = [
        { name: 'a', path: '' } as Agent,
        { name: 'b', path: '/absolute/path.md' } as Agent,
        { name: 'c', path: 'relative/path.md' } as Agent,
      ];

      const config = createConfig({ agents });
      expect(() => generateComponentMap(config)).not.toThrow();
    });
  });

  describe('Performance Under Stress', () => {
    it('should handle many agents with complex names', () => {
      const agents = Array.from({ length: 100 }, (_, i) => {
        const names = [
          `github-${i}-pr-${i}`,
          `security-auditor-${i}-specialist`,
          `sparc-${i}-coordinator`,
          `v3-core-${i}-optimizer`,
        ];
        return createAgent(names[i % 4]);
      });

      const start = performance.now();
      const result = categorizeAgents(agents);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle rapid successive generation calls', () => {
      const agents = Array.from({ length: 50 }, (_, i) => createAgent(`agent-${i}`));
      const config = createConfig({ agents });

      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        generateComponentMap(config);
        times.push(performance.now() - start);
      }

      // All calls should be reasonably fast
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(100);
    });
  });
});
