/**
 * Component Map Diagram Generator
 * Generates a Mermaid diagram showing all components and their relationships
 */

import type { AgentScopeConfig, Agent, McpServer, Skill } from '../../model/types.js';

export interface ComponentMapOptions {
  /** Include disabled servers */
  includeDisabled?: boolean;
  /** Show tool connections */
  showTools?: boolean;
  /** Custom title */
  title?: string;
}

/**
 * Generate a component map diagram showing all system components
 */
export function generateComponentMap(
  config: AgentScopeConfig,
  options: ComponentMapOptions = {}
): string {
  const {
    includeDisabled = false,
    showTools = true,
    title = 'Agent Architecture Component Map',
  } = options;

  const lines: string[] = [
    '```mermaid',
    'graph TB',
    `    %% ${title}`,
    '',
  ];

  // Add subgraph for agents
  if (config.agents.length > 0) {
    lines.push('    subgraph Agents["Agents"]');
    for (const agent of config.agents) {
      const label = formatAgentLabel(agent);
      lines.push(`        ${sanitizeId(agent.name)}["${label}"]`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Add subgraph for MCP servers
  const servers = includeDisabled
    ? config.mcpServers
    : config.mcpServers.filter(s => !s.disabled);

  if (servers.length > 0) {
    lines.push('    subgraph MCP["MCP Servers"]');
    for (const server of servers) {
      const label = formatServerLabel(server);
      const style = server.disabled ? ':::disabled' : '';
      lines.push(`        mcp_${sanitizeId(server.name)}["${label}"]${style}`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Add subgraph for skills
  if (config.skills.length > 0) {
    lines.push('    subgraph Skills["Skills"]');
    for (const skill of config.skills) {
      const label = formatSkillLabel(skill);
      lines.push(`        skill_${sanitizeId(skill.name)}["${label}"]`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Add connections
  lines.push('    %% Agent Relationships');
  for (const agent of config.agents) {
    // Agent to agent delegation
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        lines.push(`    ${sanitizeId(agent.name)} --> ${sanitizeId(target)}`);
      }
    }

    // Agent to tools (MCP servers)
    if (showTools && agent.tools) {
      for (const tool of agent.tools) {
        const server = findServerByTool(servers, tool);
        if (server) {
          lines.push(`    ${sanitizeId(agent.name)} -.-> mcp_${sanitizeId(server.name)}`);
        }
      }
    }
  }

  // Skill dependencies
  for (const skill of config.skills) {
    if (skill.dependencies) {
      for (const dep of skill.dependencies) {
        lines.push(`    skill_${sanitizeId(skill.name)} --> skill_${sanitizeId(dep)}`);
      }
    }
  }

  // Add styling
  lines.push('');
  lines.push('    %% Styling');
  lines.push('    classDef coordinator fill:#e1f5fe,stroke:#01579b');
  lines.push('    classDef worker fill:#f3e5f5,stroke:#4a148c');
  lines.push('    classDef reviewer fill:#fff3e0,stroke:#e65100');
  lines.push('    classDef specialist fill:#e8f5e9,stroke:#1b5e20');
  lines.push('    classDef disabled fill:#eeeeee,stroke:#9e9e9e,stroke-dasharray: 5 5');
  lines.push('    classDef mcp fill:#fce4ec,stroke:#880e4f');
  lines.push('    classDef skill fill:#e3f2fd,stroke:#0d47a1');

  // Apply agent type styling
  for (const agent of config.agents) {
    if (agent.type) {
      lines.push(`    class ${sanitizeId(agent.name)} ${agent.type}`);
    }
  }

  // Apply MCP server styling
  for (const server of servers) {
    lines.push(`    class mcp_${sanitizeId(server.name)} mcp`);
  }

  // Apply skill styling
  for (const skill of config.skills) {
    lines.push(`    class skill_${sanitizeId(skill.name)} skill`);
  }

  lines.push('```');

  return lines.join('\n');
}

/**
 * Format agent label for display
 */
function formatAgentLabel(agent: Agent): string {
  const icon = getAgentIcon(agent.type);
  const name = agent.name;
  const desc = agent.description ? `<br/><small>${truncate(agent.description, 30)}</small>` : '';
  return `${icon} ${name}${desc}`;
}

/**
 * Format server label for display
 */
function formatServerLabel(server: McpServer): string {
  const icon = server.disabled ? '🔴' : '🟢';
  return `${icon} ${server.name}`;
}

/**
 * Format skill label for display
 */
function formatSkillLabel(skill: Skill): string {
  const icon = skill.enabled === false ? '⚪' : '⚡';
  return `${icon} ${skill.name}`;
}

/**
 * Get icon for agent type
 */
function getAgentIcon(type: Agent['type']): string {
  switch (type) {
    case 'coordinator':
      return '👑';
    case 'reviewer':
      return '👁️';
    case 'specialist':
      return '🎯';
    case 'worker':
    default:
      return '🤖';
  }
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

/**
 * Find MCP server that provides a specific tool
 */
function findServerByTool(servers: McpServer[], tool: string): McpServer | undefined {
  return servers.find(s => s.tools?.includes(tool) || s.name === tool);
}
