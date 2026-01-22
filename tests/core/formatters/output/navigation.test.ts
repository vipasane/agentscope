/**
 * Tests for Navigation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateNavLinks,
  generateCategoryTable,
  generateTableOfContents,
  buildNavigationFromAgents,
  generateBreadcrumbs,
} from '../../../../src/core/formatters/output/navigation.js';
import type { CategorizedAgents, NavigationItem } from '../../../../src/core/formatters/types.js';
import type { Agent } from '../../../../src/core/model/types.js';

describe('Navigation Utilities', () => {
  describe('generateNavLinks', () => {
    it('should generate both prev and next links', () => {
      const links = generateNavLinks('./overview.md', './hierarchy.md');

      expect(links).toBe('[<- Overview](./overview.md) | [Hierarchy ->](./hierarchy.md)');
    });

    it('should generate prev link only', () => {
      const links = generateNavLinks('./overview.md');

      expect(links).toBe('[<- Overview](./overview.md)');
    });

    it('should generate next link only', () => {
      const links = generateNavLinks(undefined, './hierarchy.md');

      expect(links).toBe('[Hierarchy ->](./hierarchy.md)');
    });

    it('should return empty string with no links', () => {
      const links = generateNavLinks();

      expect(links).toBe('');
    });

    it('should handle file names with dashes', () => {
      const links = generateNavLinks('./component-map.md');

      expect(links).toContain('Component Map');
    });

    it('should handle file names with underscores', () => {
      const links = generateNavLinks('./my_page.md');

      expect(links).toContain('My Page');
    });
  });

  describe('generateCategoryTable', () => {
    it('should generate complete category table', () => {
      const categories: CategorizedAgents[] = [
        {
          category: 'Coordinators',
          count: 5,
          sectionLink: '#coordinators',
          detailsLink: './coordinators.md',
        },
        {
          category: 'Workers',
          count: 10,
          sectionLink: '#workers',
        },
      ];

      const table = generateCategoryTable(categories);

      expect(table).toContain('| Category | Agents | Section | Details |');
      expect(table).toContain('| Coordinators | 5 | [Jump](#coordinators) | [View](./coordinators.md) |');
      expect(table).toContain('| Workers | 10 | [Jump](#workers) | - |');
    });

    it('should handle empty categories', () => {
      const table = generateCategoryTable([]);

      expect(table).toContain('| Category | Agents | Section | Details |');
      expect(table.split('\n').length).toBe(2); // Header + separator only
    });
  });

  describe('generateTableOfContents', () => {
    it('should generate flat table of contents', () => {
      const items: NavigationItem[] = [
        { label: 'Overview', anchor: 'overview', level: 0 },
        { label: 'Details', anchor: 'details', level: 0 },
      ];

      const toc = generateTableOfContents(items);

      expect(toc).toContain('- [Overview](#overview)');
      expect(toc).toContain('- [Details](#details)');
    });

    it('should generate hierarchical table of contents', () => {
      const items: NavigationItem[] = [
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

      const toc = generateTableOfContents(items);

      expect(toc).toContain('- [Agents](#agents)');
      expect(toc).toContain('  - [Coordinator](#coordinator)');
      expect(toc).toContain('  - [Worker](#worker)');
    });

    it('should handle deep nesting', () => {
      const items: NavigationItem[] = [
        {
          label: 'Level 1',
          anchor: 'level-1',
          level: 0,
          children: [
            {
              label: 'Level 2',
              anchor: 'level-2',
              level: 1,
              children: [
                { label: 'Level 3', anchor: 'level-3', level: 2 },
              ],
            },
          ],
        },
      ];

      const toc = generateTableOfContents(items);

      expect(toc).toContain('- [Level 1](#level-1)');
      expect(toc).toContain('  - [Level 2](#level-2)');
      expect(toc).toContain('    - [Level 3](#level-3)');
    });

    it('should handle empty items', () => {
      const toc = generateTableOfContents([]);

      expect(toc).toBe('');
    });
  });

  describe('buildNavigationFromAgents', () => {
    it('should build navigation from agents grouped by type', () => {
      const agents: Agent[] = [
        {
          name: 'MainCoordinator',
          path: './agents/coord.ts',
          type: 'coordinator',
        },
        {
          name: 'Worker1',
          path: './agents/worker1.ts',
          type: 'worker',
        },
        {
          name: 'Worker2',
          path: './agents/worker2.ts',
          type: 'worker',
        },
      ];

      const nav = buildNavigationFromAgents(agents);

      expect(nav).toHaveLength(2); // Coordinators and Workers

      const coordinators = nav.find(item => item.label === 'Coordinators');
      expect(coordinators).toBeDefined();
      expect(coordinators?.children).toHaveLength(1);
      expect(coordinators?.children?.[0].label).toBe('MainCoordinator');

      const workers = nav.find(item => item.label === 'Workers');
      expect(workers).toBeDefined();
      expect(workers?.children).toHaveLength(2);
    });

    it('should handle agents without types', () => {
      const agents: Agent[] = [
        { name: 'Agent1', path: './agent1.ts' },
        { name: 'Agent2', path: './agent2.ts' },
      ];

      const nav = buildNavigationFromAgents(agents);

      expect(nav).toHaveLength(1);
      expect(nav[0].label).toBe('Workers'); // Default type
      expect(nav[0].children).toHaveLength(2);
    });

    it('should generate valid anchors', () => {
      const agents: Agent[] = [
        { name: 'My Special Agent!', path: './agent.ts', type: 'specialist' },
      ];

      const nav = buildNavigationFromAgents(agents);

      expect(nav[0].anchor).toBe('type-specialist');
      expect(nav[0].children?.[0].anchor).toBe('agent-my-special-agent');
    });
  });

  describe('generateBreadcrumbs', () => {
    it('should generate breadcrumb trail', () => {
      const path = ['Docs', 'Architecture', 'Component Map'];
      const crumbs = generateBreadcrumbs(path);

      expect(crumbs).toBe('[Docs](./docs.md) > [Architecture](./architecture.md) > Component Map');
    });

    it('should handle single segment', () => {
      const path = ['Home'];
      const crumbs = generateBreadcrumbs(path);

      expect(crumbs).toBe('Home');
    });

    it('should handle two segments', () => {
      const path = ['Docs', 'Overview'];
      const crumbs = generateBreadcrumbs(path);

      expect(crumbs).toBe('[Docs](./docs.md) > Overview');
    });

    it('should slugify segments for links', () => {
      const path = ['API Reference', 'Agent Types'];
      const crumbs = generateBreadcrumbs(path);

      expect(crumbs).toContain('./api-reference.md');
    });
  });
});
