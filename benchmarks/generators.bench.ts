/**
 * Performance Benchmarks for Generators
 * Measures generation time and memory usage
 */

import { bench, describe } from 'vitest';
import { generateComponentMap } from '../src/core/generators/diagrams/component-map.js';
import { generateHierarchy } from '../src/core/generators/diagrams/hierarchy.js';
import { generateDataflow } from '../src/core/generators/diagrams/dataflow.js';
import { generateMarkdown } from '../src/core/generators/docs/markdown.js';
import { categorizeAgents } from '../src/core/generators/diagrams/categories.js';
import type { AgentScopeConfig, Agent } from '../src/core/model/types.js';

function createConfig(agentCount: number): AgentScopeConfig {
  const agents: Agent[] = Array.from({ length: agentCount }, (_, i) => ({
    name: `agent-${i}`,
    path: `/test/agent-${i}.md`,
    type: i % 5 === 0 ? 'coordinator' : 'worker',
  }));

  return {
    agents,
    skills: [],
    hooks: [],
    commands: [],
    mcpServers: [],
    metadata: {
      scannedAt: new Date(),
      rootPath: '/test',
      version: '1.2.0',
      duration: 100,
      filesScanned: 100,
      errors: [],
    },
  };
}

describe('Generator Performance', () => {
  describe('Component Map Generator', () => {
    bench('10 agents', () => {
      const config = createConfig(10);
      generateComponentMap(config);
    });

    bench('50 agents', () => {
      const config = createConfig(50);
      generateComponentMap(config);
    });

    bench('100 agents', () => {
      const config = createConfig(100);
      generateComponentMap(config);
    });
  });

  describe('Hierarchy Generator', () => {
    bench('10 agents', () => {
      const config = createConfig(10);
      generateHierarchy(config);
    });

    bench('50 agents', () => {
      const config = createConfig(50);
      generateHierarchy(config);
    });

    bench('100 agents', () => {
      const config = createConfig(100);
      generateHierarchy(config);
    });
  });

  describe('Category Detection', () => {
    bench('10 agents categorization', () => {
      const agents = Array.from({ length: 10 }, (_, idx) => ({
        name: `agent-${idx}`,
        path: `/test/agent-${idx}.md`,
      }));
      categorizeAgents(agents);
    });

    bench('100 agents categorization', () => {
      const agents = Array.from({ length: 100 }, (_, idx) => ({
        name: `agent-${idx}`,
        path: `/test/agent-${idx}.md`,
      }));
      categorizeAgents(agents);
    });

    bench('1000 agents categorization', () => {
      const agents = Array.from({ length: 1000 }, (_, idx) => ({
        name: `agent-${idx}`,
        path: `/test/agent-${idx}.md`,
      }));
      categorizeAgents(agents);
    });
  });
});
