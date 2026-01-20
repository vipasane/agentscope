/**
 * Hierarchy Diagram Generator
 * Generates a Mermaid diagram showing agent hierarchy and delegation chains
 */

import type { AgentScopeConfig, Agent } from '../../model/types.js';

export interface HierarchyOptions {
  /** Direction of the diagram (TB, BT, LR, RL) */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Custom title */
  title?: string;
  /** Show agent descriptions */
  showDescriptions?: boolean;
}

/**
 * Generate a hierarchy diagram showing agent relationships
 */
export function generateHierarchy(
  config: AgentScopeConfig,
  options: HierarchyOptions = {}
): string {
  const {
    direction = 'TB',
    title = 'Agent Hierarchy',
    showDescriptions = false,
  } = options;

  const lines: string[] = [
    '```mermaid',
    `graph ${direction}`,
    `    %% ${title}`,
    '',
  ];

  // Build adjacency map for hierarchy analysis
  const delegationMap = buildDelegationMap(config.agents);
  const rootAgents = findRootAgents(config.agents, delegationMap);

  // Add nodes with proper hierarchy levels
  const visited = new Set<string>();

  // First, add root agents (coordinators with no parents)
  for (const agent of rootAgents) {
    addAgentNode(lines, agent, showDescriptions, visited);
  }

  // Add remaining agents
  for (const agent of config.agents) {
    addAgentNode(lines, agent, showDescriptions, visited);
  }

  lines.push('');

  // Add delegation relationships
  lines.push('    %% Delegation Relationships');
  for (const agent of config.agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        const targetAgent = config.agents.find(a => a.name === target);
        if (targetAgent) {
          lines.push(`    ${sanitizeId(agent.name)} -->|delegates| ${sanitizeId(target)}`);
        }
      }
    }
  }

  // Add skill relationships if skills reference agents
  if (config.skills.length > 0) {
    lines.push('');
    lines.push('    %% Skills');
    for (const skill of config.skills) {
      lines.push(`    skill_${sanitizeId(skill.name)}(["${skill.name}"])`);

      // Connect skills to agents if there's a naming convention match
      for (const agent of config.agents) {
        if (skill.name.toLowerCase().includes(agent.name.toLowerCase()) ||
            agent.name.toLowerCase().includes(skill.name.toLowerCase())) {
          lines.push(`    ${sanitizeId(agent.name)} -->|uses| skill_${sanitizeId(skill.name)}`);
        }
      }
    }
  }

  // Add styling
  lines.push('');
  lines.push('    %% Styling');
  lines.push('    classDef coordinator fill:#e1f5fe,stroke:#01579b,stroke-width:3px');
  lines.push('    classDef worker fill:#f3e5f5,stroke:#4a148c');
  lines.push('    classDef reviewer fill:#fff3e0,stroke:#e65100');
  lines.push('    classDef specialist fill:#e8f5e9,stroke:#1b5e20');
  lines.push('    classDef skill fill:#e3f2fd,stroke:#0d47a1,stroke-dasharray: 5 5');

  // Apply styling based on agent type
  for (const agent of config.agents) {
    const className = agent.type ?? 'worker';
    lines.push(`    class ${sanitizeId(agent.name)} ${className}`);
  }

  // Style skills
  for (const skill of config.skills) {
    lines.push(`    class skill_${sanitizeId(skill.name)} skill`);
  }

  lines.push('```');

  return lines.join('\n');
}

/**
 * Add an agent node to the diagram
 */
function addAgentNode(
  lines: string[],
  agent: Agent,
  showDescriptions: boolean,
  visited: Set<string>
): void {
  if (visited.has(agent.name)) return;
  visited.add(agent.name);

  const id = sanitizeId(agent.name);
  const shape = getAgentShape(agent.type);
  const label = showDescriptions && agent.description
    ? `${agent.name}<br/><small>${truncate(agent.description, 40)}</small>`
    : agent.name;

  lines.push(`    ${id}${shape.open}"${label}"${shape.close}`);
}

/**
 * Get shape delimiters for agent type
 */
function getAgentShape(type: Agent['type']): { open: string; close: string } {
  switch (type) {
    case 'coordinator':
      return { open: '[[', close: ']]' }; // Stadium shape
    case 'reviewer':
      return { open: '{{', close: '}}' }; // Hexagon
    case 'specialist':
      return { open: '([', close: '])' }; // Cylinder
    case 'worker':
    default:
      return { open: '[', close: ']' }; // Rectangle
  }
}

/**
 * Build a map of which agents delegate to which
 */
function buildDelegationMap(agents: Agent[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const agent of agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        const existing = map.get(target) ?? [];
        existing.push(agent.name);
        map.set(target, existing);
      }
    }
  }

  return map;
}

/**
 * Find root agents (those with no parent delegators)
 */
function findRootAgents(agents: Agent[], delegationMap: Map<string, string[]>): Agent[] {
  return agents.filter(agent => {
    const parents = delegationMap.get(agent.name);
    return !parents || parents.length === 0;
  });
}

/**
 * Sanitize string for use as Mermaid ID
 */
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
