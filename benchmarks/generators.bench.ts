/**
 * Diagram Generator Performance Benchmark Suite
 *
 * Performance Targets (from PRD):
 * - Diagram generation: <1 second per diagram
 *
 * This benchmark measures:
 * - Mermaid diagram generation for various sizes
 * - Component Map generation
 * - Workflow Sequence generation
 * - Documentation (README.md, AGENTS.md) generation
 */

import { describe, bench, beforeAll } from 'vitest';
import {
  PERFORMANCE_TARGETS,
  Timer,
  PerformanceCache,
} from '../src/utils/performance.js';
import {
  generateConfig,
  FIXTURE_PRESETS,
} from '../tests/fixtures/fixture-generator.js';
import type { AgentScopeConfig, Agent, Skill, MCPServer, Hook } from '../src/model/types.js';

// Pre-generate configs for benchmarking
const configs = {
  minimal: generateConfig(FIXTURE_PRESETS.minimal),
  small: generateConfig(FIXTURE_PRESETS.small),
  typical: generateConfig(FIXTURE_PRESETS.typical),
  large: generateConfig(FIXTURE_PRESETS.large),
  stress: generateConfig(FIXTURE_PRESETS.stress),
  extreme: generateConfig(FIXTURE_PRESETS.extreme),
};

/**
 * Generates a Component Map diagram (Mermaid flowchart)
 * Shows all agents, skills, hooks, MCPs and their relationships
 */
function generateComponentMap(config: AgentScopeConfig): string {
  const lines: string[] = ['flowchart TB'];

  // Add subgraphs for each component type
  if (config.agents.length > 0) {
    lines.push('    subgraph Agents');
    for (const agent of config.agents) {
      lines.push(`        ${sanitizeId(agent.id)}["${escapeLabel(agent.name)}"]`);
    }
    lines.push('    end');
  }

  if (config.skills.length > 0) {
    lines.push('    subgraph Skills');
    for (const skill of config.skills) {
      lines.push(`        ${sanitizeId(skill.id)}["${escapeLabel(skill.name)}"]`);
    }
    lines.push('    end');
  }

  if (config.hooks.length > 0) {
    lines.push('    subgraph Hooks');
    for (const hook of config.hooks) {
      lines.push(`        ${sanitizeId(hook.id)}["${escapeLabel(hook.name)}"]`);
    }
    lines.push('    end');
  }

  if (config.mcpServers.length > 0) {
    lines.push('    subgraph MCPs');
    for (const mcp of config.mcpServers) {
      lines.push(`        ${sanitizeId(mcp.id)}["${escapeLabel(mcp.name)}"]`);
    }
    lines.push('    end');
  }

  // Add relationships
  for (const agent of config.agents) {
    for (const skillId of agent.skills) {
      lines.push(`    ${sanitizeId(agent.id)} --> ${sanitizeId(skillId)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generates a Workflow Sequence diagram (Mermaid sequence)
 * Shows request flow from user through agents to tools
 */
function generateWorkflowSequence(config: AgentScopeConfig): string {
  const lines: string[] = ['sequenceDiagram'];

  // Participants
  lines.push('    participant U as User');
  lines.push('    participant CC as Claude Code');

  // Add first few agents as participants
  const participantAgents = config.agents.slice(0, 5);
  for (const agent of participantAgents) {
    lines.push(`    participant ${sanitizeId(agent.id)} as ${escapeLabel(agent.name)}`);
  }

  // Add first few MCP servers as participants
  const participantMCPs = config.mcpServers.slice(0, 3);
  for (const mcp of participantMCPs) {
    lines.push(`    participant ${sanitizeId(mcp.id)} as ${escapeLabel(mcp.name)}`);
  }

  // Generate flow
  lines.push('    U->>CC: Request');

  if (participantAgents.length > 0) {
    const firstAgent = participantAgents[0];
    lines.push(`    CC->>+${sanitizeId(firstAgent.id)}: Delegate task`);

    if (participantMCPs.length > 0) {
      const firstMCP = participantMCPs[0];
      lines.push(`    ${sanitizeId(firstAgent.id)}->>+${sanitizeId(firstMCP.id)}: Use tool`);
      lines.push(`    ${sanitizeId(firstMCP.id)}-->>-${sanitizeId(firstAgent.id)}: Result`);
    }

    lines.push(`    ${sanitizeId(firstAgent.id)}-->>-CC: Complete`);
  }

  lines.push('    CC-->>U: Response');

  return lines.join('\n');
}

/**
 * Generates an Agent Hierarchy diagram
 */
function generateHierarchyDiagram(config: AgentScopeConfig): string {
  const lines: string[] = ['flowchart TD'];

  // Group agents by source
  const projectAgents = config.agents.filter(a => a.source === 'project');
  const userAgents = config.agents.filter(a => a.source === 'user');

  lines.push('    subgraph Project["Project Agents"]');
  for (const agent of projectAgents) {
    lines.push(`        ${sanitizeId(agent.id)}["${escapeLabel(agent.name)}"]`);
  }
  lines.push('    end');

  if (userAgents.length > 0) {
    lines.push('    subgraph User["User Agents"]');
    for (const agent of userAgents) {
      lines.push(`        ${sanitizeId(agent.id)}["${escapeLabel(agent.name)}"]`);
    }
    lines.push('    end');
  }

  return lines.join('\n');
}

/**
 * Generates a Data Flow diagram
 */
function generateDataFlowDiagram(config: AgentScopeConfig): string {
  const lines: string[] = ['flowchart LR'];

  lines.push('    User([User])');
  lines.push('    CC[Claude Code]');

  lines.push('    User --> CC');

  for (const agent of config.agents.slice(0, 10)) {
    lines.push(`    CC --> ${sanitizeId(agent.id)}[${escapeLabel(agent.name)}]`);

    for (const mcp of config.mcpServers.slice(0, 3)) {
      lines.push(`    ${sanitizeId(agent.id)} -.-> ${sanitizeId(mcp.id)}[(${escapeLabel(mcp.name)})]`);
    }
  }

  return lines.join('\n');
}

/**
 * Generates README.md documentation
 */
function generateReadme(config: AgentScopeConfig): string {
  const lines: string[] = [];

  lines.push('# Agent Architecture Overview');
  lines.push('');
  lines.push(`Generated: ${config.meta.scanDate}`);
  lines.push('');

  // Statistics
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Agents**: ${config.agents.length}`);
  lines.push(`- **Skills**: ${config.skills.length}`);
  lines.push(`- **Hooks**: ${config.hooks.length}`);
  lines.push(`- **MCP Servers**: ${config.mcpServers.length}`);
  lines.push('');

  // Component Map
  lines.push('## Component Map');
  lines.push('');
  lines.push('```mermaid');
  lines.push(generateComponentMap(config));
  lines.push('```');
  lines.push('');

  // Workflow Sequence
  lines.push('## Workflow');
  lines.push('');
  lines.push('```mermaid');
  lines.push(generateWorkflowSequence(config));
  lines.push('```');
  lines.push('');

  // Quick Reference
  lines.push('## Quick Reference');
  lines.push('');
  lines.push('| Component | Type | Description |');
  lines.push('|-----------|------|-------------|');

  for (const agent of config.agents.slice(0, 20)) {
    lines.push(`| ${agent.name} | Agent | ${agent.description.slice(0, 50)}... |`);
  }

  lines.push('');
  lines.push('See [AGENTS.md](AGENTS.md) for detailed documentation.');

  return lines.join('\n');
}

/**
 * Generates AGENTS.md documentation
 */
function generateAgentsDocs(config: AgentScopeConfig): string {
  const lines: string[] = [];

  lines.push('# Agent Documentation');
  lines.push('');
  lines.push(`Generated: ${config.meta.scanDate}`);
  lines.push('');

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  for (const agent of config.agents) {
    lines.push(`- [${agent.name}](#${sanitizeAnchor(agent.name)})`);
  }
  lines.push('');

  // Agent Details
  for (const agent of config.agents) {
    lines.push(`## ${agent.name}`);
    lines.push('');
    lines.push(`**ID**: \`${agent.id}\``);
    lines.push('');
    lines.push(`**Source**: ${agent.source} (\`${agent.sourcePath}\`)`);
    lines.push('');
    lines.push(`**Description**: ${agent.description}`);
    lines.push('');

    if (agent.skills.length > 0) {
      lines.push('### Skills');
      lines.push('');
      for (const skillId of agent.skills) {
        const skill = config.skills.find(s => s.id === skillId);
        if (skill) {
          lines.push(`- **${skill.name}**: ${skill.description.slice(0, 100)}...`);
        } else {
          lines.push(`- \`${skillId}\` (not found)`);
        }
      }
      lines.push('');
    }

    if (agent.allowedTools.length > 0) {
      lines.push('### Allowed Tools');
      lines.push('');
      lines.push('```');
      lines.push(agent.allowedTools.join(', '));
      lines.push('```');
      lines.push('');
    }

    lines.push('### Configuration');
    lines.push('');
    lines.push('```yaml');
    lines.push(agent.configSnippet);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates raw JSON output
 */
function generateRawJson(config: AgentScopeConfig): string {
  return JSON.stringify(config, null, 2);
}

// Helper functions
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/\n/g, ' ');
}

function sanitizeAnchor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

describe('Diagram Generation Benchmarks', () => {
  describe('Component Map Generation', () => {
    bench('component map - minimal (2 components)', () => {
      generateComponentMap(configs.minimal);
    });

    bench('component map - small (12 components)', () => {
      generateComponentMap(configs.small);
    });

    bench('component map - typical (27 components)', () => {
      generateComponentMap(configs.typical);
    });

    bench('component map - large (110 components)', () => {
      generateComponentMap(configs.large);
    });

    bench('component map - stress (220 components)', () => {
      generateComponentMap(configs.stress);
    });

    bench('component map - extreme (430 components)', () => {
      generateComponentMap(configs.extreme);
    });
  });

  describe('Workflow Sequence Generation', () => {
    bench('workflow sequence - minimal', () => {
      generateWorkflowSequence(configs.minimal);
    });

    bench('workflow sequence - small', () => {
      generateWorkflowSequence(configs.small);
    });

    bench('workflow sequence - typical', () => {
      generateWorkflowSequence(configs.typical);
    });

    bench('workflow sequence - large', () => {
      generateWorkflowSequence(configs.large);
    });

    bench('workflow sequence - stress', () => {
      generateWorkflowSequence(configs.stress);
    });
  });

  describe('Hierarchy Diagram Generation', () => {
    bench('hierarchy - minimal', () => {
      generateHierarchyDiagram(configs.minimal);
    });

    bench('hierarchy - typical', () => {
      generateHierarchyDiagram(configs.typical);
    });

    bench('hierarchy - large', () => {
      generateHierarchyDiagram(configs.large);
    });

    bench('hierarchy - stress', () => {
      generateHierarchyDiagram(configs.stress);
    });
  });

  describe('Data Flow Diagram Generation', () => {
    bench('data flow - minimal', () => {
      generateDataFlowDiagram(configs.minimal);
    });

    bench('data flow - typical', () => {
      generateDataFlowDiagram(configs.typical);
    });

    bench('data flow - large', () => {
      generateDataFlowDiagram(configs.large);
    });

    bench('data flow - stress', () => {
      generateDataFlowDiagram(configs.stress);
    });
  });

  describe('Documentation Generation', () => {
    bench('README.md - minimal', () => {
      generateReadme(configs.minimal);
    });

    bench('README.md - typical', () => {
      generateReadme(configs.typical);
    });

    bench('README.md - large', () => {
      generateReadme(configs.large);
    });

    bench('README.md - stress', () => {
      generateReadme(configs.stress);
    });

    bench('AGENTS.md - minimal', () => {
      generateAgentsDocs(configs.minimal);
    });

    bench('AGENTS.md - typical', () => {
      generateAgentsDocs(configs.typical);
    });

    bench('AGENTS.md - large', () => {
      generateAgentsDocs(configs.large);
    });

    bench('AGENTS.md - stress', () => {
      generateAgentsDocs(configs.stress);
    });

    bench('raw JSON - typical', () => {
      generateRawJson(configs.typical);
    });

    bench('raw JSON - large', () => {
      generateRawJson(configs.large);
    });
  });

  describe('Full Documentation Suite', () => {
    bench('all docs - minimal', () => {
      generateComponentMap(configs.minimal);
      generateWorkflowSequence(configs.minimal);
      generateReadme(configs.minimal);
      generateAgentsDocs(configs.minimal);
      generateRawJson(configs.minimal);
    });

    bench('all docs - typical', () => {
      generateComponentMap(configs.typical);
      generateWorkflowSequence(configs.typical);
      generateHierarchyDiagram(configs.typical);
      generateDataFlowDiagram(configs.typical);
      generateReadme(configs.typical);
      generateAgentsDocs(configs.typical);
      generateRawJson(configs.typical);
    });

    bench('all docs - large', () => {
      generateComponentMap(configs.large);
      generateWorkflowSequence(configs.large);
      generateHierarchyDiagram(configs.large);
      generateDataFlowDiagram(configs.large);
      generateReadme(configs.large);
      generateAgentsDocs(configs.large);
      generateRawJson(configs.large);
    });

    bench('all docs - stress', () => {
      generateComponentMap(configs.stress);
      generateWorkflowSequence(configs.stress);
      generateHierarchyDiagram(configs.stress);
      generateDataFlowDiagram(configs.stress);
      generateReadme(configs.stress);
      generateAgentsDocs(configs.stress);
      generateRawJson(configs.stress);
    });
  });

  describe('String Building Performance', () => {
    bench('array join vs concatenation - small', () => {
      const lines: string[] = [];
      for (let i = 0; i < 100; i++) {
        lines.push(`Line ${i}: Some content here`);
      }
      lines.join('\n');
    });

    bench('array join vs concatenation - large', () => {
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`Line ${i}: Some content here with more data`);
      }
      lines.join('\n');
    });

    bench('template literals - small', () => {
      let result = '';
      for (let i = 0; i < 100; i++) {
        result += `Line ${i}: Some content here\n`;
      }
    });
  });

  describe('Caching Impact', () => {
    const cache = new PerformanceCache<string, string>(100);

    bench('uncached generation - typical', () => {
      generateComponentMap(configs.typical);
    });

    bench('cached generation - typical', () => {
      const key = 'component-map-typical';
      let result = cache.get(key);
      if (!result) {
        result = generateComponentMap(configs.typical);
        cache.set(key, result);
      }
    });
  });
});

// Export generators for use in actual implementation
export {
  generateComponentMap,
  generateWorkflowSequence,
  generateHierarchyDiagram,
  generateDataFlowDiagram,
  generateReadme,
  generateAgentsDocs,
  generateRawJson,
};
