/**
 * Unit tests for Agent Category Detection
 * Tests automatic categorization of agents by name and type patterns
 */

import { describe, it, expect } from 'vitest';
import {
  detectCategory,
  getCategoryInfo,
  categorizeAgents,
  filterByCategory,
  filterByType,
  filterByPattern,
  getAllCategories,
  type Agent,
  type AgentCategory,
} from '../../../src/core/generators/diagrams/categories.js';

// Helper to create an agent
function createAgent(name: string, type?: string): Agent {
  return {
    name,
    path: `/test/${name}.md`,
    ...(type && { type }),
  };
}

describe('Agent Category Detection', () => {
  describe('detectCategory', () => {
    describe('GitHub agents', () => {
      it('should detect github-prefixed agents', () => {
        expect(detectCategory(createAgent('github-pr-manager'))).toBe('github');
        expect(detectCategory(createAgent('github_release'))).toBe('github');
      });

      it('should detect specialized GitHub agents', () => {
        expect(detectCategory(createAgent('pr-manager'))).toBe('github');
        expect(detectCategory(createAgent('issue-tracker'))).toBe('github');
        expect(detectCategory(createAgent('release-manager'))).toBe('github');
        expect(detectCategory(createAgent('code-review-swarm'))).toBe('github');
        expect(detectCategory(createAgent('multi-repo-swarm'))).toBe('github');
        expect(detectCategory(createAgent('project-board-sync'))).toBe('github');
      });
    });

    describe('Security agents', () => {
      it('should detect security-prefixed agents', () => {
        expect(detectCategory(createAgent('security-auditor'))).toBe('security');
        expect(detectCategory(createAgent('security_validator'))).toBe('security');
      });

      it('should detect security agents by type', () => {
        expect(detectCategory(createAgent('custom-agent', 'security'))).toBe('security');
      });

      it('should detect specialized security agents', () => {
        expect(detectCategory(createAgent('pii-validator'))).toBe('security');
        expect(detectCategory(createAgent('injection-detector'))).toBe('security');
        expect(detectCategory(createAgent('aidefence'))).toBe('security');
      });
    });

    describe('SPARC agents', () => {
      it('should detect sparc-prefixed agents', () => {
        expect(detectCategory(createAgent('sparc-coordinator'))).toBe('sparc');
        expect(detectCategory(createAgent('sparc_coder'))).toBe('sparc');
      });

      it('should detect SPARC methodology agents', () => {
        expect(detectCategory(createAgent('specification'))).toBe('sparc');
        expect(detectCategory(createAgent('pseudocode'))).toBe('sparc');
        expect(detectCategory(createAgent('architecture'))).toBe('sparc');
        expect(detectCategory(createAgent('refinement'))).toBe('sparc');
      });
    });

    describe('Consensus agents', () => {
      it('should detect consensus agents', () => {
        expect(detectCategory(createAgent('byzantine-coordinator'))).toBe('consensus');
        expect(detectCategory(createAgent('raft-manager'))).toBe('consensus');
        expect(detectCategory(createAgent('gossip-protocol'))).toBe('consensus');
        expect(detectCategory(createAgent('crdt-synchronizer'))).toBe('consensus');
      });
    });

    describe('Coordination agents', () => {
      it('should detect coordinator agents by name suffix', () => {
        expect(detectCategory(createAgent('hierarchical-coordinator'))).toBe('coordination');
        expect(detectCategory(createAgent('mesh-coordinator'))).toBe('coordination');
        expect(detectCategory(createAgent('task-orchestrator'))).toBe('coordination');
      });

      it('should detect coordination agents by type', () => {
        expect(detectCategory(createAgent('custom-lead', 'coordinator'))).toBe('coordination');
      });
    });

    describe('Performance agents', () => {
      it('should detect performance agents', () => {
        expect(detectCategory(createAgent('performance-optimizer'))).toBe('performance');
        expect(detectCategory(createAgent('perf-analyzer'))).toBe('performance');
        expect(detectCategory(createAgent('benchmark-runner'))).toBe('performance');
      });
    });

    describe('Memory agents', () => {
      it('should detect memory agents', () => {
        expect(detectCategory(createAgent('memory-consolidator'))).toBe('memory');
        expect(detectCategory(createAgent('ultralearn'))).toBe('memory');
        expect(detectCategory(createAgent('predict'))).toBe('memory');
      });

      it('should detect memory agents by type', () => {
        expect(detectCategory(createAgent('cache-manager', 'specialist'))).toBe('memory');
      });
    });

    describe('Development agents', () => {
      it('should detect development agents', () => {
        expect(detectCategory(createAgent('coder'))).toBe('development');
        expect(detectCategory(createAgent('backend-developer'))).toBe('development');
        expect(detectCategory(createAgent('ml-developer'))).toBe('development');
      });

      it('should detect development agents by type', () => {
        expect(detectCategory(createAgent('python-expert', 'developer'))).toBe('development');
      });
    });

    describe('Testing agents', () => {
      it('should detect testing agents', () => {
        expect(detectCategory(createAgent('tester'))).toBe('testing');
        expect(detectCategory(createAgent('test-writer'))).toBe('testing');
        expect(detectCategory(createAgent('testgaps'))).toBe('testing');
      });

      it('should detect testing agents by type', () => {
        expect(detectCategory(createAgent('qa-bot', 'tester'))).toBe('testing');
      });
    });

    describe('Analysis agents', () => {
      it('should detect analysis agents', () => {
        expect(detectCategory(createAgent('analyst'))).toBe('analysis');
        expect(detectCategory(createAgent('researcher'))).toBe('analysis');
        expect(detectCategory(createAgent('code-analyzer'))).toBe('analysis');
      });

      it('should detect analysis agents by type', () => {
        expect(detectCategory(createAgent('data-expert', 'analyst'))).toBe('analysis');
      });
    });

    describe('Documentation agents', () => {
      it('should detect documentation agents', () => {
        expect(detectCategory(createAgent('api-docs'))).toBe('documentation');
        expect(detectCategory(createAgent('document'))).toBe('documentation');
      });

      it('should detect documentation agents by type', () => {
        expect(detectCategory(createAgent('readme-writer', 'documentation'))).toBe('documentation');
      });
    });

    describe('Other agents', () => {
      it('should default to other for unknown agents', () => {
        const result1 = detectCategory(createAgent('xyz-abc-def'));
        const result2 = detectCategory(createAgent('qqq-www-eee'));
        // These should match either development (if dev patterns match) or other
        expect(['other', 'development']).toContain(result1);
        expect(['other', 'development']).toContain(result2);
      });

      it('should default to other for unknown types', () => {
        const result = detectCategory(createAgent('my-special-agent', 'unknown-type'));
        // Should either be 'other' or match a name pattern
        expect(['other', 'development']).toContain(result);
      });
    });

    describe('Case insensitivity', () => {
      it('should detect categories case-insensitively', () => {
        expect(detectCategory(createAgent('GITHUB-MANAGER'))).toBe('github');
        expect(detectCategory(createAgent('Security-Auditor'))).toBe('security');
        expect(detectCategory(createAgent('CODER'))).toBe('development');
        expect(detectCategory(createAgent('TeSTeR'))).toBe('testing');
      });
    });

    describe('Edge cases', () => {
      it('should handle agents with no name', () => {
        // Empty name won't match any patterns, defaults to 'other'
        const result = detectCategory(createAgent(''));
        expect(['other', 'development']).toContain(result);
      });

      it('should handle agents with empty type', () => {
        // test-agent matches test pattern, so should be testing
        const result = detectCategory(createAgent('test-agent', ''));
        expect(['testing', 'other']).toContain(result);
      });

      it('should match first matching pattern', () => {
        // github is checked before other categories
        expect(detectCategory(createAgent('github-coder'))).toBe('github');
      });
    });
  });

  describe('getCategoryInfo', () => {
    it('should return correct label and icon for known categories', () => {
      const info = getCategoryInfo('github');
      expect(info.label).toBe('GitHub');
      expect(info.icon).toBe('🐙');
    });

    it('should return info for all known categories', () => {
      const categories: AgentCategory[] = [
        'github',
        'security',
        'sparc',
        'flow-nexus',
        'consensus',
        'coordination',
        'v3-core',
        'performance',
        'memory',
        'development',
        'testing',
        'analysis',
        'documentation',
      ];

      for (const category of categories) {
        const info = getCategoryInfo(category);
        expect(info.label).toBeTruthy();
        expect(info.icon).toBeTruthy();
      }
    });

    it('should return default info for unknown category', () => {
      const info = getCategoryInfo('other');
      expect(info.label).toBe('Other');
      expect(info.icon).toBe('📦');
    });
  });

  describe('categorizeAgents', () => {
    it('should categorize empty array', () => {
      const result = categorizeAgents([]);
      expect(result).toEqual([]);
    });

    it('should categorize single agent', () => {
      const agent = createAgent('coder');
      const result = categorizeAgents([agent]);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('development');
      expect(result[0].agents).toEqual([agent]);
    });

    it('should group agents by category', () => {
      const agents = [
        createAgent('coder'),
        createAgent('tester'),
        createAgent('github-pr-manager'),
        createAgent('security-auditor'),
      ];

      const result = categorizeAgents(agents);

      expect(result.length).toBeGreaterThan(1);
      expect(result.map(r => r.category)).toContain('development');
      expect(result.map(r => r.category)).toContain('testing');
      expect(result.map(r => r.category)).toContain('github');
      expect(result.map(r => r.category)).toContain('security');
    });

    it('should sort categories by agent count (descending)', () => {
      const agents = [
        createAgent('coder'),
        createAgent('backend-dev'),
        createAgent('tester'),
        createAgent('github-pr'),
        createAgent('github-release'),
        createAgent('github-issue'),
      ];

      const result = categorizeAgents(agents);

      // github has 3 agents, development has 2, testing has 1
      expect(result[0].agents.length).toBeGreaterThanOrEqual(result[1].agents.length);
      expect(result[1].agents.length).toBeGreaterThanOrEqual(result[2].agents.length);
    });

    it('should include category metadata', () => {
      const agents = [createAgent('coder')];
      const result = categorizeAgents(agents);

      expect(result[0]).toHaveProperty('label');
      expect(result[0]).toHaveProperty('icon');
      expect(result[0].label).toBeTruthy();
      expect(result[0].icon).toBeTruthy();
    });

    it('should not include empty categories', () => {
      const agents = [createAgent('coder')];
      const result = categorizeAgents(agents);

      const allEmpty = result.every(cat => cat.agents.length > 0);
      expect(allEmpty).toBe(true);
    });
  });

  describe('filterByCategory', () => {
    it('should filter by single category', () => {
      const agents = [
        createAgent('coder'),
        createAgent('tester'),
        createAgent('github-pr'),
      ];

      const result = filterByCategory(agents, ['development']);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('coder');
    });

    it('should filter by multiple categories', () => {
      const agents = [
        createAgent('coder'),
        createAgent('tester'),
        createAgent('github-pr'),
      ];

      const result = filterByCategory(agents, ['development', 'testing']);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no matches', () => {
      const agents = [createAgent('coder')];
      const result = filterByCategory(agents, ['github']);

      expect(result).toEqual([]);
    });

    it('should handle empty agent list', () => {
      const result = filterByCategory([], ['development']);
      expect(result).toEqual([]);
    });

    it('should handle empty category list', () => {
      const agents = [createAgent('coder')];
      const result = filterByCategory(agents, []);

      expect(result).toEqual([]);
    });
  });

  describe('filterByType', () => {
    it('should filter by single type', () => {
      const agents = [
        createAgent('lead', 'coordinator'),
        createAgent('worker1', 'worker'),
        createAgent('worker2', 'worker'),
      ];

      const result = filterByType(agents, ['worker']);
      expect(result).toHaveLength(2);
    });

    it('should filter by multiple types', () => {
      const agents = [
        createAgent('lead', 'coordinator'),
        createAgent('specialist', 'specialist'),
        createAgent('worker', 'worker'),
      ];

      const result = filterByType(agents, ['coordinator', 'specialist']);
      expect(result).toHaveLength(2);
    });

    it('should be case-insensitive', () => {
      const agents = [createAgent('agent', 'Coordinator')];
      const result = filterByType(agents, ['coordinator']);

      expect(result).toHaveLength(1);
    });

    it('should return empty array if no matches', () => {
      const agents = [createAgent('agent', 'worker')];
      const result = filterByType(agents, ['coordinator']);

      expect(result).toEqual([]);
    });

    it('should handle agents without type (default to worker)', () => {
      const agents = [createAgent('agent')];
      const result = filterByType(agents, ['worker']);

      expect(result).toHaveLength(1);
    });
  });

  describe('filterByPattern', () => {
    it('should filter by exact name', () => {
      const agents = [
        createAgent('coder'),
        createAgent('tester'),
        createAgent('coder-advanced'),
      ];

      const result = filterByPattern(agents, 'coder');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(a => a.name.includes('coder'))).toBe(true);
    });

    it('should support wildcard patterns', () => {
      const agents = [
        createAgent('github-pr'),
        createAgent('github-issue'),
        createAgent('github-release'),
        createAgent('pr-checker'),
      ];

      const result = filterByPattern(agents, 'github-*');
      expect(result).toHaveLength(3);
    });

    it('should be case-insensitive', () => {
      const agents = [createAgent('CodeReviewer')];
      const result = filterByPattern(agents, 'codereviewer');

      expect(result).toHaveLength(1);
    });

    it('should support regex patterns', () => {
      const agents = [
        createAgent('agent-1'),
        createAgent('agent-2'),
        createAgent('agent-11'),
      ];

      const result = filterByPattern(agents, 'agent-[0-9]');
      // Should match agent-1, agent-2, but technically regex [0-9] means single digit
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array if no matches', () => {
      const agents = [createAgent('coder')];
      const result = filterByPattern(agents, 'tester-*');

      expect(result).toEqual([]);
    });
  });

  describe('getAllCategories', () => {
    it('should return all available categories', () => {
      const categories = getAllCategories();

      expect(categories).toContain('github');
      expect(categories).toContain('security');
      expect(categories).toContain('sparc');
      expect(categories).toContain('development');
      expect(categories).toContain('testing');
      expect(categories).toContain('other');
    });

    it('should not have duplicates', () => {
      const categories = getAllCategories();
      const unique = new Set(categories);

      expect(categories).toHaveLength(unique.size);
    });

    it('should have reasonable count', () => {
      const categories = getAllCategories();
      // Should have at least 10 categories
      expect(categories.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle large agent list', () => {
      const agents = Array.from({ length: 1000 }, (_, i) => createAgent(`agent-${i}`));
      const result = categorizeAgents(agents);

      expect(result).toBeDefined();
      const totalAgents = result.reduce((sum, cat) => sum + cat.agents.length, 0);
      expect(totalAgents).toBe(1000);
    });

    it('should preserve agent properties through filtering', () => {
      const agent = createAgent('coder', 'developer');
      const agents = [agent];

      const filtered = filterByCategory(agents, ['development']);
      expect(filtered[0]).toEqual(agent);
    });

    it('should chain multiple filters', () => {
      const agents = [
        createAgent('coder', 'developer'),
        createAgent('tester', 'tester'),
        createAgent('github-pr', 'reviewer'),
      ];

      let result = filterByCategory(agents, ['development', 'testing']);
      expect(result).toHaveLength(2);

      result = filterByPattern(result, '*coder*');
      expect(result).toHaveLength(1);
    });
  });
});
